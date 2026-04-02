import { Request, Response } from "express";
import GroupManagementService from "../services/WbotServices/GroupManagementService";
import GroupEventsService from "../services/WbotServices/GroupEventsService";
import AppError from "../errors/AppError";
import { getWbot } from "../libs/wbot";
import { createActivityLog, ActivityActions, EntityTypes } from "../services/ActivityLogService";
import GetClientIp from "../helpers/GetClientIp";

export const createGroup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { name, participants } = req.body;
  const logUserId = req.user?.id || 1;
  const clientIp = GetClientIp(req);

  if (!name || !participants || !Array.isArray(participants)) {
    throw new AppError("Nombre y participantes son obligatorios");
  }

  const group = await GroupManagementService.createGroup({
    whatsappId: Number(whatsappId),
    name,
    participants
  });

  // LOG: Grupo creado
  try {
    await createActivityLog({
      userId: typeof logUserId === 'string' ? parseInt(logUserId) : logUserId,
      action: ActivityActions.CREATE,
      description: `Grupo "${name}" creado`,
      entityType: EntityTypes.GROUP,
      entityId: Number(whatsappId),
      ip: clientIp,
      additionalData: {
        groupName: name,
        participantCount: participants.length,
        whatsappId: Number(whatsappId)
      }
    });
  } catch (error) {
    console.error('Error al crear log de crear grupo:', error);
  }

  return res.json(group);
};

export const getGroupInfo = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId, groupId } = req.params;

  const groupInfo = await GroupManagementService.getGroupInfo(
    Number(whatsappId),
    groupId
  );

  return res.json(groupInfo);
};

export const updateGroupName = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId, groupId } = req.params;
  const { name } = req.body;

  await GroupManagementService.updateGroupName({
    whatsappId: Number(whatsappId),
    groupId,
    name
  });

  return res.json({ message: "Nombre del grupo actualizado con éxito" });
};

export const updateGroupDescription = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId, groupId } = req.params;
  const { description } = req.body;

  await GroupManagementService.updateGroupDescription({
    whatsappId: Number(whatsappId),
    groupId,
    description
  });

  return res.json({ message: "Descripción del grupo actualizada con éxito" });
};

export const addParticipants = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId, groupId } = req.params;
  const { participants } = req.body;
  const logUserId = req.user?.id || 1;
  const clientIp = GetClientIp(req);

  if (!participants || !Array.isArray(participants)) {
    throw new AppError("Los participantes deben ser un array");
  }

  const result = await GroupManagementService.addParticipants({
    whatsappId: Number(whatsappId),
    groupId,
    participants
  });

  const wbot = getWbot(Number(whatsappId));
  for (const participantId of participants) {
    try {
      const contact = await wbot.getContactById(participantId.includes('@') ? participantId : `${participantId}@c.us`);
      await GroupEventsService.registerEvent({
        whatsappId: Number(whatsappId),
        groupId,
        eventType: "PARTICIPANT_ADDED",
        participantId: contact.id._serialized,
        participantName: contact.name || contact.pushname || participantId,
        performedBy: wbot.info.wid._serialized,
        performedByName: "Tú"
      });
    } catch (err) {
      console.error(`Error al registrar evento de adición: ${err}`);
    }
  }

  // LOG: Participantes adicionados
  try {
    await createActivityLog({
      userId: typeof logUserId === 'string' ? parseInt(logUserId) : logUserId,
      action: ActivityActions.JOIN,
      description: `${participants.length} participante(s) adicionado(s) al grupo ${groupId}`,
      entityType: EntityTypes.GROUP,
      entityId: Number(whatsappId),
      ip: clientIp,
      additionalData: {
        groupId,
        participantCount: participants.length,
        whatsappId: Number(whatsappId)
      }
    });
  } catch (error) {
    console.error('Error al crear log de agregar participantes:', error);
  }

  return res.json({ 
    message: "Participantes agregados con éxito",
    result 
  });
};

export const removeParticipants = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId, groupId } = req.params;
  const { participants } = req.body;
  const logUserId = req.user?.id || 1;
  const clientIp = GetClientIp(req);

  if (!participants || !Array.isArray(participants)) {
    throw new AppError("Los participantes deben ser un array");
  }

  await GroupManagementService.removeParticipants({
    whatsappId: Number(whatsappId),
    groupId,
    participants
  });

  const wbot = getWbot(Number(whatsappId));
  for (const participantId of participants) {
    try {
      const contact = await wbot.getContactById(participantId.includes('@') ? participantId : `${participantId}@c.us`);
      await GroupEventsService.registerEvent({
        whatsappId: Number(whatsappId),
        groupId,
        eventType: "PARTICIPANT_REMOVED",
        participantId: contact.id._serialized,
        participantName: contact.name || contact.pushname || participantId,
        performedBy: wbot.info.wid._serialized,
        performedByName: "Tú"
      });
    } catch (err) {
      console.error(`Error al registrar evento de remoción: ${err}`);
    }
  }

  // LOG: Participantes removidos
  try {
    await createActivityLog({
      userId: typeof logUserId === 'string' ? parseInt(logUserId) : logUserId,
      action: ActivityActions.LEAVE,
      description: `${participants.length} participante(s) removido(s) del grupo ${groupId}`,
      entityType: EntityTypes.GROUP,
      entityId: Number(whatsappId),
      ip: clientIp,
      additionalData: {
        groupId,
        participantCount: participants.length,
        whatsappId: Number(whatsappId)
      }
    });
  } catch (error) {
    console.error('Error al crear log de remover participantes:', error);
  }

  return res.json({ message: "Participantes removidos con éxito" });
};

