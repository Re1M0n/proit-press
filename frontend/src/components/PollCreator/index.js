import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Poll as PollIcon
} from "@mui/icons-material";
import { toast } from "react-toastify";
import api from "../../services/api";

const PollCreator = ({ open, onClose, ticketId }) => {
  const [pollName, setPollName] = useState("");
  const [options, setOptions] = useState([{ name: "" }, { name: "" }]);
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddOption = () => {
    if (options.length >= 12) {
      toast.warning("Máximo de 12 opciones permitidas");
      return;
    }
    setOptions([...options, { name: "" }]);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      toast.warning("Mínimo de 2 opciones necesarias");
      return;
    }
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index].name = value;
    setOptions(newOptions);
  };

  const handleSendPoll = async () => {
    if (!pollName.trim()) {
      toast.error("Ingresá el nombre de la encuesta");
      return;
    }

    const validOptions = options.filter(opt => opt.name.trim() !== "");
    
    if (validOptions.length < 2) {
      toast.error("La encuesta debe tener como mínimo 2 opciones");
      return;
    }

    setLoading(true);

    try {
      await api.post(`/messages/${ticketId}/poll`, {
        pollName: pollName.trim(),
        options: validOptions,
        allowMultipleAnswers
      });

      toast.success("¡Encuesta enviada con éxito!");
      handleClose();
    } catch (error) {
      console.error("Erro ao enviar enquete:", error);
      toast.error(error.response?.data?.error || "Erro ao enviar enquete");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPollName("");
    setOptions([{ name: "" }, { name: "" }]);
    setAllowMultipleAnswers(false);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <PollIcon style={{ marginRight: 8 }} />
          Crear Encuesta
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box mb={3}>
          <TextField
            label="Pregunta de la Encuesta"
            fullWidth
            value={pollName}
            onChange={(e) => setPollName(e.target.value)}
            placeholder="Ej: ¿Cuál es el mejor horario para vos?"
            variant="outlined"
            autoFocus
            inputProps={{ maxLength: 255 }}
          />
        </Box>

        <Typography variant="subtitle2" gutterBottom>
          Opciones ({options.length}/12)
        </Typography>

        <Paper variant="outlined" style={{ maxHeight: 300, overflow: "auto", marginBottom: 16 }}>
          <List>
            {options.map((option, index) => (
              <ListItem key={index}>
                <TextField
                  fullWidth
                  size="small"
                  value={option.name}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Opción ${index + 1}`}
                  variant="outlined"
                  inputProps={{ maxLength: 100 }}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveOption(index)}
                    disabled={options.length <= 2}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>

        <Button
          startIcon={<AddIcon />}
          onClick={handleAddOption}
          disabled={options.length >= 12}
          variant="outlined"
          fullWidth
        >
          Agregar Opción
        </Button>

        <Box mt={2}>
          <FormControlLabel
            control={
              <Switch
                checked={allowMultipleAnswers}
                onChange={(e) => setAllowMultipleAnswers(e.target.checked)}
                color="primary"
              />
            }
            label="Permitir múltiples respuestas"
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSendPoll}
          color="primary"
          variant="contained"
          disabled={loading}
          startIcon={<PollIcon />}
        >
          {loading ? "Enviando..." : "Enviar Encuesta"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PollCreator;
