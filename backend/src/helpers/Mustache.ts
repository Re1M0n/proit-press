/* eslint-disable prefer-template */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-array-constructor */
import Mustache from "mustache";
import Ticket from "../models/Ticket";

export const msgsd = (): string => {

  let ms = "";

  const hh = new Date().getHours();

  if (hh >= 6) { ms = "Bom Dia"; }
  if (hh > 11) { ms = "Boa Tarde"; }
  if (hh > 17) { ms = "Boa Noite"; }
  if (hh > 23 || hh < 6) { ms = "Boa Madrugada"; }

  return ms;
};

export const control = (): string => {
  const Hr = new Date();

  const dd: string = ("0" + Hr.getDate()).slice(-2);
  const mm: string = ("0" + (Hr.getMonth() + 1)).slice(-2);
  const yy: string = Hr.getFullYear().toString();

  const ctrl = yy + mm + dd + "T";
  return ctrl;
};

export const date = (): string => {
  const Hr = new Date();

  const dd: string = ("0" + Hr.getDate()).slice(-2);
  const mm: string = ("0" + (Hr.getMonth() + 1)).slice(-2);
  const yy: string = Hr.getFullYear().toString();

  const dates = dd + "-" + mm + "-" + yy;
  return dates;
};

export const hour = (): string => {
  const Hr = new Date();

  const hh: number = Hr.getHours();
  const min: string = ("0" + Hr.getMinutes()).slice(-2);
  const ss: string = ("0" + Hr.getSeconds()).slice(-2);

  const hours = hh + ":" + min + ":" + ss;
  return hours;
};

export default (body: string, ticket?: Ticket): string => {
  const view = {
    // Las relaciones pueden venir nulas (p. ej. un ticket cuyo canal fue
    // eliminado y quedó con whatsappId nulo): acceder a `.name` tiraba un
    // TypeError que abortaba TODO el envío con ERR_SENDING_WAPP_MSG.
    name: ticket?.contact?.name ?? "",
    user: ticket?.user ?? "",
    ticket_id: ticket?.id ?? "",
    ms: msgsd(),
    hour: hour(),
    date: date(),
    queue: ticket?.queue?.name ?? "",
    connection: ticket?.whatsapp?.name ?? "",
    protocol: new Array(
      control(),
      ticket?.id != null ? ticket.id.toString() : ""
    ).join(""),
  };

  return Mustache.render(body, view);
};
