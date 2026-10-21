import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from "@mui/material";
import { format } from "date-fns";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSound from "use-sound";
import alarmSound from "../../assets/reminder-alarm.wav";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import openSocket from "../../services/socket-io";

const ReminderAlarm = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [play] = useSound(alarmSound, { volume: 0.8 });
  const playRef = useRef(play);
  const seenNotifications = useRef(new Set());
  const current = queue[0];

  useEffect(() => {
    playRef.current = play;
  }, [play]);

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return undefined;

    const handleReminder = reminder => {
      if (!reminder || reminder.status === "done") return;

      const notifiedAt = reminder.notifiedAt || reminder.dueAt;
      const notificationKey = `${reminder.id}:${new Date(notifiedAt).getTime()}`;
      if (seenNotifications.current.has(notificationKey)) return;
      seenNotifications.current.add(notificationKey);

      setQueue(previous => {
        if (previous.some(item => item.id === reminder.id)) return previous;
        return [...previous, reminder];
      });

      const soundEnabled =
        typeof localStorage === "undefined" ||
        localStorage.getItem("userAudioEnabled") !== "false";
      if (soundEnabled) {
        try {
          playRef.current();
        } catch (error) {
          console.error("No se pudo reproducir la alarma del recordatorio", error);
        }
      }

      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        document.hidden
      ) {
        try {
          const notification = new Notification("Recordatorio", {
            body: `${format(new Date(reminder.dueAt), "HH:mm")} — ${reminder.title}`,
            tag: `reminder-${reminder.id}`,
            renotify: true
          });

          notification.onclick = event => {
            event.preventDefault();
            notification.close();
            window.focus();
            if (reminder.ticketId) {
              navigate(`/tickets/${reminder.ticketId}`);
            } else if (reminder.contactId) {
              navigate("/contacts");
            }
          };
        } catch (error) {
          console.error("No se pudo mostrar la notificación del recordatorio", error);
        }
      }
    };

    const handleReminderUpdate = event => {
      if (!event?.reminder?.id || event.action === "create") return;
      if (
        event.action === "delete" ||
        event.reminder.status === "done" ||
        !event.reminder.notifiedAt ||
        new Date(event.reminder.dueAt).getTime() > Date.now()
      ) {
        setQueue(previous =>
          previous.filter(reminder => reminder.id !== event.reminder.id)
        );
        return;
      }

      setQueue(previous =>
        previous.map(reminder =>
          reminder.id === event.reminder.id
            ? { ...reminder, ...event.reminder }
            : reminder
        )
      );
    };

    socket.on("reminder", handleReminder);
    socket.on("reminderUpdate", handleReminderUpdate);

    return () => {
      socket.off("reminder", handleReminder);
      socket.off("reminderUpdate", handleReminderUpdate);
    };
  }, [navigate]);

  const dismiss = reminderId => {
    setQueue(previous => previous.filter(reminder => reminder.id !== reminderId));
  };

  const openLink = () => {
    if (current?.ticketId) {
      navigate(`/tickets/${current.ticketId}`);
    } else if (current?.contactId) {
      navigate("/contacts");
    }
    dismiss(current.id);
  };

  const markDone = async () => {
    if (!current) return;

    try {
      await api.patch(`/reminders/${current.id}/status`, { status: "done" });
      dismiss(current.id);
    } catch (error) {
      toastError(error);
    }
  };

  const snooze = async minutes => {
    if (!current) return;

    try {
      await api.post(`/reminders/${current.id}/snooze`, { minutes });
      dismiss(current.id);
    } catch (error) {
      toastError(error);
    }
  };

  if (!current) return null;

  return (
    <Dialog open onClose={() => {}} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <span role="img" aria-label="Alarma">⏰</span>
        Recordatorio
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          <Typography variant="h6">{current.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {format(new Date(current.dueAt), "dd/MM/yyyy HH:mm")}
          </Typography>
          {current.notes && <Typography variant="body2">{current.notes}</Typography>}
          {current.ticketId && (
            <Typography variant="caption" color="text.secondary">
              Ticket #{current.ticketId}
            </Typography>
          )}
          {!current.ticketId && current.contactId && (
            <Typography variant="caption" color="text.secondary">
              Contacto asociado
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 0.5, p: 2 }}>
        {(current.ticketId || current.contactId) && (
          <Button onClick={openLink}>Abrir</Button>
        )}
        <Button onClick={() => snooze(5)}>5 min</Button>
        <Button onClick={() => snooze(15)}>15 min</Button>
        <Button onClick={() => snooze(60)}>60 min</Button>
        <Button variant="contained" onClick={markDone}>
          Listo
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReminderAlarm;
