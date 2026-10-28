import { literal, Op } from "sequelize";
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

/**
 * El mismo filtro, pero expresado para listados cuya consulta principal es Tickets.
 *
 * Tickets no tiene `contactType`: esa columna vive en Contacts. Ponerla en el where
 * del listado devolvía "Unknown column 'Ticket.contactType' in 'WHERE'" y filtrar por
 * abonado terminaba en 500. Acá el filtro se traduce a una subconsulta sobre
 * `Tickets.contactId`, que sí existe y se sigue evaluando dentro de la subconsulta
 * que arma el limit (por eso no se puede apoyar en el join: en ese punto no existe).
 */
export const resolverFiltroDeClienteEnTickets = (
  clientFilter?: string
): { contactId?: { [Op.in]: ReturnType<typeof literal> } } => {
  if (clientFilter === CONTACT_TYPE_EXTERNAL) {
    return {
      contactId: {
        [Op.in]: literal(
          `(SELECT contacto.id FROM Contacts AS contacto WHERE contacto.contactType = '${CONTACT_TYPE_EXTERNAL}')`
        )
      }
    };
  }

  if (clientFilter !== "subscriber" && clientFilter !== "nonSubscriber") {
    return {};
  }

  // Sólo los contactos de tipo cliente: un externo puede estar en una ficha abonada
  // y aun así no cuenta como abonado (cae en "Externo").
  const abonado = clientFilter === "subscriber" ? 1 : 0;

  return {
    contactId: {
      [Op.in]: literal(`(
        SELECT vinculo.contactId
        FROM ClientContacts AS vinculo
        INNER JOIN Clients AS ficha ON ficha.id = vinculo.clientId
        INNER JOIN Contacts AS contacto ON contacto.id = vinculo.contactId
        WHERE ficha.isSubscriber = ${abonado}
          AND contacto.contactType = '${CONTACT_TYPE_CLIENT}'
      )`)
    }
  };
};

export default resolverFiltroDeCliente;
