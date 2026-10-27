import { Op } from "sequelize";
import Client from "../models/Client";
import ClientContact from "../models/ClientContact";
import {
  CONTACT_TYPE_CLIENT,
  CONTACT_TYPE_EXTERNAL
} from "./ClientContactRules";

interface FiltroResuelto {
  contactType?: string;
  contactIds?: number[];
}

/**
 * Traduce el filtro del panel a condiciones ya resueltas.
 *
 * Los ids se resuelven acá y no con una condición anidada sobre el include
 * porque una condición anidada desincroniza el count de findAndCountAll y rompe
 * la paginación de las listas.
 *
 * "No abonado" es una decisión explícita: son los contactos que son el cliente
 * de una ficha con isSubscriber en false. Un contacto sin ficha no cae acá.
 */
export const resolverFiltroDeCliente = async (
  clientFilter?: string
): Promise<FiltroResuelto> => {
  if (clientFilter === CONTACT_TYPE_EXTERNAL) {
    return { contactType: CONTACT_TYPE_EXTERNAL };
  }

  if (clientFilter !== "subscriber" && clientFilter !== "nonSubscriber") {
    return {};
  }

  const fichas = await Client.findAll({
    where: { isSubscriber: clientFilter === "subscriber" },
    attributes: ["id"]
  });

  const idsFichas = fichas.map(ficha => Number(ficha.id));

  if (idsFichas.length === 0) {
    return { contactType: CONTACT_TYPE_CLIENT, contactIds: [] };
  }

  const vinculos = await ClientContact.findAll({
    where: { clientId: { [Op.in]: idsFichas } },
    attributes: ["contactId"]
  });

  return {
    contactType: CONTACT_TYPE_CLIENT,
    contactIds: [...new Set(vinculos.map(vinculo => Number(vinculo.contactId)))]
  };
};

export default resolverFiltroDeCliente;
