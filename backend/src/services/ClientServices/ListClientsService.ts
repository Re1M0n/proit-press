import { Sequelize } from "sequelize";
import Client from "../../models/Client";

interface Request {
  searchParam?: string;
  /** "true" | "false" (texto, como llega por query string) */
  isSubscriber?: string;
  pageNumber?: string | number;
}

interface Response {
  clients: Client[];
  count: number;
  hasMore: boolean;
}

const ListClientsService = async ({
  searchParam = "",
  isSubscriber,
  pageNumber = "1"
}: Request): Promise<Response> => {
  const whereCondition: any = {};

  if (searchParam.trim()) {
    whereCondition.name = Sequelize.where(
      Sequelize.fn("LOWER", Sequelize.col("Client.name")),
      "LIKE",
      `%${searchParam.toLowerCase().trim()}%`
    );
  }

  if (isSubscriber === "true" || isSubscriber === "false") {
    whereCondition.isSubscriber = isSubscriber === "true";
  }

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: clients } = await Client.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["name", "ASC"]],
    attributes: {
      include: [
        [
          Sequelize.literal(`(
            SELECT COUNT(*)
            FROM ClientContacts AS cc
            WHERE cc.clientId = Client.id
          )`),
          "contactsCount"
        ],
        [
          Sequelize.literal(`(
            SELECT COUNT(*)
            FROM ClientContacts AS cc
            INNER JOIN Contacts AS contact ON contact.id = cc.contactId
            WHERE cc.clientId = Client.id AND contact.contactType = 'external'
          )`),
          "externalContactsCount"
        ]
      ]
    }
  });

  const hasMore = count > offset + clients.length;

  return { clients, count, hasMore };
};

export default ListClientsService;
