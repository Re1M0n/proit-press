import fs from "fs/promises";
import { execFileSync } from "child_process";
import { Configuration, CreateImageRequestSizeEnum, OpenAIApi } from "openai";
import path from "path";
import qrCode from "qrcode-terminal";
import { Client, LocalAuth } from "whatsapp-web.js";
import AppError from "../errors/AppError";
import Integration from "../models/Integration";
import Whatsapp from "../models/Whatsapp";
import GroupEventsService from "../services/WbotServices/GroupEventsService";
import { handleCall, handleMessageReaction, handleVoteUpdate } from "../services/WbotServices/SessionEventsService";
import { initializeHealthTracking, updateLastActivity } from "../services/WbotServices/HealthCheckService";
import { handleMessage } from "../services/WbotServices/wbotMessageListener";
import { logger } from "../utils/logger";
import { getIO } from "./socket";

interface Session extends Client {
  id?: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface CreateImageRequest {
  prompt: string;
  n?: number;
  size?: CreateImageRequestSizeEnum;
}

async function findIntegrationValue(key: string): Promise<string | null> {
  const integration = await Integration.findOne({
    where: { key }
  });

  if (integration) {
    return integration.value;
  }

  return null as string | null;
}

let openai: OpenAIApi;

(async () => {
  const organizationDB: string | null = await findIntegrationValue(
    "organization"
  );
  const apiKeyDB: string | null = await findIntegrationValue("apikey");

  const configuration = new Configuration({
    organization: organizationDB ?? "",
    apiKey: apiKeyDB ?? ""
  });

  openai = new OpenAIApi(configuration);
})();

const getDavinciResponse = async (clientText: string): Promise<string> => {
  const options = {
    model: "text-davinci-003",
    prompt: clientText,
    temperature: 1,
    max_tokens: 4000
  };

  try {
    const response = await openai.createCompletion(options);
    let botResponse = "";
    response.data.choices.forEach(({ text }) => {
      botResponse += text;
    });
    return `Chat GPT 🤖\n\n ${botResponse.trim()}`;
  } catch (e) {
    return `❌ OpenAI Response Error: ${e.response.data.error.message}`;
  }
};

const getDalleResponse = async (
  clientText: string
): Promise<string | undefined> => {
  const options: CreateImageRequest = {
    prompt: clientText,
    n: 1,
    // eslint-disable-next-line no-underscore-dangle
    size: CreateImageRequestSizeEnum._1024x1024
  };

  try {
    const response = await openai.createImage(options);
    return response.data.data[0].url;
  } catch (e) {
    return `❌ OpenAI Response Error: ${e.response.data.error.message}`;
  }
};

const sessions: Session[] = [];

const syncUnreadMessages = async (wbot: Session) => {
  const maxRetries = 3;
  
  if (!wbot || !wbot.pupPage) {
    console.warn('syncUnreadMessages: sesión no está lista');
    return;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      
      const state = await wbot.getState();
      if (state !== 'CONNECTED') {
        console.warn(`syncUnreadMessages: WhatsApp no está conectado. Estado: ${state}`);
        return;
      }

      const chats = await wbot.getChats();

        if (chats.length > 0) {
          console.log(JSON.stringify({
            keys: Object.keys(chats[0]),
            data: "debug"
          }, null, 2));
        }

      
      if (!chats || !Array.isArray(chats)) {
        console.warn('syncUnreadMessages: chats inválidos');
        continue;
      }

      /* eslint-disable no-restricted-syntax */
      /* eslint-disable no-await-in-loop */
      for (const chat of chats) {
        try {
          if (chat.unreadCount > 0) {
            const unreadMessages = await chat.fetchMessages({
              limit: Math.min(chat.unreadCount, 50)
            });

            for (const msg of unreadMessages) {
              try {
                await handleMessage(msg, wbot);
              } catch (msgError) {
                console.error(`Error al procesar mensaje no leído: ${msgError}`);
              }
            }

            await chat.sendSeen();
          }
        } catch (chatError) {
          console.error(`Error al procesar chat ${chat.id._serialized}:`, chatError);
        }
      }
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        console.warn(`syncUnreadMessages: fallo tras ${maxRetries} intentos:`, error.message || error);
      } else {
        console.log(`syncUnreadMessages: intento ${attempt} falló, intentando de nuevo...`);
      }
    }
  }
};

export const listActiveWbotIds = (): number[] => {
  try {
    return sessions.map(s => s.id as number).filter(id => typeof id === 'number');
  } catch {
    return [];
  }
};

