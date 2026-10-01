import React, { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { toast } from "react-toastify";
import api, { setApiBaseUrl } from "../../services/api";
import { getBackendConnectionErrorMessage, normalizeBackendUrl, saveBackendUrl } from "../../services/serverConfig";

const ServerSettingsModal = ({ open, onClose }) => {
  const [server, setServer] = useState(() => window.localStorage.getItem("proitPressServerUrl") || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    let attemptedUrl = "";
    try {
      const url = normalizeBackendUrl(server);
      attemptedUrl = url;
      await api.get("/personalizations", { baseURL: url });
      await api.delete("/auth/logout").catch(() => {});
      await saveBackendUrl(url);
      setApiBaseUrl(url);
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      toast.success("Servidor actualizado. Iniciá sesión nuevamente.");
      onClose(false);
      window.location.replace("/login");
    } catch (error) {
      toast.error(getBackendConnectionErrorMessage(error, attemptedUrl));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="sm">
      <DialogTitle>Servidor de ProIT Press</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="URL o IP del servidor y puerto"
          placeholder="soporte.ejemplo.com o 192.168.1.10:4000"
          value={server}
          onChange={event => setServer(event.target.value)}
          helperText="Se asume HTTPS si omitís el protocolo; usá http:// explícitamente si el servidor no tiene HTTPS. Solo se guarda la dirección."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancelar</Button>
        <Button onClick={handleSave} disabled={loading} variant="contained">Probar y guardar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServerSettingsModal;
