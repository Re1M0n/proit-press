import { endOfDay, parseISO, startOfDay } from "date-fns";
import { col, fn, Includeable, Op, where } from "sequelize";
import { resolverFiltroDeClienteEnTickets } from "../../helpers/ClientFilter";
import Client from "../../models/Client";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  showAll?: string;
  isAdmin?: boolean;
  userId?: string;
  withUnreadMessages?: string;
  queueIds: number[];
  channelIds?: number[];
  all?: string;
  isGroup?: string;
  /** "subscriber" | "nonSubscriber" | "external" */
  clientFilter?: string;
}

interface Response {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

const ListTicketsService = async ({
  searchParam = "",
  pageNumber = "1",
  status,
  startDate,
  endDate,
  showAll,
  isAdmin,
  userId,
  withUnreadMessages,
  queueIds = [],
  channelIds = [],
  all,
  isGroup,
  clientFilter
}: Request): Promise<Response> => {
  try {

  let whereCondition: any = {};
  
  const allTickets = await ListSettingsServiceOne({ key: "allTicket" });
  const allTicketsEnabled = allTickets?.value === "enabled";

  let includeCondition: Includeable[] = [
    {
      model: Contact,
      as: "contact",
      attributes: [
        "id",
        "name",
        "number",
        "address",
        "email",
        "profilePicUrl",
        "messengerId",
        "instagramId",
        "telegramId",
        "webchatId",
        "messageHandling",
        "technicalHardware",
        "technicalOperatingSystem",
        "technicalApplications",
        "isGroup",
        "contactType"
      ],
      include: [
        {
          model: Client,
          as: "clients",
          attributes: ["id", "name", "isSubscriber"],
          through: { attributes: [] }
        }
      ]
    },
    {
      model: Queue,
      as: "queue",
      attributes: ["id", "name", "color"]
    },
    {
      model: Whatsapp,
      as: "whatsapp",
      attributes: ["id", "name", "type", "color"]
    },
    {
      model: User,
      as: "user",
      attributes: ["id", "name", "online"]
    }
  ];

  if (status) {
    whereCondition.status = status;
  }

  if (clientFilter) {
    // El filtro se resuelve por `Tickets.contactId`. Tickets no tiene `contactType`
    // (esa columna vive en Contacts): ponerla acá rompía con "Unknown column
    // 'Ticket.contactType' in 'WHERE'". Y una condición anidada sobre el include
    // desincroniza el count de findAndCountAll.
    const filtroDeCliente = resolverFiltroDeClienteEnTickets(clientFilter);

    if (filtroDeCliente.contactId) {
      whereCondition.contactId = filtroDeCliente.contactId;
    }
  }

  if (searchParam) {
    // La búsqueda se resuelve contra columnas de Tickets. Con `$contact.name$` y
    // `$messages.body$` Sequelize metía esas condiciones dentro de la subconsulta que
    // arma por el limit (la activa el include de fichas), donde los joins de Contacts
    // y Messages todavía no existen: MySQL respondía "Unknown column 'contact.name'
    // in 'WHERE'" y buscar devolvía 500.
    const sanitizedSearchParam = searchParam.toLocaleLowerCase().trim();
    const patron = `%${sanitizedSearchParam}%`;

    const [contactos, mensajes] = await Promise.all([
      Contact.findAll({
        attributes: ["id"],
        where: {
          [Op.or]: [
            where(fn("LOWER", col("name")), "LIKE", patron),
            { number: { [Op.like]: patron } }
          ]
        },
        raw: true
      }),
      Message.findAll({
        attributes: ["ticketId"],
        where: where(fn("LOWER", col("body")), "LIKE", patron),
        raw: true
      })
    ]);

    whereCondition = {
      ...whereCondition,
      // Va en Op.and para no pisar (ni que lo pisen) los Op.or que arman los filtros
      // de estado y de visibilidad más abajo.
      [Op.and]: [
        ...(whereCondition[Op.and] || []),
        {
          [Op.or]: [
            { contactId: { [Op.in]: contactos.map(contacto => contacto.id) } },
            {
              id: {
                [Op.in]: [
                  ...new Set(mensajes.map(mensaje => mensaje.ticketId))
                ]
              }
            }
          ]
        }
      ]
    };
  }

  if (startDate && endDate) {
    whereCondition = {
      ...whereCondition,
      createdAt: {
        [Op.between]: [
          startOfDay(parseISO(startDate)),
          endOfDay(parseISO(endDate))
        ]
      }
    };
  }

  if (status === "closed") {
    if (!isAdmin || (isAdmin && showAll !== "true")) {
      whereCondition = {
        ...whereCondition,
        userId: userId
      };
    }
  } else if (status === "pending") {
    if (!isAdmin) {
      if (allTicketsEnabled) {
        if (queueIds && queueIds.length > 0) {
          whereCondition = {
            ...whereCondition,
            [Op.or]: [
              { queueId: { [Op.in]: queueIds } },
              { queueId: null }
            ]
          };
        } else {
          whereCondition = {
            ...whereCondition,
            [Op.or]: [
              { userId: userId },
              { queueId: null }
            ]
          };
        }
      } else {
        if (queueIds && queueIds.length > 0) {
          whereCondition = {
            ...whereCondition,
            [Op.or]: [
              { userId: userId },
              { queueId: { [Op.in]: queueIds } },
              { queueId: null }
            ]
          };
        } else {
          whereCondition = {
            ...whereCondition,
            [Op.or]: [
              { userId: userId },
              { queueId: null }
            ]
          };
        }
      }
    } else {
      if (showAll === "true") {
        if (queueIds && queueIds.length > 0) {
          whereCondition = {
            ...whereCondition,
            [Op.or]: [
              { queueId: { [Op.in]: queueIds } },
              { queueId: null }
            ]
          };
        }
      } else {
        if (queueIds && queueIds.length > 0) {
          whereCondition = {
            ...whereCondition,
            [Op.or]: [
              { userId: userId },
              { queueId: { [Op.in]: queueIds } },
              { queueId: null }
            ]
          };
        } else {
          whereCondition = {
            ...whereCondition,
            [Op.or]: [
              { userId: userId },
              { queueId: null }
            ]
          };
        }
      }
    }
  } else if (status === "open") {
    if (!isAdmin || (isAdmin && showAll !== "true")) {
      if (queueIds && queueIds.length > 0) {
        whereCondition = {
          ...whereCondition,
          [Op.or]: [
            { userId: userId },
            {
              [Op.and]: [
                { queueId: { [Op.in]: queueIds } },
                { userId: null }
              ]
            }
          ]
        };
      } else {
        whereCondition = {
          ...whereCondition,
          [Op.or]: [{ userId: userId }]
        };
      }
    } else if (isAdmin && showAll === "true") {
      whereCondition = {
        ...whereCondition
      };
    }
  }


  if (withUnreadMessages === "true") {
    whereCondition = {
      ...whereCondition,
      unreadMessages: { [Op.gt]: 0 }
    };
  }

  if (isGroup !== undefined) {
    // Ticket.isGroup se copia del contacto al crear el ticket (CreateTicketService y
    // FindOrCreateTicketService), así que el filtro se resuelve en la propia tabla.
    // Con `$contact.isGroup$` Sequelize metía la condición dentro de la subconsulta
    // que arma por el limit, donde el join de Contacts todavía no existe, y MySQL
    // respondía "Unknown column 'contact.isGroup' in 'WHERE'": el listado entero
    // devolvía 500 y el panel se quedaba sin conversaciones.
    whereCondition = {
      ...whereCondition,
      isGroup: isGroup === "true" ? true : { [Op.or]: [false, null] }
    };
  }

  if (channelIds && channelIds.length > 0) {
    whereCondition = {
      ...whereCondition,
      whatsappId: { [Op.in]: channelIds }
    };
  }

  const defaultLimit = 20;
  const limit = all === "true" ? undefined : defaultLimit;
  const offset = all === "true" ? 0 : defaultLimit * (+(pageNumber || "1") - 1);

  const listSettingsService = await ListSettingsServiceOne({ key: "ASC" });
  const settingASC = listSettingsService?.value === "enabled" ? "ASC" : "DESC";

  const listSettingsService2 = await ListSettingsServiceOne({ key: "created" });
  const settingCreated =
    listSettingsService2?.value === "enabled" ? "createdAt" : "updatedAt";

  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: whereCondition,
    include: includeCondition,
    distinct: true,
    limit,
    offset,
    order: [["pinned", "DESC"], ["updatedAt", "DESC"]]
  });

  const hasMore = !(all === "true") && count > offset + defaultLimit;

  return {
    tickets,
    count,
    hasMore
  };
  } catch (error) {
    console.error("Erro ao listar tickets:", error);
    throw error;
  }
};

export default ListTicketsService;
