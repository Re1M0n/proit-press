import AddIcon from "@mui/icons-material/Add";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths
} from "date-fns";
import { es } from "date-fns/locale";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import ReminderModal from "../../components/ReminderModal";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import openSocket from "../../services/socket-io";

const CalendarGrid = styled("div")(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  borderTop: `1px solid ${theme.palette.divider}`,
  borderLeft: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  overflow: "hidden"
}));

const DayCell = styled("div", {
  shouldForwardProp: prop => !["outside", "selected", "hasOverdue"].includes(prop)
})(({ theme, outside, selected, hasOverdue }) => ({
  minWidth: 0,
  minHeight: 96,
  padding: theme.spacing(0.75),
  border: 0,
  borderRight: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderLeft: hasOverdue ? `3px solid ${theme.palette.error.main}` : undefined,
  backgroundColor: selected
    ? theme.palette.action.selected
    : outside
      ? theme.palette.action.hover
      : theme.palette.background.paper,
  color: outside ? theme.palette.text.disabled : theme.palette.text.primary,
  textAlign: "left",
  font: "inherit",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: theme.spacing(0.5),
  "&:hover": { backgroundColor: theme.palette.action.hover },
  [theme.breakpoints.down("sm")]: {
    minHeight: 74,
    padding: theme.spacing(0.5)
  }
}));

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const toDateKey = date => format(date, "yyyy-MM-dd");
const formatReminderTime = reminder => format(new Date(reminder.dueAt), "HH:mm");

