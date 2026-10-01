import Contact from "../../../models/Contact";
import UpdateContactService from "../../../services/ContactServices/UpdateContactService";

describe("UpdateContactService - información técnica", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("guarda hardware, sistema operativo y aplicaciones especiales", async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const reload = jest.fn().mockResolvedValue(undefined);
    const contact = {
      id: 123,
      name: "Contacto de prueba",
      messageHandling: "normal",
      nameManuallyEdited: false,
      extraInfo: [],
      update,
      reload
    } as unknown as Contact;

    jest.spyOn(Contact, "findOne").mockResolvedValue(contact);

    await UpdateContactService({
      contactId: "123",
      contactData: {
        technicalHardware: "Dell OptiPlex 7090, 16 GB RAM",
        technicalOperatingSystem: "Windows 11 Pro",
        technicalApplications: "Tango Gestión"
      }
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      technicalHardware: "Dell OptiPlex 7090, 16 GB RAM",
      technicalOperatingSystem: "Windows 11 Pro",
      technicalApplications: "Tango Gestión"
    }));
    expect(reload).toHaveBeenCalled();
  });

  it("no borra los datos técnicos si el request no envía esos campos", async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const reload = jest.fn().mockResolvedValue(undefined);
    const contact = {
      id: 123,
      name: "Contacto de prueba",
      messageHandling: "normal",
      nameManuallyEdited: false,
      extraInfo: [],
      update,
      reload
    } as unknown as Contact;

    jest.spyOn(Contact, "findOne").mockResolvedValue(contact);

    await UpdateContactService({
      contactId: "123",
      contactData: { email: "cliente@example.com" }
    });

    const updateData = update.mock.calls[0][0];
    expect(updateData).not.toHaveProperty("technicalHardware");
    expect(updateData).not.toHaveProperty("technicalOperatingSystem");
    expect(updateData).not.toHaveProperty("technicalApplications");
  });
});