export const initWbot = async (whatsapp: Whatsapp): Promise<Session> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.level = "trace";
      const io = getIO();
      const sessionName = whatsapp.name;

      const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '_');
      let clientSession = `${sanitize(process.env.COMPANY_NAME || '')}_${whatsapp.id}`;
      if (!process.env.COMPANY_NAME) {
        clientSession = `${sanitize(whatsapp.name)}_${whatsapp.id}`;
      }

      // Si una instancia anterior fue matada sin cerrar (SIGKILL, crash, corte de
      // luz), sus browsers quedan huérfanos pero siguen conectados a WhatsApp Web
      // con la misma sesión. Abrir otra conexión con el mismo LocalAuth provoca
      // conflicto y WhatsApp termina matando ambas. Limpiamos los browsers
      // huérfanos de esta sesión antes de lanzar el nuestro.
      try {
        const escaped = clientSession.replace(/([.*+?^${}()|[\]\\])/g, "\\$1");
        execFileSync("pkill", ["-f", `--user-data-dir=.*session-${escaped}`], {
          stdio: "ignore"
        });
        logger.info(
          `Session: ${sessionName} browsers huérfanos de la sesión anterior eliminados`
        );
      } catch (err) {
        // pkill devuelve 1 cuando no hay procesos que matar: normal.
      }

      const wbot: Session = new Client({
        authStrategy: new LocalAuth({ clientId: clientSession }),
        browserName: 'Chrome',
        deviceName: process.env.DEVICE_NAME || 'ProIT CRM®',
        puppeteer: {
          executablePath: process.env.CHROME_BIN || undefined,
          browserWSEndpoint: process.env.CHROME_WS || undefined,
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--disable-extensions",
            "--disable-default-apps",
            "--disable-background-networking",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-breakpad",
            "--disable-client-side-phishing-detection",
            "--disable-component-update",
            "--disable-domain-reliability",
            "--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process",
            "--disable-hang-monitor",
            "--disable-ipc-flooding-protection",
            "--disable-notifications",
            "--disable-offer-store-unmasked-wallet-cards",
            "--disable-popup-blocking",
            "--disable-print-preview",
            "--disable-prompt-on-repost",
            "--disable-renderer-backgrounding",
            "--disable-setuid-sandbox",
            "--disable-speech-api",
            "--disable-sync",
            "--disable-web-security",
            "--enable-features=NetworkService,NetworkServiceInProcess",
            "--hide-scrollbars",
            "--ignore-gpu-blacklist",
            "--metrics-recording-only",
            "--mute-audio",
            "--no-default-browser-check",
            "--no-first-run",
            "--no-pings",
            "--no-zygote",
            "--password-store=basic",
            "--use-gl=swiftshader",
            "--use-mock-keychain",
            "--log-level=3"
          ]
        },
        // webVersionCache: {
        //   type: 'remote',
        //   remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/refs/heads/main/html/2.3000.1031490220-alpha.html`,    
        // },
      });

      wbot.initialize();

      wbot.on("qr", async qr => {
        logger.info("Session:", sessionName);
        qrCode.generate(qr, { small: true });
        await whatsapp.update({ 
          qrcode: qr, 
          status: "qrcode", 
          retries: 0, 
          type: "wwebjs" 
        });

        const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
        if (sessionIndex === -1) {
          wbot.id = whatsapp.id;
          sessions.push(wbot);
        }

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp,
          number: ""
        });
      });

      wbot.on("loading_screen", (percent, message) => {
        logger.info(`Session: ${sessionName} LOADING - ${percent}% - ${message}`);
        
        io.emit("whatsappSession", {
          action: "update",
          session: {
            id: whatsapp.id,
            name: whatsapp.name,
            status: "OPENING",
            loadingProgress: percent,
            loadingMessage: message
          }
        });
      });

      wbot.on("remote_session_saved", () => {
        logger.info(`Session: ${sessionName} REMOTE_SESSION_SAVED`);
      });

      wbot.on("authenticated", async () => {
        logger.info(`Session: ${sessionName} AUTHENTICATED`);
        
        await whatsapp.update({
          status: "AUTHENTICATED",
          type: "wwebjs"
        });
        
        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });
      });

      wbot.on("auth_failure", async msg => {
        console.error(
          `Session: ${sessionName} AUTHENTICATION FAILURE! Reason: ${msg}`
        );

        if (whatsapp.retries > 1) {
          await whatsapp.update({ session: "", retries: 0 });
        }

        const retry = whatsapp.retries;
        await whatsapp.update({
          status: "DISCONNECTED",
          retries: retry + 1,
          number: ""
        });

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });

        reject(new Error("Error al iniciar la sesión de WhatsApp."));
      });

      wbot.on("ready", async () => {
        logger.info(`Session: ${sessionName} READY`);

        initializeHealthTracking(whatsapp.id);
        updateLastActivity(whatsapp.id);

        await whatsapp.update({
          status: "CONNECTED",
          qrcode: "",
          retries: 0,
          number: wbot.info.wid._serialized.split("@")[0],
          type: "wwebjs"
        });

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });

        const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
        if (sessionIndex === -1) {
          wbot.id = whatsapp.id;
          sessions.push(wbot);
        }

        wbot.sendPresenceAvailable();
        void syncUnreadMessages(wbot);

        GroupEventsService.setupGroupListeners(wbot, whatsapp.id);

        resolve(wbot);
      });

      wbot.on("message_reaction", reaction => {
        void handleMessageReaction(wbot, reaction);
      });

      wbot.on("change_state", (state) => {
        logger.info(`Session: ${sessionName} STATE_CHANGED - ${state}`);
        updateLastActivity(whatsapp.id);
      });

      wbot.on("vote_update", vote => {
        void handleVoteUpdate(wbot, vote);
      });

      wbot.on("call", call => {
        void handleCall(wbot, call, whatsapp.id);
      });

    } catch (err: any) {
      logger.error(err);
    }
  });
};

