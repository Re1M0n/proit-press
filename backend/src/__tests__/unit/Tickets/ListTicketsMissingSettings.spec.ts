// Regresión: un ajuste que no existe no puede tumbar el listado de tickets.
// Las claves de orden (ASC / created / allTicket) se crean por seeds y el
// deploy de producción solo corre migraciones, así que la fila puede faltar.
import Setting from "../../../models/Setting";
import Ticket from "../../../models/Ticket";
import ListSettingsServiceOne from "../../../services/SettingServices/ListSettingsServiceOne";
import ListTicketsService from "../../../services/TicketServices/ListTicketsService";

describe("Ajustes ausentes en el listado de tickets", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("devuelve undefined en lugar de lanzar cuando la clave no existe", async () => {
    const settingFindOne = jest
      .spyOn(Setting, "findOne") as unknown as jest.Mock;
    settingFindOne.mockResolvedValue(null);

    await expect(ListSettingsServiceOne({ key: "ASC" })).resolves.toBeUndefined();
  });

  it("lista tickets con el orden por defecto cuando faltan los ajustes", async () => {
    const settingFindOne = jest
      .spyOn(Setting, "findOne") as unknown as jest.Mock;
    settingFindOne.mockResolvedValue(null);
    const findAndCountAll = jest
      .spyOn(Ticket, "findAndCountAll") as unknown as jest.Mock;
    findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await expect(
      ListTicketsService({ queueIds: [] })
    ).resolves.toEqual({ tickets: [], count: 0, hasMore: false });

    expect(findAndCountAll.mock.calls[0][0].order).toEqual([
      ["pinned", "DESC"],
      ["updatedAt", "DESC"]
    ]);
  });

  it("sigue listando cuando existe solo parte de los ajustes", async () => {
    const settingFindOne = jest
      .spyOn(Setting, "findOne") as unknown as jest.Mock;
    settingFindOne.mockImplementation(async ({ where }: any) =>
      where.key === "allTicket" ? { value: "disabled" } : null
    );
    const findAndCountAll = jest
      .spyOn(Ticket, "findAndCountAll") as unknown as jest.Mock;
    findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await expect(
      ListTicketsService({ queueIds: [], status: "pending" })
    ).resolves.toEqual({ tickets: [], count: 0, hasMore: false });
  });
});
