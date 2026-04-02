import { Server } from "http";
import { verify } from "jsonwebtoken";
import { Server as SocketIO } from "socket.io";
import authConfig from "../config/auth";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import User from "../models/User";
import Ticket from "../models/Ticket";
import { Op } from "sequelize";
import Contact from "../models/Contact";
import WhatsApp from "../models/Whatsapp";
import Queue from "../models/Queue";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  iat: number;
  exp: number;
}

interface UserStatus {
  userId: number;
  online: boolean;
}

interface GetTicketsData {
  userId: string;
  status?: string;
  showAll?: boolean;
}

let io: SocketIO;

export const setIO = (io: SocketIO): void => {
  io = io;
};

export const initIO = (httpServer: Server): void => {
  io = new SocketIO(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Permitir requisições sem origin
        if (!origin) {
          return callback(null, true);
        }
        
        // Permitir origin configurada no .env (frontend)
        if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
          return callback(null, true);
        }

        // Permitir localhost em desenvolvimento
        if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
          return callback(null, true);
        }

        // Bloquear outras origens
        logger.warn(`Socket.IO CORS bloqueó origen: ${origin}`);
        callback(new Error('No permitido por CORS'));
      },
      methods: ["GET", "POST"],
      allowedHeaders: ["Authorization", "Content-Type"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io',
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e8 // 100 MB
  });

  logger.info("Servidor Socket.IO iniciado", {
    corsOrigin: process.env.FRONTEND_URL || "http://localhost:3000",
    transports: ['websocket', 'polling']
  });

  io.on("connection", async socket => {
    logger.info("Intento de conexión socket", { 
      socketId: socket.id,
      transport: socket.conn.transport.name
    });

    const { token } = socket.handshake.query;

    if (!token || typeof token !== "string") {
      logger.warn("Conexión rechazada: Token no proporcionado o inválido", { socketId: socket.id });
      socket.disconnect();
      return;
    }

    try {
      const decoded = verify(token, authConfig.secret) as TokenPayload;
      const { id: userId } = decoded;

      if (!userId) {
        logger.warn("Conexión rechazada: Token sin userId", { socketId: socket.id });
        socket.disconnect();
        return;
      }

      try {
        const user = await User.findByPk(userId);
        if (!user) {
          logger.warn("Conexión rechazada: Usuario no encontrado", { 
            socketId: socket.id,
            userId 
          });
          socket.disconnect();
          return;
        }

        const userRoom = io.sockets.adapter.rooms.get(userId.toString());
        const hasConnectedSockets = userRoom && userRoom.size > 0;

        if (!hasConnectedSockets) {
          await User.update({ online: true }, { where: { id: userId } });
        }

        socket.join(userId.toString());
        logger.info("Conexión socket establecida", { 
          userId,
          socketId: socket.id
        });

      } catch (err) {
        logger.error("Error al procesar usuario del socket", {
          error: err.message,
          socketId: socket.id,
          userId
        });
        socket.disconnect();
      }
    } catch (err) {
      if (err.name === "JsonWebTokenError") {
        logger.warn("Conexión rechazada: Token inválido", {
          error: err.message,
          socketId: socket.id
        });
      } else if (err.name === "TokenExpiredError") {
        logger.warn("Conexión rechazada: Token expirado", {
          error: err.message,
          socketId: socket.id
        });
      } else {
        logger.error("Error en la validación del token", {
          error: err.message,
          socketId: socket.id
        });
      }
      socket.disconnect();
    }

    socket.onAny((eventName: string, ...args: unknown[]) => {
        logger.debug("Evento recibido", {
        event: eventName,
        socketId: socket.id,
        args
      });
    });

    socket.on("userStatus", async ({ userId, online }: UserStatus) => {
        logger.info("Cambio de estado del usuario", {
        userId,
        online,
        socketId: socket.id
      });

      try {
        await User.update({ online }, { where: { id: userId } });
      } catch (err) {
        logger.error("Error al actualizar estado del usuario", {
          error: err.message,
          userId,
          online
        });
      }
    });

    socket.on("disconnect", async () => {
      logger.info("Cliente desconectado", { socketId: socket.id });

      try {
        const { id: userId } = verify(token as string, authConfig.secret) as TokenPayload;
        const userRoom = io.sockets.adapter.rooms.get(userId.toString());
        const hasConnectedSockets = userRoom && userRoom.size > 0;

        if (!hasConnectedSockets) {
          await User.update({ online: false }, { where: { id: userId } });
        }
      } catch (err) {
        logger.error("Error al procesar desconexión", {
          error: err.message,
          socketId: socket.id
        });
      }
    });

    socket.on("logout", async () => {
      logger.info("Cierre de sesión solicitado", { socketId: socket.id });

      try {
        const { id: userId } = verify(token as string, authConfig.secret) as TokenPayload;
        await User.update(
          { online: false },
          { where: { id: userId } }
        );

        socket.leave(userId.toString());
        logger.info("Usuario removido de la sala tras cierre de sesión", {
          userId,
          socketId: socket.id
        });
      } catch (err) {
        logger.error("Error al procesar cierre de sesión", {
          error: err.message,
          socketId: socket.id
        });
      }
    });

    socket.on("joinChatBox", (ticketId: string) => {
      logger.info("Usuario entró al chat", {
        ticketId,
        socketId: socket.id
      });
      socket.join(ticketId);
    });

    socket.on("joinNotification", () => {
      logger.info("Usuario entró al canal de notificaciones", {
        socketId: socket.id
      });
      socket.join("notification");
      
      const notificationRoom = io.sockets.adapter.rooms.get("notification");
      logger.info("Estado del canal de notificaciones", {
        socketId: socket.id,
        totalClientsInNotificationRoom: notificationRoom ? notificationRoom.size : 0
      });
    });

    socket.on("joinTickets", (status: string) => {
      logger.info("Usuario entró al canal de tickets", {
        status,
        socketId: socket.id
      });
      socket.join(status);
    });

    socket.on("subscribeTicketCounter", () => {
      logger.info("Usuario inscrito al canal de contadores de tickets", {
        socketId: socket.id
      });
      socket.join("ticketCounter");
    });

    socket.on("getTickets", async (data: GetTicketsData) => {
      try {
        logger.info("Solicitud de sincronización de tickets", {
          userId: data.userId,
          status: data.status,
          showAll: data.showAll,
          socketId: socket.id
        });

        const { id: userId } = verify(token as string, authConfig.secret) as TokenPayload;
        
        if (userId !== data.userId && data.userId) {
          logger.warn("Intento de acceso a tickets de otro usuario", {
            tokenUserId: userId,
            requestedUserId: data.userId,
            socketId: socket.id
          });
          return;
        }

        const user = await User.findByPk(userId, {
          include: [
            {
              model: Queue,
              as: "queues",
              attributes: ["id", "name"]
            }
          ]
        });
        if (!user) {
          logger.warn("Usuario no encontrado al sincronizar tickets", {
            userId,
            socketId: socket.id
          });
          return;
        }

        const whereCondition: any = {};
        
        if (data.status) {
          whereCondition.status = data.status;
        }

        const isAdmin = user.profile === "admin" || user.profile === "masteradmin";
        const userQueueIds = user.queues?.map((q: any) => q.id) || [];

        if (data.status === "open") {
          if (!isAdmin || (isAdmin && !data.showAll)) {
            if (userQueueIds.length > 0) {
              whereCondition[Op.or] = [
                { userId: userId },
                {
                  [Op.and]: [
                    { queueId: { [Op.in]: userQueueIds } },
                    { userId: null }
                  ]
                }
              ];
            } else {
              whereCondition.userId = userId;
            }
          }
        } else if (data.status === "closed") {
          if (!isAdmin || (isAdmin && !data.showAll)) {
            whereCondition.userId = userId;
          }
        } else if (data.status === "pending") {
          if (!isAdmin) {
            if (userQueueIds.length > 0) {
              whereCondition[Op.or] = [
                { userId: userId },
                { queueId: { [Op.in]: userQueueIds } },
                { queueId: null }
              ];
            } else {
              whereCondition[Op.or] = [
                { userId: userId },
                { queueId: null }
              ];
            }
          } else {
            if (!data.showAll) {
              if (userQueueIds.length > 0) {
                whereCondition[Op.or] = [
                  { userId: userId },
                  { queueId: { [Op.in]: userQueueIds } },
                  { queueId: null }
                ];
              } else {
                whereCondition[Op.or] = [
                  { userId: userId },
                  { queueId: null }
                ];
              }
            }
          }
        }

        const tickets = await Ticket.findAll({
          where: whereCondition,
          include: [
            {
              model: Contact,
              as: "contact",
              attributes: ["id", "name", "number", "profilePicUrl"]
            },
            {
              model: Queue,
              as: "queue",
              attributes: ["id", "name", "color"]
            },
            {
              model: WhatsApp,
              as: "whatsapp",
              attributes: ["name"]
            },
            {
              model: User,
              as: "user",
              attributes: ["id", "name"]
            }
          ],
          order: [["updatedAt", "DESC"]],
          limit: 50 
        });

        logger.info("Tickets sincronizados con éxito", {
          userId,
          count: tickets.length,
          socketId: socket.id
        });

        socket.emit("ticketList", { tickets });

      } catch (err) {
        logger.error("Error al sincronizar tickets", {
          error: err.message,
          socketId: socket.id
        });
      }
    });
  });

  io.on("connect_error", (err: Error) => {
    logger.error("Error de conexión:", err);
  });
};

export const getIO = (): SocketIO => {
  if (!io) {
    throw new AppError("Socket IO no inicializado");
  }
  return io;
};
