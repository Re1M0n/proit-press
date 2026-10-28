// Regresión: el filtro Abonado / No abonado / Externo del listado se aplicaba como
// `whereCondition.contactType`, pero esa columna vive en Contacts, no en Tickets.
// MySQL respondía "Unknown column 'Ticket.contactType' in 'WHERE'" y filtrar devolvía
// 500. Ahora el filtro se traduce a una condición sobre `Tickets.contactId`.
jest.mock("../../../services/SettingServices/ListSettingsServiceOne", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null)
}));

import { Op } from "sequelize";
import Contact from "../../../models/Contact";
import Message from "../../../models/Message";
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

/** El texto de la subconsulta literal que quedó en la condición. */
const subconsulta = (where: any): string => String(where.contactId[Op.in].val);

describe("ListTicketsService - filtro por estado de abono", () => {
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

  it("no filtra por columnas que no existen en Tickets", async () => {
    const findAndCountAll = prepararQuery();

    await ListTicketsService({ clientFilter: "external", queueIds: [] });

    const where = findAndCountAll.mock.calls[0][0].where;
    expect(claves(where)).not.toContain("contactType");
  });

  it("los externos se resuelven por contacto, no por contacto vinculado a ficha", async () => {
    const findAndCountAll = prepararQuery();

    await ListTicketsService({ clientFilter: "external", queueIds: [] });

    const where = findAndCountAll.mock.calls[0][0].where as any;
    expect(subconsulta(where)).toContain("contacto.contactType = 'external'");
    expect(subconsulta(where)).not.toContain("isSubscriber");
  });

  it("los abonados salen de las fichas con isSubscriber", async () => {
    const findAndCountAll = prepararQuery();

    await ListTicketsService({ clientFilter: "subscriber", queueIds: [] });

    const where = findAndCountAll.mock.calls[0][0].where as any;
    expect(subconsulta(where)).toContain("ficha.isSubscriber = 1");
    expect(subconsulta(where)).toContain("ClientContacts");
  });

  it("los no abonados salen de las fichas sin isSubscriber", async () => {
    const findAndCountAll = prepararQuery();

    await ListTicketsService({ clientFilter: "nonSubscriber", queueIds: [] });

    const where = findAndCountAll.mock.calls[0][0].where as any;
    expect(subconsulta(where)).toContain("ficha.isSubscriber = 0");
  });

  it("no cuenta como abonado a un contacto externo vinculado a una ficha", async () => {
    const findAndCountAll = prepararQuery();

    await ListTicketsService({ clientFilter: "subscriber", queueIds: [] });

    const where = findAndCountAll.mock.calls[0][0].where as any;
    expect(subconsulta(where)).toContain("contacto.contactType = 'client'");
  });

  it("sin filtro no agrega condiciones de contacto", async () => {
    const findAndCountAll = prepararQuery();

    await ListTicketsService({ queueIds: [] });

    const where = findAndCountAll.mock.calls[0][0].where as any;
    expect(where.contactId).toBeUndefined();
  });

  it("convive con la búsqueda y con el filtro de estado", async () => {
    const findAndCountAll = prepararQuery();
    (jest.spyOn(Contact, "findAll") as unknown as jest.Mock).mockResolvedValue([
      { id: 11 }
    ]);
    (jest.spyOn(Message, "findAll") as unknown as jest.Mock).mockResolvedValue([
      { ticketId: 7 }
    ]);

    await ListTicketsService({
      queueIds: [],
      clientFilter: "subscriber",
      searchParam: "abril",
      status: "open",
      isAdmin: false,
      userId: "14"
    });

    const where = findAndCountAll.mock.calls[0][0].where as any;
    expect(subconsulta(where)).toContain("ficha.isSubscriber = 1");
    expect(where[Op.or]).toEqual([{ userId: "14" }]);
    expect(where[Op.and][0][Op.or][0].contactId).toBeDefined();
  });
});
