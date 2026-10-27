// ts-jest eleva las llamadas a jest.mock, así que el mock se aplica antes de que
// el servicio importe la conexión real.
jest.mock("../../../database", () => ({
  __esModule: true,
  default: { transaction: jest.fn(async (callback: any) => callback({})) }
}));

import AppError from "../../../errors/AppError";
import Client from "../../../models/Client";
import ClientContact from "../../../models/ClientContact";
import Contact from "../../../models/Contact";
import SetContactClientsService from "../../../services/ContactServices/SetContactClientsService";

describe("SetContactClientsService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rechaza más de una ficha para un contacto tipo cliente", async () => {
    const contacto = {
      id: 1,
      contactType: "client",
      update: jest.fn(),
      reload: jest.fn()
    };
    jest
      .spyOn(Contact, "findByPk")
      .mockResolvedValue(contacto as unknown as Contact);

    await expect(
      SetContactClientsService({ contactId: "1", clientIds: [3, 4] })
    ).rejects.toBeInstanceOf(AppError);

    expect(contacto.reload).not.toHaveBeenCalled();
  });

  it("acepta varias fichas para un contacto externo", async () => {
    const contacto = {
      id: 2,
      contactType: "external",
      reload: jest.fn().mockResolvedValue(undefined)
    };
    jest
      .spyOn(Contact, "findByPk")
      .mockResolvedValue(contacto as unknown as Contact);
    const fichas = jest.spyOn(Client, "findAll") as unknown as jest.Mock;
    fichas.mockResolvedValue([{ id: 3 }, { id: 4 }]);
    const destroy = jest.spyOn(ClientContact, "destroy") as unknown as jest.Mock;
    destroy.mockResolvedValue(0);
    const create = jest.spyOn(ClientContact, "create") as unknown as jest.Mock;
    create.mockResolvedValue({});

    await SetContactClientsService({ contactId: "2", clientIds: [3, 4] });

    expect(create).toHaveBeenCalledTimes(2);
    expect(contacto.reload).toHaveBeenCalled();
  });
});
