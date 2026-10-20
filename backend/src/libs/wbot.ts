import fs from "fs/promises";
import { Configuration, CreateImageRequestSizeEnum, OpenAIApi } from "openai";
import path from "path";
import qrCode from "qrcode-terminal";
import { Client, LocalAuth } from "whatsapp-web.js";
import AppError from "../errors/AppError";
import Integration from "../models/Integration";
import Whatsapp from "../models/Whatsapp";
import { handleCall, handleMessageReaction, handleVoteUpdate } from "../services/WbotServices/SessionEventsService";
import { initializeHealthTracking, updateLastActivity } from "../services/WbotServices/HealthCheckService";
import { handleMessage } from "../services/WbotServices/wbotMessageListener";
import { logger } from "../utils/logger";
import { getIO } from "./socket";
import { notifyChannelDisconnected } from "../services/PushNotificationService";
import {
  cleanupOrphanChromium,
  createLinuxChromiumProcessInspector
} from "./ChromeOrphanRecovery";

export interface Session extends Client {
  id?: number;
}

export const getWbotClientSessionId = (whatsapp: Whatsapp): string => {
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (process.env.COMPANY_NAME) {
    return `${sanitize(process.env.COMPANY_NAME)}_${whatsapp.id}`;
  }
  return `${sanitize(whatsapp.name)}_${whatsapp.id}`;
};

export const getWbotSessionDirectory = (whatsapp: Whatsapp): string =>
  path.resolve(
    process.cwd(),
    ".wwebjs_auth",
    `session-${getWbotClientSessionId(whatsapp)}`
  );

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

// Clientes que todavía no alcanzaron READY (o quedaron colgados antes de
// lograrlo). Se registran apenas se crean para poder destruirlos al reintentar
// el arranque; si no, un intento fallido deja su browser huérfano.
const pendingSessions = new Map<number, Session>();
const destroyingSessions = new Map<number, Promise<void>>();
const initializationRejectors = new Map<number, (error: Error) => void>();

// IDs de sesiones que alcanzaron READY y están operativas en memoria.
const readySessions = new Set<number>();

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

// whatsapp-web.js se parchea localmente (ver backend/scripts/patch-wwebjs.js).
// Sin el parche de media, TODO envío de imagen/video/audio responde 400, así que
// conviene gritarlo al arrancar la sesión y no descubrirlo con el cliente.
const PARCHES_WWEBJS = [
  {
    marca: "delete message.__x_id;",
    motivo:
      "el envío de media (imágenes, videos y audios) falla con ERR_SENDING_WAPP_MSG"
  }
];

const verificarParchesWwebjs = async (): Promise<void> => {
  const ruta = path.resolve(
    __dirname,
    "..",
    "..",
    "node_modules",
    "whatsapp-web.js",
    "src",
    "util",
    "Injected",
    "Utils.js"
  );

  try {
    const contenido = await fs.readFile(ruta, "utf8");

    PARCHES_WWEBJS.forEach(({ marca, motivo }) => {
      if (!contenido.includes(marca)) {
        logger.error(
          `[PARCHES] Falta un parche de whatsapp-web.js: ${motivo}. Aplicar con: node scripts/patch-wwebjs.js`
        );
      }
    });
  } catch (err) {
    logger.warn(
      `[PARCHES] No se pudieron verificar los parches de whatsapp-web.js: ${(err as Error)?.message || err}`
    );
  }
};

