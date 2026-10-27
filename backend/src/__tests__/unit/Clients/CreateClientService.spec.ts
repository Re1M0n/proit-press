import Client from "../../../models/Client";
import CreateClientService from "../../../services/ClientServices/CreateClientService";

describe("CreateClientService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("crea la ficha abonada cuando el nombre es nuevo", async () => {
    const findOne = jest.spyOn(Client, "findOne") as unknown as jest.Mock;
    findOne.mockResolvedValue(null);
    const reload = jest.fn().mockResolvedValue(undefined);
    const creada = {
      id: 1,
      name: "Acme",
      isSubscriber: true,
      notes: "CUIT 30-12345678-9",
      reload
    } as unknown as Client;
    const create = jest.spyOn(Client, "create") as unknown as jest.Mock;
    create.mockResolvedValue(creada);

    const client = await CreateClientService({
      name: "Acme",
      isSubscriber: true,
      notes: "CUIT 30-12345678-9"
    });

    expect(client.isSubscriber).toBe(true);
    expect(Client.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Acme", isSubscriber: true })
    );
  });

  it("rechaza un nombre repetido", async () => {
    const findOne = jest.spyOn(Client, "findOne") as unknown as jest.Mock;
    findOne.mockResolvedValue({ id: 2, name: "Acme" });

    await expect(CreateClientService({ name: "Acme" })).rejects.toMatchObject({
      message: "ERR_CLIENT_NAME_ALREADY_EXISTS",
      statusCode: 409
    });
  });

  it("rechaza un nombre vacío", async () => {
    await expect(CreateClientService({ name: "  " })).rejects.toMatchObject({
      message: "ERR_CLIENT_NAME_REQUIRED",
      statusCode: 400
    });
  });
});
