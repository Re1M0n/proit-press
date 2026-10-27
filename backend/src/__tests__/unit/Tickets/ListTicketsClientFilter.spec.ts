// El servicio lee un ajuste al empezar: se mockea para que el test no toque la base.
jest.mock("../../../services/SettingServices/ListSettingsServiceOne", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null)
}));

import { Op } from "sequelize";
import Client from "../../../models/Client";
import ClientContact from "../../../models/ClientContact";
import Ticket from "../../../models/Ticket";
import ListTicketsService from "../../../services/TicketServices/ListTicketsService";

describe("ListTicketsService - filtro por estado de abono", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("filtra por externos sin consultar fichas", async () => {
    const findAndCountAll = jest.spyOn(Ticket, "findAndCountAll") as unknown as jest.Mock;
    findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    const fichas = jest.spyOn(Client, "findAll") as unknown as jest.Mock;

    await ListTicketsService({ clientFilter: "external", queueIds: [] });

    const condiciones = findAndCountAll.mock.calls[0][0].where as any;
    expect(condiciones.contactType).toBe("external");
    expect(fichas).not.toHaveBeenCalled();
  });

  it("filtra por abonados con los ids de contactos ya resueltos", async () => {
    const fichas = jest.spyOn(Client, "findAll") as unknown as jest.Mock;
    fichas.mockResolvedValue([{ id: 3 }]);
    const vinculos = jest.spyOn(ClientContact, "findAll") as unknown as jest.Mock;
    vinculos.mockResolvedValue([{ contactId: 11 }, { contactId: 12 }]);
    const findAndCountAll = jest.spyOn(Ticket, "findAndCountAll") as unknown as jest.Mock;
    findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await ListTicketsService({ clientFilter: "subscriber", queueIds: [] });

    const condiciones = findAndCountAll.mock.calls[0][0].where as any;
    expect(condiciones.contactType).toBe("client");
    expect(condiciones.contactId).toEqual({ [Op.in]: [11, 12] });
  });

  it("sin filtro no agrega condiciones de contacto", async () => {
    const findAndCountAll = jest.spyOn(Ticket, "findAndCountAll") as unknown as jest.Mock;
    findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await ListTicketsService({ queueIds: [] });

    const condiciones = findAndCountAll.mock.calls[0][0].where as any;
    expect(condiciones.contactId).toBeUndefined();
  });
});