export const initWbot = async (whatsapp: Whatsapp): Promise<Session> => {
  return new Promise<Session>(async (resolve, reject) => {
    let settled = false;
    const resolveOnce = (wbot: Session): void => {
      if (settled) return;
      settled = true;
      initializationRejectors.delete(whatsapp.id);
      resolve(wbot);
    };
    const rejectOnce = (error: Error): void => {
      if (settled) return;
      settled = true;
      initializationRejectors.delete(whatsapp.id);
      reject(error);
    };

    initializationRejectors.set(whatsapp.id, rejectOnce);

    try {
      logger.level = "trace";
      const io = getIO();
      const sessionName = whatsapp.name;

      await verificarParchesWwebjs();
      if (settled) return;

      const clientSession = getWbotClientSessionId(whatsapp);

      if (!process.env.CHROME_WS && process.platform === "linux") {
        const recovery = await cleanupOrphanChromium(
          getWbotSessionDirectory(whatsapp),
          process.getuid(),
          createLinuxChromiumProcessInspector()
        );
        if (recovery === "ambiguous") {
          throw new Error(
            `No se pudo verificar con seguridad Chromium para la sesión ${whatsapp.id}`
          );
        }
        if (recovery === "terminated") {
          logger.info(
            `[SESSION_START] Chromium huérfano recuperado para sesión ${whatsapp.id}`
          );
        }
      }
      if (settled) return;

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

      wbot.on("disconnected", reason => {
        if (!settled) {
          rejectOnce(new Error(`Sesión ${whatsapp.id} desconectada durante el inicio: ${reason}`));
        }
      });

      wbot.on("qr", qr => {
        void (async () => {
          logger.info("Session:", sessionName);
          pendingSessions.delete(whatsapp.id);
          const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
          if (sessionIndex === -1) {
            wbot.id = whatsapp.id;
            sessions.push(wbot);
          }
          qrCode.generate(qr, { small: true });
          await whatsapp.update({
            qrcode: qr,
            status: "qrcode",
            retries: 0,
            type: "wwebjs"
          });
          if (settled) {
            return;
          }

          io.emit("whatsappSession", {
            action: "update",
            session: whatsapp,
            number: ""
          });

          resolveOnce(wbot);
        })().catch((error: Error) => rejectOnce(error));
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

      wbot.on("authenticated", () => {
        void (async () => {
          logger.info(`Session: ${sessionName} AUTHENTICATED`);

          await whatsapp.update({
            status: "AUTHENTICATED",
            type: "wwebjs"
          });

          io.emit("whatsappSession", {
            action: "update",
            session: whatsapp
          });
        })().catch((error: Error) => logger.error(error));
      });

      wbot.on("auth_failure", msg => {
        void (async () => {
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
          void notifyChannelDisconnected(whatsapp, "Falló la autenticación de WhatsApp").catch(error => {
            logger.error(`[PUSH] Error notificando desconexión de WhatsApp ${whatsapp.id}: ${error.message}`);
          });

          readySessions.delete(whatsapp.id);

          io.emit("whatsappSession", {
            action: "update",
            session: whatsapp
          });

          rejectOnce(new Error("Error al iniciar la sesión de WhatsApp."));
        })().catch((error: Error) => {
          logger.error(error);
          rejectOnce(error);
        });
      });

      wbot.on("ready", () => {
        void (async () => {
          logger.info(`Session: ${sessionName} READY`);

          pendingSessions.delete(whatsapp.id);
          readySessions.add(whatsapp.id);

          const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
          if (sessionIndex === -1) {
            wbot.id = whatsapp.id;
            sessions.push(wbot);
          }

          initializeHealthTracking(whatsapp.id);
          updateLastActivity(whatsapp.id);

          await whatsapp.update({
            status: "CONNECTED",
            qrcode: "",
            retries: 0,
            number: wbot.info.wid._serialized.split("@")[0],
            type: "wwebjs"
          });
          if (settled) {
            return;
          }

          io.emit("whatsappSession", {
            action: "update",
            session: whatsapp
          });

          wbot.sendPresenceAvailable();
          void syncUnreadMessages(wbot);

          resolveOnce(wbot);
        })().catch((error: Error) => rejectOnce(error));
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

      pendingSessions.set(whatsapp.id, wbot);
      wbot.initialize().catch((error: Error) => rejectOnce(error));

    } catch (err: any) {
      readySessions.delete(whatsapp.id);
      logger.error(err);
      rejectOnce(err);
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

export const removeWbot = (whatsappId: number): Promise<void> => {
  const existingDestroy = destroyingSessions.get(whatsappId);
  if (existingDestroy) {
    return existingDestroy;
  }

  const destroying = Promise.resolve().then(() => removeWbotInternal(whatsappId));
  destroyingSessions.set(whatsappId, destroying);
  destroying.then(
    () => {
      if (destroyingSessions.get(whatsappId) === destroying) {
        destroyingSessions.delete(whatsappId);
      }
    },
    () => {
      if (destroyingSessions.get(whatsappId) === destroying) {
        destroyingSessions.delete(whatsappId);
      }
    }
  );
  return destroying;
};

async function removeWbotInternal(whatsappId: number): Promise<void> {
  const cancelInitialization = initializationRejectors.get(whatsappId);
  if (cancelInitialization) {
    cancelInitialization(new Error(`Inicio de sesión ${whatsappId} cancelado`));
  }

  const clients = new Set<Session>();
  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
  if (sessionIndex !== -1) {
    clients.add(sessions[sessionIndex]);
    sessions.splice(sessionIndex, 1);
  }

  const pending = pendingSessions.get(whatsappId);
  if (pending) {
    clients.add(pending);
    pendingSessions.delete(whatsappId);
  }

  readySessions.delete(whatsappId);

  const destroyErrors: unknown[] = [];
  await Promise.all(
    Array.from(clients).map(async client => {
      try {
        await client.destroy();
      } catch (error) {
        logger.warn(
          `removeWbot: error destruyendo sesión ${whatsappId}: ${(error as Error)?.message}`
        );
        destroyErrors.push(error);
      }
    })
  );

  if (destroyErrors.length > 0) {
    throw destroyErrors[0];
  }
}

export const isSessionReady = (whatsappId: number): boolean =>
  readySessions.has(whatsappId);

export const markSessionNotReady = (whatsappId: number): void => {
  readySessions.delete(whatsappId);
};

export const destroyAllWbots = async (): Promise<void> => {
  const whatsappIds = new Set<number>(pendingSessions.keys());
  for (const session of sessions) {
    if (typeof session.id === "number") {
      whatsappIds.add(session.id);
    }
  }

  await Promise.all(
    Array.from(whatsappIds).map(async whatsappId => {
      try {
        await removeWbot(whatsappId);
      } catch (error) {
        logger.warn(
          `Error al destruir sesión ${whatsappId}: ${(error as Error)?.message}`
        );
      }
    })
  );
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

  const sessionPath = getWbotSessionDirectory(whatsapp);

  try {
    await removeWbot(whatsappIDNumber);
    await fs.rm(sessionPath, { recursive: true, force: true });

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
