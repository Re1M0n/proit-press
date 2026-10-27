import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import api from "../../services/api";

const useStyles = makeStyles(() => ({
  nomina: {
    marginTop: 8
  }
}));

const ClientsModal = ({ open, clientId, onClose, ariaLabelledby }) => {
  const classes = useStyles();
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [notes, setNotes] = useState("");
  const [nomina, setNomina] = useState([]);
  const [opciones, setOpciones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setName("");
    setIsSubscriber(false);
    setNotes("");
    setNomina([]);
    setBusqueda("");
    setOpciones([]);

    if (!clientId) return;

    const fetchClient = async () => {
      try {
        const { data } = await api.get(`/clients/${clientId}`);

        setName(data.name || "");
        setIsSubscriber(Boolean(data.isSubscriber));
        setNotes(data.notes || "");
        setNomina(
          (data.contacts || []).map(contact => ({
            id: contact.id,
            name: contact.name,
            number: contact.number,
            contactType: contact.contactType || "client"
          }))
        );
      } catch (err) {
        toastError(err, t);
      }
    };

    fetchClient();
  }, [open, clientId, t]);

  useEffect(() => {
    if (!open || busqueda.trim().length < 2) {
      setOpciones([]);
      return undefined;
    }

    const timeout = setTimeout(async () => {
      setBuscando(true);

      try {
        const { data } = await api.get("/contacts", {
          params: { searchParam: busqueda, pageNumber: 1 }
        });

        setOpciones(
          (data.contacts || [])
            .filter(contact => !nomina.some(item => item.id === contact.id))
            .map(contact => ({
              id: contact.id,
              name: contact.name,
              number: contact.number,
              contactType: contact.contactType || "client"
            }))
        );
      } catch (err) {
        toastError(err, t);
      } finally {
        setBuscando(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [busqueda, open, nomina, t]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("clientsModal.errors.nameRequired"));
      return;
    }

    setSaving(true);

    try {
      const payload = { name, isSubscriber, notes };

      const { data } = clientId
        ? await api.put(`/clients/${clientId}`, payload)
        : await api.post("/clients", payload);

      await api.put(`/clients/${data.id}/contacts`, {
        contacts: nomina.map(contact => ({
          id: contact.id,
          contactType: contact.contactType
        }))
      });

      toast.success(t("clientsModal.success"));
      onClose();
    } catch (err) {
      if (
        String(err?.response?.data?.error || "").startsWith(
          "ERR_CONTACT_ALREADY_LINKED"
        )
      ) {
        toast.error(t("clientsModal.errors.alreadyLinked"));
      } else {
        toastError(err, t);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby={ariaLabelledby}
    >
      <DialogTitle id={ariaLabelledby}>
        {clientId ? t("clientsModal.title.edit") : t("clientsModal.title.add")}
      </DialogTitle>

      <DialogContent dividers>
        <TextField
          label={t("clientsModal.form.name")}
          value={name}
          onChange={e => setName(e.target.value)}
          fullWidth
          margin="normal"
          variant="outlined"
        />

        <FormControlLabel
          control={
            <Switch
              checked={isSubscriber}
              onChange={e => setIsSubscriber(e.target.checked)}
            />
          }
          label={t("clientsModal.form.subscriber")}
        />

        <TextField
          label={t("clientsModal.form.notes")}
          helperText={t("clientsModal.form.notesHelp")}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          margin="normal"
          variant="outlined"
        />

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {t("clientsModal.form.contactsTitle")}
        </Typography>

        <Autocomplete
          options={opciones}
          getOptionLabel={option => `${option.name} — ${option.number}`}
          value={null}
          inputValue={busqueda}
          onInputChange={(e, value) => setBusqueda(value)}
          onChange={(e, option) => {
            if (!option) return;

            setNomina(prevState => [...prevState, option]);
            setBusqueda("");
          }}
          noOptionsText={t("clientsModal.form.noOptions")}
          renderInput={params => (
            <TextField
              {...params}
              size="small"
              variant="outlined"
              placeholder={t("clientsModal.form.addContact")}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {buscando ? (
                      <CircularProgress color="inherit" size={16} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                )
              }}
            />
          )}
        />

        <List dense className={classes.nomina}>
          {nomina.map(contact => (
            <ListItem
              key={contact.id}
              secondaryAction={
                <IconButton
                  size="small"
                  onClick={() =>
                    setNomina(prevState =>
                      prevState.filter(item => item.id !== contact.id)
                    )
                  }
                >
                  <DeleteOutline color="secondary" />
                </IconButton>
              }
            >
              <ListItemText
                primary={contact.name}
                secondary={
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}
                  >
                    <Typography variant="caption">{contact.number}</Typography>
                    <Chip
                      size="small"
                      color={
                        contact.contactType === "external" ? "default" : "primary"
                      }
                      label={
                        contact.contactType === "external"
                          ? t("clientsModal.contactType.external")
                          : t("clientsModal.contactType.client")
                      }
                    />
                  </Box>
                }
              />
              <Select
                size="small"
                value={contact.contactType}
                sx={{ minWidth: 130, mr: 4 }}
                onChange={e =>
                  setNomina(prevState =>
                    prevState.map(item =>
                      item.id === contact.id
                        ? { ...item, contactType: e.target.value }
                        : item
                    )
                  )
                }
              >
                <MenuItem value="client">
                  {t("clientsModal.contactType.client")}
                </MenuItem>
                <MenuItem value="external">
                  {t("clientsModal.contactType.external")}
                </MenuItem>
              </Select>
            </ListItem>
          ))}
        </List>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary" variant="outlined">
          {t("clientsModal.buttons.cancel")}
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={saving}
        >
          {t("clientsModal.buttons.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientsModal;
