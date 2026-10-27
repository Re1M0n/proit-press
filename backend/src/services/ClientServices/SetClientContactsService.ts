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

interface ContactoDeNomina {
  id: number | string;
  contactType?: string;
}

interface Request {
  clientId: string | number;
  contacts: ContactoDeNomina[];
}

const SetClientContactsService = async ({
  clientId,
  contacts = []
}: Request): Promise<Client> => {
  const client = await Client.findByPk(clientId);

  if (!client) {
    throw new AppError("ERR_NO_CLIENT_FOUND", 404);
  }

  const nomina = contacts.map(contact => ({
    id: Number(contact.id),
    contactType: normalizarContactType(contact.contactType)
  }));

  // Validación antes de escribir: si algo no cumple la regla, no se toca nada.
  for (const deseado of nomina) {
    const contact = await Contact.findByPk(deseado.id);

    if (!contact) {
      throw new AppError("ERR_NO_CONTACT_FOUND", 404);
    }

    const vinculos = await ClientContact.findAll({
      where: { contactId: deseado.id }
    });

    const otrasFichas = vinculos
      .filter(vinculo => Number(vinculo.clientId) !== Number(clientId))
      .map(vinculo => Number(vinculo.clientId));

    if (!puedeVincularse(deseado.contactType, otrasFichas)) {
      throw new AppError(
        `ERR_CONTACT_ALREADY_LINKED:${otrasFichas.join(",")}`,
        409
      );
    }
  }

  const idsDeseados = nomina.map(item => item.id);

  await sequelize.transaction(async transaction => {
    for (const deseado of nomina) {
      await Contact.update(
        { contactType: deseado.contactType },
        { where: { id: deseado.id }, transaction }
      );

      await ClientContact.findOrCreate({
        where: { clientId: client.id, contactId: deseado.id },
        defaults: { clientId: client.id, contactId: deseado.id },
        transaction
      });
    }

    await ClientContact.destroy({
      where: {
        clientId: client.id,
        ...(idsDeseados.length > 0
          ? { contactId: { [Op.notIn]: idsDeseados } }
          : {})
      },
      transaction
    });
  });

  await client.reload();

  return client;
};

export default SetClientContactsService;