const Reminders = () => {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(toDateKey(new Date()));
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const fetchSequence = useRef(0);

  const fetchReminders = useCallback(async () => {
    const sequence = ++fetchSequence.current;
    setLoading(true);
    try {
      const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
      const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
      const { data } = await api.get("/reminders", {
        params: { from: gridStart.toISOString(), to: gridEnd.toISOString() }
      });
      if (sequence === fetchSequence.current) setReminders(data);
    } catch (error) {
      if (sequence === fetchSequence.current) toastError(error);
    } finally {
      if (sequence === fetchSequence.current) setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return undefined;
    const handleReminderUpdate = () => fetchReminders();

    socket.on("reminderUpdate", handleReminderUpdate);
    return () => socket.off("reminderUpdate", handleReminderUpdate);
  }, [fetchReminders]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const remindersByDay = useMemo(() => {
    const grouped = new Map();
    reminders.forEach(reminder => {
      const key = toDateKey(new Date(reminder.dueAt));
      const dayReminders = grouped.get(key) || [];
      dayReminders.push(reminder);
      grouped.set(key, dayReminders);
    });
    return grouped;
  }, [reminders]);

  const selectedReminders = remindersByDay.get(selectedDay) || [];
  const now = new Date();

  const navigateMonth = direction => {
    const nextMonth = startOfMonth(
      direction < 0 ? subMonths(month, 1) : addMonths(month, 1)
    );
    setMonth(nextMonth);
    setSelectedDay(toDateKey(nextMonth));
  };

  const goToToday = () => {
    const today = new Date();
    setMonth(startOfMonth(today));
    setSelectedDay(toDateKey(today));
  };

  const requestPermission = async () => {
    if (typeof Notification === "undefined") {
      toast.info("Este navegador no soporta notificaciones del sistema.");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        toast.success("Notificaciones del navegador activadas.");
      } else if (result === "denied") {
        toast.info("El navegador bloqueó las notificaciones. La alarma del panel seguirá activa.");
      }
    } catch (error) {
      toastError(error);
    }
  };

  const openCreateModal = () => {
    setEditingReminder(null);
    setModalOpen(true);
  };

  const openReminder = reminder => {
    setEditingReminder(reminder);
    setModalOpen(true);
  };

  const markDone = async reminderId => {
    try {
      await api.patch(`/reminders/${reminderId}/status`, { status: "done" });
      await fetchReminders();
    } catch (error) {
      toastError(error);
    }
  };

  const selectDay = day => {
    setSelectedDay(toDateKey(day));
    if (!isSameMonth(day, month)) {
      setMonth(startOfMonth(day));
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, height: "100%", overflowY: "auto" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Recordatorios
        </Typography>
        <Box sx={{ flex: 1 }} />
        {permission !== "granted" && permission !== "unsupported" && (
          <Tooltip title="Avisarme aunque el panel esté en segundo plano">
            <Button
              size="small"
              startIcon={<NotificationsActiveIcon />}
              onClick={requestPermission}
              variant="outlined"
            >
              Activar notificaciones
            </Button>
          </Tooltip>
        )}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateModal}
        >
          Nuevo recordatorio
        </Button>
      </Stack>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "flex-start",
          flexDirection: { xs: "column", lg: "row" }
        }}
      >
        <Paper variant="outlined" sx={{ flex: 2, width: "100%", p: { xs: 1, sm: 1.5 } }}>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1.5 }}>
            <IconButton
              size="small"
              aria-label="Mes anterior"
              onClick={() => navigateMonth(-1)}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography
              variant="h6"
              sx={{
                textTransform: "capitalize",
                minWidth: { xs: 135, sm: 175 },
                textAlign: "center",
                fontSize: { xs: "1rem", sm: "1.25rem" }
              }}
            >
              {format(month, "MMMM yyyy", { locale: es })}
            </Typography>
            <IconButton
              size="small"
              aria-label="Mes siguiente"
              onClick={() => navigateMonth(1)}
            >
              <ChevronRightIcon />
            </IconButton>
            <Button size="small" onClick={goToToday}>
              Hoy
            </Button>
            <Box sx={{ flex: 1 }} />
            {loading && <CircularProgress size={18} />}
          </Stack>

          <CalendarGrid>
            {weekdays.map(day => (
              <Typography
                key={day}
                variant="caption"
                sx={{
                  p: { xs: 0.5, sm: 1 },
                  fontWeight: 700,
                  textAlign: "center",
                  backgroundColor: "action.hover",
                  borderRight: theme => `1px solid ${theme.palette.divider}`,
                  borderBottom: theme => `1px solid ${theme.palette.divider}`
                }}
              >
                {day}
              </Typography>
            ))}
            {days.map(day => {
              const dayKey = toDateKey(day);
              const dayReminders = remindersByDay.get(dayKey) || [];
              const hasOverdue = dayReminders.some(
                reminder =>
                  reminder.status === "pending" && new Date(reminder.dueAt) < now
              );

              return (
                <DayCell
                  key={dayKey}
                  role="button"
                  tabIndex={0}
                  outside={!isSameMonth(day, month)}
                  selected={dayKey === selectedDay}
                  hasOverdue={hasOverdue}
                  onClick={() => selectDay(day)}
                  onKeyDown={event => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectDay(day);
                    }
                  }}
                  aria-label={`${format(day, "d MMMM", { locale: es })}, ${dayReminders.length} recordatorios`}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      alignSelf: "flex-start",
                      fontWeight: dayKey === toDateKey(now) ? 800 : 500,
                      color: dayKey === toDateKey(now) ? "primary.main" : "inherit"
                    }}
                  >
                    {format(day, "d")}
                  </Typography>
                  {dayReminders.slice(0, 3).map(reminder => (
                    <Chip
                      key={reminder.id}
                      size="small"
                      label={`${formatReminderTime(reminder)} ${reminder.title}`}
                      color={
                        reminder.status === "done"
                          ? "default"
                          : new Date(reminder.dueAt) < now
                            ? "error"
                            : "primary"
                      }
                      variant={reminder.status === "done" ? "outlined" : "filled"}
                      onClick={event => {
                        event.stopPropagation();
                        openReminder(reminder);
                      }}
                      sx={{
                        maxWidth: "100%",
                        height: { xs: 20, sm: 24 },
                        justifyContent: "flex-start",
                        "& .MuiChip-label": {
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          px: 0.75,
                          fontSize: { xs: "0.62rem", sm: "0.72rem" }
                        }
                      }}
                    />
                  ))}
                  {dayReminders.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      +{dayReminders.length - 3} más
                    </Typography>
                  )}
                </DayCell>
              );
            })}
          </CalendarGrid>
        </Paper>

        <Paper
          variant="outlined"
          sx={{ p: 2, flex: 1, width: "100%", minWidth: { lg: 300 }, minHeight: 250 }}
        >
          <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, textTransform: "capitalize", flex: 1 }}
            >
              {format(new Date(`${selectedDay}T12:00:00`), "EEEE d 'de' MMMM", {
                locale: es
              })}
            </Typography>
            <Tooltip title="Crear recordatorio para este día">
              <IconButton size="small" onClick={openCreateModal}>
                <AddIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          {selectedReminders.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin recordatorios para este día.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {selectedReminders.map(reminder => {
                const overdue =
                  reminder.status === "pending" && new Date(reminder.dueAt) < now;

                return (
                  <Paper
                    key={reminder.id}
                    variant="outlined"
                    sx={{
                      p: 1.25,
                      borderLeft: theme =>
                        `3px solid ${
                          reminder.status === "done"
                            ? theme.palette.success.main
                            : overdue
                              ? theme.palette.error.main
                              : theme.palette.primary.main
                        }`
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 42 }}>
                        {formatReminderTime(reminder)}
                      </Typography>
                      <Button
                        color="inherit"
                        onClick={() => openReminder(reminder)}
                        sx={{
                          p: 0,
                          flex: 1,
                          justifyContent: "flex-start",
                          textAlign: "left",
                          textTransform: "none",
                          minWidth: 0,
                          textDecoration:
                            reminder.status === "done" ? "line-through" : "none"
                        }}
                      >
                        <Typography variant="body2" noWrap>
                          {reminder.title}
                        </Typography>
                      </Button>
                      {reminder.status === "pending" && (
                        <Tooltip title="Marcar como listo">
                          <IconButton
                            size="small"
                            aria-label="Marcar como listo"
                            onClick={() => markDone(reminder.id)}
                          >
                            <CheckCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Creado por {reminder.createdBy?.name || "—"}
                      {reminder.ticket ? ` · Ticket #${reminder.ticket.id}` : ""}
                      {reminder.contact ? ` · ${reminder.contact.name}` : ""}
                      {reminder.recurrence !== "none"
                        ? ` · Repite ${reminder.recurrence}`
                        : ""}
                      {overdue ? " · Vencido" : ""}
                    </Typography>
                    {reminder.notes && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {reminder.notes}
                      </Typography>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Paper>
      </Box>

      <ReminderModal
        open={modalOpen}
        reminder={editingReminder}
        defaultDate={selectedDay}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          fetchReminders();
        }}
      />
    </Box>
  );
};

export default Reminders;