export const promoteParticipants = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId, groupId } = req.params;
  const { participants } = req.body;
  const logUserId = req.user?.id || 1;
  const clientIp = GetClientIp(req);

  if (!participants || !Array.isArray(participants)) {
    throw new AppError("Los participantes deben ser un array");
  }

  await GroupManagementService.promoteParticipants({
    whatsappId: Number(whatsappId),
    groupId,
    participants
  });

  const wbot = getWbot(Number(whatsappId));
  for (const participantId of participants) {
    try {
      const contact = await wbot.getContactById(participantId.includes('@') ? participantId : `${participantId}@c.us`);
      await GroupEventsService.registerEvent({
        whatsappId: Number(whatsappId),
        groupId,
        eventType: "PARTICIPANT_PROMOTED",
        participantId: contact.id._serialized,
        participantName: contact.name || contact.pushname || participantId,
        performedBy: wbot.info.wid._serialized,
        performedByName: "Tú"
      });
    } catch (err) {
      console.error(`Error al registrar evento de promoción: ${err}`);
    }
  }

  // LOG: Participantes promovidos
  try {
    await createActivityLog({
      userId: typeof logUserId === 'string' ? parseInt(logUserId) : logUserId,
      action: ActivityActions.PROMOTE,
      description: `${participants.length} participante(s) promovido(s) a admin en el grupo ${groupId}`,
      entityType: EntityTypes.GROUP,
      entityId: Number(whatsappId),
      ip: clientIp,
      additionalData: {
        groupId,
        participantCount: participants.length,
        whatsappId: Number(whatsappId)
      }
    });
  } catch (error) {
    console.error('Error al crear log de promover participantes:', error);
  }

  return res.json({ message: "Participantes promovidos a admin con éxito" });
};

export const demoteParticipants = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId, groupId } = req.params;
  const { participants } = req.body;
  const logUserId = req.user?.id || 1;
  const clientIp = GetClientIp(req);

  if (!participants || !Array.isArray(participants)) {
    throw new AppError("Los participantes deben ser un array");
  }

  await GroupManagementService.demoteParticipants({
    whatsappId: Number(whatsappId),
    groupId,
    participants
  });

  const wbot = getWbot(Number(whatsappId));
  for (const participantId of participants) {
    try {
      const contact = await wbot.getContactById(participantId.includes('@') ? participantId : `${participantId}@c.us`);
      await GroupEventsService.registerEvent({
        whatsappId: Number(whatsappId),
        groupId,
        eventType: "PARTICIPANT_DEMOTED",
        participantId: contact.id._serialized,
        participantName: contact.name || contact.pushname || participantId,
        performedBy: wbot.info.wid._serialized,
        performedByName: "Tú"
      });
    } catch (err) {
      console.error(`Error al registrar evento de degradación: ${err}`);
    }
  }

  // LOG: Participantes rebaixados
  try {
    await createActivityLog({
      userId: typeof logUserId === 'string' ? parseInt(logUserId) : logUserId,
      action: ActivityActions.DEMOTE,
      description: `${participants.length} participante(s) degradado(s) en el grupo ${groupId}`,
      entityType: EntityTypes.GROUP,
      entityId: Number(whatsappId),
      ip: clientIp,
      additionalData: {
        groupId,
        participantCount: participants.length,
        whatsappId: Number(whatsappId)
      }
    });
  } catch (error) {
    console.error('Error al crear log de degradar participantes:', error);
  }

  return res.json({ message: "Participantes degradados con éxito" });
};

export const leaveGroup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId, groupId } = req.params;

  await GroupManagementService.leaveGroup(Number(whatsappId), groupId);

  return res.json({ message: "Salió del grupo con éxito" });
};

export const getGroupInviteLink = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId, groupId } = req.params;

  const inviteLink = await GroupManagementService.getGroupInviteLink(
    Number(whatsappId),
    groupId
  );

  return res.json({ inviteLink });
};

export const revokeGroupInviteLink = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId, groupId } = req.params;
  const logUserId = req.user?.id || 1;
  const clientIp = GetClientIp(req);

  const newInviteLink = await GroupManagementService.revokeGroupInviteLink(
    Number(whatsappId),
    groupId
  );

  // LOG: Link de invitación revocado
  try {
    await createActivityLog({
      userId: typeof logUserId === 'string' ? parseInt(logUserId) : logUserId,
      action: ActivityActions.REVOKE,
      description: `Link de invitación del grupo ${groupId} revocado`,
      entityType: EntityTypes.GROUP,
      entityId: Number(whatsappId),
      ip: clientIp,
      additionalData: {
        groupId,
        whatsappId: Number(whatsappId)
      }
    });
  } catch (error) {
    console.error('Error al crear log de revocar link:', error);
  }

  return res.json({ inviteLink: newInviteLink });
};

export const listGroups = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;

  const groups = await GroupManagementService.listGroups(Number(whatsappId));

  return res.json(groups);
};

export const updateGroupSettings = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId, groupId } = req.params;
  const { messagesAdminsOnly, editGroupInfoAdminsOnly } = req.body;

  await GroupManagementService.updateGroupSettings(
    Number(whatsappId),
    groupId,
    {
      messagesAdminsOnly,
      editGroupInfoAdminsOnly
    }
  );

  return res.json({ message: "Configuraciones del grupo actualizadas con éxito" });
};
