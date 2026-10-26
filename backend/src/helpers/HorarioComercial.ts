/**
 * Horario de atención: lunes a viernes de 9 a 18, hora de Argentina.
 *
 * Se resuelve con la zona horaria America/Argentina/Buenos_Aires y no con la
 * hora del servidor: la VM corre en UTC, así que `new Date().getHours()` daría
 * tres horas de más (a las 9 de Argentina devolvería 12).
 */
const ZONA = "America/Argentina/Buenos_Aires";
const ABRE_A = 9;
const CIERRA_A = 18;
const DIAS_HABILES = ["Mon", "Tue", "Wed", "Thu", "Fri"];

interface Momento {
  dia: string;
  minutos: number;
}

const momentoEnArgentina = (ahora: Date): Momento => {
  const formato = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });

  const partes: Record<string, string> = {};
  formato.formatToParts(ahora).forEach(parte => {
    partes[parte.type] = parte.value;
  });

  return {
    dia: partes.weekday,
    minutos: Number(partes.hour) * 60 + Number(partes.minute)
  };
};

/**
 * true si `ahora` cae dentro del horario de atención.
 * El cierre es a las 18:00 en punto: 18:00 y 18:01 ya están fuera de horario.
 */
export const estaEnHorarioComercial = (ahora: Date = new Date()): boolean => {
  const { dia, minutos } = momentoEnArgentina(ahora);

  if (!DIAS_HABILES.includes(dia)) {
    return false;
  }

  return minutos >= ABRE_A * 60 && minutos < CIERRA_A * 60;
};

/** Texto del horario, para logs y mensajes. */
export const HORARIO_TEXTO = "lunes a viernes de 9 a 18 h";

/** Día y hora en Argentina, para logs. */
export const describirMomento = (ahora: Date = new Date()): string => {
  const { dia, minutos } = momentoEnArgentina(ahora);
  const horas = String(Math.floor(minutos / 60)).padStart(2, "0");
  const mins = String(minutos % 60).padStart(2, "0");
  return `${dia} ${horas}:${mins} (ART)`;
};
