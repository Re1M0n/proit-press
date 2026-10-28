// Regresión: la búsqueda filtraba con `$contact.name$`, `$contact.number$` y
// `$messages.body$`. Con el limit, Sequelize arma una subconsulta y metía esas
// condiciones adentro, donde los joins de Contacts y Messages no existen: MySQL
// respondía "Unknown column 'contact.name' in 'WHERE'" y buscar devolvía 500.
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

const textos = (valor: any, encontrados: string[] = []): string[] => {
  if (typeof valor === "string") return [...encontrados, valor];
  if (!valor || typeof valor !== "object") return encontrados;

  return Reflect.ownKeys(valor).reduce(
    (acumuladas, clave) => textos((valor as any)[clave as any], acumuladas),
    encontrados
  );
};

describe("ListTicketsService - búsqueda", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const prepararQuery = () => {
    const findAndCountAll = jest.spyOn(
      Ticket,
      "findAndCountAll"
    ) as unknown as jest.Mock;
    findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const contactos = jest.spyOn(
      Contact,
      "findAll"
    ) as unknown as jest.Mock;
    contactos.mockResolvedValue([{ id: 11 }, { id: 12 }]);

    const mensajes = jest.spyOn(Message, "findAll") as unknown as jest.Mock;
    mensajes.mockResolvedValue([
      { ticketId: 7 },
      { ticketId: 7 },
      { ticketId: 9 }
    ]);

    return { findAndCountAll, contactos, mensajes };
  };

  it("no usa condiciones sobre modelos incluidos", async () => {
    const { findAndCountAll } = prepararQuery();

    await ListTicketsService({ queueIds: [], searchParam: "abril" });

    const where = findAndCountAll.mock.calls[0][0].where;
    expect(claves(where)).not.toContain("$contact.name$");
    expect(claves(where)).not.toContain("$contact.number$");
    expect(claves(where)).not.toContain("$messages.body$");
  });

  it("no incluye mensajes en el listado", async () => {
    const { findAndCountAll } = prepararQuery();

    await ListTicketsService({ queueIds: [], searchParam: "abril" });

    const includes = findAndCountAll.mock.calls[0][0].include as any[];
    expect(includes.map(incluye => incluye.as)).not.toContain("messages");
  });

  it("filtra por los ids de contactos y de tickets que coinciden", async () => {
    const { findAndCountAll } = prepararQuery();

    await ListTicketsService({ queueIds: [], searchParam: "abril" });

    const where = findAndCountAll.mock.calls[0][0].where as any;
    const busqueda = where[Op.and][0][Op.or];

    expect(busqueda).toEqual([
      { contactId: { [Op.in]: [11, 12] } },
      { id: { [Op.in]: [7, 9] } }
    ]);
  });

  it("busca sin distinguir mayúsculas sobre nombre, número y cuerpo", async () => {
    const { contactos, mensajes } = prepararQuery();

    await ListTicketsService({ queueIds: [], searchParam: "  ABRIL " });

    const patron = "%abril%";
    const condicionContactos = (contactos.mock.calls[0][0] as any).where;
    const condicionMensajes = (mensajes.mock.calls[0][0] as any).where;

    expect(textos(condicionContactos)).toContain(patron);
    expect(condicionContactos[Op.or][1]).toEqual({
      number: { [Op.like]: patron }
    });
    expect(textos(condicionMensajes)).toContain(patron);
  });

  it("conserva la búsqueda cuando el filtro de estado arma su propio Op.or", async () => {
    const { findAndCountAll } = prepararQuery();

    await ListTicketsService({
      queueIds: [],
      searchParam: "abril",
      status: "open",
      isAdmin: false,
      userId: "14"
    });

    const where = findAndCountAll.mock.calls[0][0].where as any;
    expect(where[Op.or]).toEqual([{ userId: "14" }]);
    expect(where[Op.and][0][Op.or][0].contactId).toBeDefined();
  });
});
