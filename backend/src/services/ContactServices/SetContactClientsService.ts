import { Op } from "sequelize";
import sequelize from "../../database";
import AppError from "../../errors/AppError";
import {
  normalizarContactType,
  puedeVincularse
} from "../../helpers/ClientContactRules";
import Client from "../../models/Client";
import ClientContact from "../../models/ClientContact";
import Contact from "../../models/Contact";

interface Request {
  contactId: string | number;
  clientIds: Array<number | string>;
}

const SetContactClientsService = async ({
  contactId,
  clientIds = []
}: Request): Promise<Contact> => {
  const contact = await Contact.findByPk(contactId);

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  const ids = [...new Set(clientIds.map(id => Number(id)))];
  const [primera, ...resto] = ids;

  if (!puedeVincularse(normalizarContactType(contact.contactType), resto)) {
    throw new AppError("ERR_CONTACT_ALREADY_LINKED", 409);
  }

  const fichas = await Client.findAll({ where: { id: { [Op.in]: ids } } });

  if (fichas.length !== ids.length) {
    throw new AppError("ERR_NO_CLIENT_FOUND", 404);
  }

  await sequelize.transaction(async transaction => {
    await ClientContact.destroy({
      where: { contactId: contact.id },
      transaction
    });

    for (const clientId of ids) {
      await ClientContact.create(
        { clientId, contactId: contact.id },
        { transaction }
      );
    }
  });

  await contact.reload();

  return contact;
};

export default SetContactClientsService;
