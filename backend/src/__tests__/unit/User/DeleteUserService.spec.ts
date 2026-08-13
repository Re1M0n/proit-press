import { faker } from "@faker-js/faker";
import AppError from "../../../errors/AppError";
import CreateUserService from "../../../services/UserServices/CreateUserService";
import DeleteUserService from "../../../services/UserServices/DeleteUserService";
import { disconnect, truncate } from "../../utils/database";

// Evita cargar la cadena completa (UpdateTicketService -> whatsapp-web.js -> puppeteer),
// que rompe jest 26 con el prefijo `node:` de los builtins.
// Nota: el factory es obligatorio — sin él jest carga el módulo real (automock)
// para inferir su forma y la cadena de puppeteer se carga igual.
jest.mock("../../../helpers/UpdateDeletedUserOpenTicketsStatus", () => ({
  __esModule: true,
  default: jest.fn()
}));

describe("User", () => {
  beforeEach(async () => {
    await truncate();
  });

  afterEach(async () => {
    await truncate();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("should be delete a existing user", async () => {
    const { id } = await CreateUserService({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password()
    });

    await expect(DeleteUserService(id)).resolves.not.toThrow();
  });

  it("to throw an error if tries to delete a non existing user", async () => {
    expect(DeleteUserService(faker.number.int())).rejects.toBeInstanceOf(
      AppError
    );
  });
});
