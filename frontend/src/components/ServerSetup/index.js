import React, { useState } from "react";
import { Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { getBackendConnectionErrorMessage, normalizeBackendUrl, saveBackendUrl } from "../../services/serverConfig";
import { setApiBaseUrl } from "../../services/api";

const ServerSetup = ({ onConfigured }) => {
  const [server, setServer] = useState(() => window.localStorage.getItem("proitPressServerUrl") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async event => {
    event.preventDefault();
    setLoading(true);
    setError("");

    let attemptedUrl = "";
    try {
      const url = normalizeBackendUrl(server);
      attemptedUrl = url;
      const { default: api } = await import("../../services/api");
      await api.get("/personalizations", { baseURL: url });
      await saveBackendUrl(url);
      setApiBaseUrl(url);
      toast.success("Servidor conectado.");
      onConfigured();
    } catch (err) {
      setError(getBackendConnectionErrorMessage(err, attemptedUrl));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "background.default" }}>
      <Card sx={{ width: "100%", maxWidth: 440, borderRadius: 3, boxShadow: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" align="center" fontWeight={700} gutterBottom>
            ProIT Press
          </Typography>
          <Typography color="text.secondary" align="center" sx={{ mb: 3 }}>
            Conectá la app al servidor de PressTicket.
          </Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              required
              fullWidth
              autoFocus
              label="URL o IP del servidor y puerto"
              placeholder="soporte.ejemplo.com o 192.168.1.10:4000"
              value={server}
              onChange={event => setServer(event.target.value)}
              helperText="Se asume HTTPS al escribir solo el dominio. Si tu servidor no tiene HTTPS, indicá http:// al inicio."
              error={Boolean(error)}
              sx={{ mb: 2 }}
            />
            {error && <Typography color="error" variant="body2" sx={{ mb: 2 }}>{error}</Typography>}
            <Button type="submit" fullWidth variant="contained" size="large" disabled={loading}>
              {loading ? <CircularProgress size={24} color="inherit" /> : "Conectar"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ServerSetup;
