import api from "./api";

const ContactService = {
  /**
   * Cambia cómo el sistema trata los mensajes de un contacto:
   * "normal" | "silent" | "ignore" (ver backend/src/helpers/MessageHandling.ts).
   */
  updateMessageHandling: async (contactId, messageHandling) => {
    try {
      const { data } = await api.put(
        `/contacts/${contactId}/message-handling`,
        { messageHandling }
      );
      return data;
    } catch (error) {
      console.error("[ContactService] Erro ao alterar o manejo de mensagens:", error);
      throw error;
    }
  },
  refreshGroupProfilePic: async (contactId, whatsappId) => {
    try {
      const { data } = await api.post(`/contacts/${contactId}/refresh-group-pic`, null, {
        params: { whatsappId }
      });
      return data;
    } catch (error) {
      console.error("[ContactService] Erro ao atualizar foto do grupo:", error);
      throw error;
    }
  }
};

export default ContactService;
