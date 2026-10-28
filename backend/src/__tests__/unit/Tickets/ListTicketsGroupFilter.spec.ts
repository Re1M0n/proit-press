// Regresión: el filtro por grupos del listado se resolvía con `$contact.isGroup$`.
// Con el limit, Sequelize arma una subconsulta y metía la condición adentro, donde
// el join de Contacts no existe: MySQL respondía "Unknown column 'contact.isGroup'
// in 'WHERE'" y GET /tickets devolvía 500.
jest.mock("../../../services/SettingServices/ListSettingsServiceOne", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null)
}));

import { Op } from "sequelize";
import Ticket from "../../../models/Ticket";
import ListTicketsService from "../../../services/TicketServices/ListTicketsService";

const claves = (valor: any, encontradas: string[] = []): string[] => {
  if (!valor || typeof valor !== "object") return encontradas;

  for (const clave of Reflect.ownKeys(valor)) {
    if (typeof clave === "string") encontradas.push(clave);
    claves((valor as any)[clave], encontradas);
  }

  return encontradas;
};

describe("ListTicketsService - filtro por grupos", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const prepararQuery = () => {
    const findAndCountAll = jest.spyOn(
      Ticket,
      "findAndCountAll"
    ) as unknown as jest.Mock;
    findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    return findAndCountAll;
  };

  it("no filtra por la columna del contacto", async () => {
    const findAndCountAll = prepararQuery();

    await ListTicketsService({ queueIds: [], isGroup: "false" });

    const where = findAndCountAll.mock.calls[0][0].where;
    expect(claves(where)).not.toContain("$contact.isGroup$");
  });

  it("los chats individuales usan isGroup del ticket", async () => {
    const findAndCountAll = prepararQuery();

    await ListTicketsService({ queueIds: [], isGroup: "false" });

    expect(findAndCountAll.mock.calls[0][0].where.isGroup).toEqual({
      [Op.or]: [false, null]
    });
  });

  it("los grupos usan isGroup del ticket", async () => {
    const findAndCountAll = prepararQuery();

    await ListTicketsService({ queueIds: [], isGroup: "true" });

    expect(findAndCountAll.mock.calls[0][0].where.isGroup).toBe(true);
  });

  it("no pisa el filtro de estado al filtrar chats individuales", async () => {
    const findAndCountAll = prepararQuery();

    await ListTicketsService({ queueIds: [], status: "open", isGroup: "false" });

    const where = findAndCountAll.mock.calls[0][0].where;
    expect(where.status).toBe("open");
    expect(Array.isArray(where[Op.or])).toBe(true);
    expect(where.isGroup).toEqual({ [Op.or]: [false, null] });
  });
});
