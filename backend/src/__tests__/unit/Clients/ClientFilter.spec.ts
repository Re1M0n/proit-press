import Client from "../../../models/Client";
import ClientContact from "../../../models/ClientContact";
import { resolverFiltroDeCliente } from "../../../helpers/ClientFilter";

describe("resolverFiltroDeCliente", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sin filtro no agrega condiciones", async () => {
    await expect(resolverFiltroDeCliente(undefined)).resolves.toEqual({});
  });

  it("externo se resuelve por el tipo del contacto", async () => {
    await expect(resolverFiltroDeCliente("external")).resolves.toEqual({
      contactType: "external"
    });
  });

  it("abonado trae los contactos de las fichas abonadas", async () => {
    const fichas = jest.spyOn(Client, "findAll") as unknown as jest.Mock;
    fichas.mockResolvedValue([{ id: 3 }]);
    const vinculos = jest.spyOn(ClientContact, "findAll") as unknown as jest.Mock;
    vinculos.mockResolvedValue([{ contactId: 11 }, { contactId: 12 }]);

    await expect(resolverFiltroDeCliente("subscriber")).resolves.toEqual({
      contactType: "client",
      contactIds: [11, 12]
    });
  });

  it("no abonado sale de las fichas no abonadas, no de los contactos sin ficha", async () => {
    const fichas = jest.spyOn(Client, "findAll") as unknown as jest.Mock;
    fichas.mockResolvedValue([{ id: 5 }]);
    const vinculos = jest.spyOn(ClientContact, "findAll") as unknown as jest.Mock;
    vinculos.mockResolvedValue([{ contactId: 21 }]);

    await expect(resolverFiltroDeCliente("nonSubscriber")).resolves.toEqual({
      contactType: "client",
      contactIds: [21]
    });

    expect(fichas).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isSubscriber: false } })
    );
  });

  it("sin fichas que cumplan, la lista de contactos queda vacía", async () => {
    const fichas = jest.spyOn(Client, "findAll") as unknown as jest.Mock;
    fichas.mockResolvedValue([]);
    const vinculos = jest.spyOn(ClientContact, "findAll") as unknown as jest.Mock;

    await expect(resolverFiltroDeCliente("subscriber")).resolves.toEqual({
      contactType: "client",
      contactIds: []
    });

    expect(vinculos).not.toHaveBeenCalled();
  });
});