export const getWbot = (whatsappId: number): Session => {
  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);

  if (sessionIndex === -1) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }
  return sessions[sessionIndex];
};

export const removeWbot = (whatsappId: number): void => {
  try {
    const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
    if (sessionIndex !== -1) {
      sessions[sessionIndex].destroy();
      sessions.splice(sessionIndex, 1);
    }
  } catch (err: any) {
    logger.error(err);
  }
};

export const destroyAllWbots = async (): Promise<void> => {
  const toDestroy = [...sessions];
  sessions.length = 0;
  for (const s of toDestroy) {
    try {
      await s.destroy();
    } catch (err: any) {
      logger.warn(`Error al destruir sesión ${s.id}: ${err?.message}`);
    }
  }
};

export const restartWbot = async (whatsappId: number): Promise<Session> => {
  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
  if (sessionIndex !== -1) {
    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp) {
      throw new AppError("WhatsApp no encontrado.");
    }
    sessions[sessionIndex].destroy();
    sessions.splice(sessionIndex, 1);

    const newSession = await initWbot(whatsapp);
    return newSession;
  }
  throw new AppError("WhatsApp session not initialized.");
};

export const shutdownWbot = async (whatsappId: string): Promise<void> => {
  const whatsappIDNumber: number = parseInt(whatsappId, 10);

  if (Number.isNaN(whatsappIDNumber)) {
    throw new AppError("Formato de ID de WhatsApp inválido.");
  }

  const whatsapp = await Whatsapp.findByPk(whatsappIDNumber);
  if (!whatsapp) {
    throw new AppError("WhatsApp not found.");
  }

  const sessionIndex = sessions.findIndex(s => s.id === whatsappIDNumber);
  if (sessionIndex === -1) {
    console.warn(`Sesión con ID ${whatsappIDNumber} no fue encontrada.`);
    throw new AppError("Sesión de WhatsApp no inicializada.");
  }

  const sessionPath = path.resolve(
    __dirname,
    `../../.wwebjs_auth/session-bd_${whatsappIDNumber}`
  );

  try {
    await sessions[sessionIndex].destroy();
    
    await fs.rm(sessionPath, { recursive: true, force: true });

    sessions.splice(sessionIndex, 1);
    console.info(
      `Sesión con ID ${whatsappIDNumber} removida de la lista de sesiones.`
    );
    const retry = whatsapp.retries;
    await whatsapp.update({
      status: "DISCONNECTED",
      qrcode: "",
      session: "",
      retries: retry + 1,
      number: ""
    });

  } catch (error) {
    console.error(
      `Error al apagar o limpiar la sesión con ID ${whatsappIDNumber}:`,
      error
    );
    throw new AppError("Error al destruir la sesión de WhatsApp.");
  }
};

export const getWbotByGroupId = async (groupId: string): Promise<Session | null> => {
  try {
    for (const s of [...sessions]) {
      try {
        const chat = await s.getChatById(groupId);
        if (chat && (chat as any).isGroup) {
          return s;
        }
      } catch (_) {
      }
    }
    return null;
  } catch (err) {
    logger.warn(`getWbotByGroupId: error al buscar sesión para groupId ${groupId}: ${String(err)}`);
    return null;
  }
};
