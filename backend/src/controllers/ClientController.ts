import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CreateClientService from "../services/ClientServices/CreateClientService";
import DeleteClientService from "../services/ClientServices/DeleteClientService";
import ListClientsService from "../services/ClientServices/ListClientsService";
import SetClientContactsService from "../services/ClientServices/SetClientContactsService";
import ShowClientService from "../services/ClientServices/ShowClientService";
import UpdateClientService from "../services/ClientServices/UpdateClientService";

type IndexQuery = {
  searchParam?: string;
  isSubscriber?: string;
  pageNumber?: string | number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, isSubscriber, pageNumber } = req.query as IndexQuery;

  const { clients, count, hasMore } = await ListClientsService({
    searchParam,
    isSubscriber,
    pageNumber
  });

  return res.json({ clients, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, isSubscriber, notes } = req.body;

  const client = await CreateClientService({ name, isSubscriber, notes });

  const io = getIO();
  io.emit("client", { action: "create", client });

  return res.status(200).json(client);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { clientId } = req.params;

  const client = await ShowClientService(clientId);

  return res.status(200).json(client);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { clientId } = req.params;
  const { name, isSubscriber, notes } = req.body;

  const client = await UpdateClientService({
    clientData: { name, isSubscriber, notes },
    id: clientId
  });

  const io = getIO();
  io.emit("client", { action: "update", client });

  return res.status(200).json(client);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { clientId } = req.params;

  await DeleteClientService(clientId);

  const io = getIO();
  io.emit("client", { action: "delete", client: { id: Number(clientId) } });

  return res.status(200).json({ message: "Client deleted" });
};

export const setContacts = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { clientId } = req.params;
  const { contacts } = req.body;

  const client = await SetClientContactsService({ clientId, contacts });

  const io = getIO();
  io.emit("client", { action: "update", client });

  return res.status(200).json(client);
};
