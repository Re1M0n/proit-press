import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { format } from "date-fns";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";
import api from "../../services/api";

const emptyForm = defaultDate => ({
  title: "",
  date: defaultDate || format(new Date(), "yyyy-MM-dd"),
  time: "09:00",
  recurrence: "none",
  notes: ""
});

const toForm = reminder => {
  const dueAt = new Date(reminder.dueAt);

  return {
    title: reminder.title,
    date: format(dueAt, "yyyy-MM-dd"),
    time: format(dueAt, "HH:mm"),
    recurrence: reminder.recurrence,
    notes: reminder.notes || ""
  };
};

const ReminderModal = ({ open, reminder, defaultDate, onClose, onSaved }) => {
  const { user } = useContext(AuthContext);
  const [form, setForm] = useState(emptyForm(defaultDate));
  const [linkTab, setLinkTab] = useState("ticket");
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);

  const canManage = useMemo(() => {
    if (!reminder) return true;
    const profile = String(user?.profile || "").toLowerCase();
    return (
      Number(reminder.createdBy?.id) === Number(user?.id) ||
      profile === "admin" ||
      profile === "masteradmin"
    );
  }, [reminder, user]);

  useEffect(() => {
    if (!open) return;

    setForm(reminder ? toForm(reminder) : emptyForm(defaultDate));
    setSearch("");
    setOptions([]);
    setSelectedLink(
      reminder?.ticket
        ? {
            type: "ticket",
            id: reminder.ticket.id,
            label: `Ticket #${reminder.ticket.id}${
              reminder.ticket.contactName ? ` — ${reminder.ticket.contactName}` : ""
            }`
          }
        : reminder?.contact
          ? {
              type: "contact",
              id: reminder.contact.id,
              label: reminder.contact.name
            }
          : null
    );
    setLinkTab(reminder?.contact && !reminder?.ticket ? "contact" : "ticket");
  }, [open, reminder, defaultDate]);

  useEffect(() => {
    const normalizedSearch = search.trim();
    const currentRequestId = ++requestId.current;

    if (!open || !canManage || normalizedSearch.length < 2) {
      setOptions([]);
      return undefined;
    }

    const timeout = setTimeout(async () => {
      try {
        if (linkTab === "ticket") {
          const { data } = await api.get("/tickets", {
            params: { searchParam: normalizedSearch, pageNumber: 1 }
          });
          if (currentRequestId !== requestId.current) return;
          setOptions(
            (data.tickets || []).map(ticket => ({
              type: "ticket",
              id: ticket.id,
              label: `Ticket #${ticket.id}${
                ticket.contact?.name ? ` — ${ticket.contact.name}` : ""
              }`
            }))
          );
        } else {
          const { data } = await api.get("/contacts", {
            params: { searchParam: normalizedSearch, pageNumber: 1 }
          });
          if (currentRequestId !== requestId.current) return;
          setOptions(
            (data.contacts || []).map(contact => ({
              type: "contact",
              id: contact.id,
              label: contact.name
            }))
          );
        }
      } catch (error) {
        if (currentRequestId === requestId.current) {
          setOptions([]);
          toastError(error);
        }
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [open, canManage, search, linkTab]);

  const handleLinkTabChange = (event, value) => {
    setLinkTab(value);
    setSearch("");
    setOptions([]);
    setSelectedLink(null);
  };

  const handleSave = async () => {
    const dueAt = new Date(`${form.date}T${form.time}:00`);
    if (!form.title.trim() || !Number.isFinite(dueAt.getTime())) return;

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        notes: form.notes.trim() || null,
        dueAt: dueAt.toISOString(),
        recurrence: form.recurrence,
        ticketId: selectedLink?.type === "ticket" ? selectedLink.id : null,
        contactId: selectedLink?.type === "contact" ? selectedLink.id : null
      };

      if (reminder) {
        await api.put(`/reminders/${reminder.id}`, payload);
      } else {
        await api.post("/reminders", payload);
      }

      onSaved();
    } catch (error) {
      toastError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!reminder || !canManage) return;
    if (!window.confirm("¿Eliminar este recordatorio?")) return;

    setSaving(true);
    try {
      await api.delete(`/reminders/${reminder.id}`);
      onSaved();
    } catch (error) {
      toastError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {reminder ? "Recordatorio" : "Nuevo recordatorio"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Título"
            value={form.title}
            onChange={event => setForm({ ...form, title: event.target.value })}
            inputProps={{ maxLength: 120 }}
            autoFocus
            disabled={!canManage || saving}
            fullWidth
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Fecha"
              type="date"
              value={form.date}
              onChange={event => setForm({ ...form, date: event.target.value })}
              InputLabelProps={{ shrink: true }}
              disabled={!canManage || saving}
              fullWidth
            />
            <TextField
              label="Hora"
              type="time"
              value={form.time}
              onChange={event => setForm({ ...form, time: event.target.value })}
              InputLabelProps={{ shrink: true }}
              disabled={!canManage || saving}
              fullWidth
            />
            <TextField
              select
              label="Repetir"
              value={form.recurrence}
              onChange={event =>
                setForm({ ...form, recurrence: event.target.value })
              }
              disabled={!canManage || saving}
              fullWidth
            >
              <MenuItem value="none">Nunca</MenuItem>
              <MenuItem value="daily">Todos los días</MenuItem>
              <MenuItem value="weekly">Todas las semanas</MenuItem>
              <MenuItem value="monthly">Todos los meses</MenuItem>
            </TextField>
          </Stack>

          <div>
            <Tabs
              value={linkTab}
              onChange={handleLinkTabChange}
              aria-label="Vínculo del recordatorio"
            >
              <Tab value="ticket" label="Ticket" disabled={!canManage || saving} />
              <Tab value="contact" label="Contacto" disabled={!canManage || saving} />
            </Tabs>
            <Autocomplete
              options={options}
              value={selectedLink}
              inputValue={selectedLink?.label || search}
              onInputChange={(event, value, reason) => {
                if (reason === "input") {
                  setSelectedLink(null);
                  setSearch(value);
                }
                if (reason === "clear") {
                  setSearch("");
                  setSelectedLink(null);
                }
              }}
              onChange={(event, value) => {
                setSelectedLink(value);
                setSearch("");
              }}
              getOptionLabel={option => option.label || ""}
              isOptionEqualToValue={(option, value) =>
                option.type === value.type && option.id === value.id
              }
              disabled={!canManage || saving}
              renderInput={params => (
                <TextField
                  {...params}
                  label={`Vincular ${linkTab === "ticket" ? "ticket" : "contacto"} (opcional)`}
                  placeholder="Buscar por nombre o número"
                />
              )}
              noOptionsText={
                search.trim().length < 2 ? "Escribí al menos 2 caracteres" : "Sin resultados"
              }
            />
            {selectedLink && canManage && (
              <Button
                size="small"
                onClick={() => {
                  setSelectedLink(null);
                  setSearch("");
                }}
                sx={{ mt: 0.5 }}
              >
                Quitar vínculo
              </Button>
            )}
          </div>

          <TextField
            label="Comentario (opcional)"
            value={form.notes}
            onChange={event => setForm({ ...form, notes: event.target.value })}
            inputProps={{ maxLength: 150 }}
            helperText={`${form.notes.length}/150`}
            multiline
            minRows={2}
            disabled={!canManage || saving}
            fullWidth
          />
          {reminder?.createdBy?.name && (
            <Typography variant="caption" color="text.secondary">
              Creado por {reminder.createdBy.name}
            </Typography>
          )}
          {reminder && !canManage && (
            <Typography variant="caption" color="text.secondary">
              Solo quien lo creó o un administrador puede editarlo.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {reminder && canManage && (
          <Button color="error" onClick={handleDelete} disabled={saving}>
            Eliminar
          </Button>
        )}
        <span style={{ flex: 1 }} />
        <Button onClick={onClose} disabled={saving}>
          Cerrar
        </Button>
        {canManage && (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.date || !form.time}
          >
            Guardar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ReminderModal;
