// Ecuador continental usa UTC-5 todo el año (sin horario de verano).
export const ZONA = "America/Guayaquil";
export const OFFSET = "-05:00";
const OFFSET_MS = 5 * 60 * 60 * 1000;

/** Fecha de hoy en Ecuador como "YYYY-MM-DD". */
export function hoyEcuador(ahora: Date = new Date()): string {
  return new Date(ahora.getTime() - OFFSET_MS).toISOString().slice(0, 10);
}

/** Suma días a una fecha "YYYY-MM-DD". */
export function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Día de la semana (0 = domingo) de una fecha "YYYY-MM-DD". */
export function diaSemana(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "09:00" o "09:00:00" -> minutos desde medianoche. */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** Minutos desde medianoche -> "HH:MM". */
export function aHora(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Instante (Date) de una fecha + minutos, en hora de Ecuador. */
export function instante(fecha: string, min: number): Date {
  return new Date(`${fecha}T${aHora(min)}:00${OFFSET}`);
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function fechaLarga(fecha: string): string {
  const [, m, d] = fecha.split("-").map(Number);
  return `${DIAS[diaSemana(fecha)]} ${d} de ${MESES[m - 1]}`;
}

export function fechaCorta(fecha: string) {
  const [, m, d] = fecha.split("-").map(Number);
  return { dia: DIAS_CORTOS[diaSemana(fecha)], numero: d, mes: MESES_CORTOS[m - 1] };
}

/** "14:30" -> "2:30 p. m." */
export function hora12(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const sufijo = h < 12 ? "a. m." : "p. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

export function duracionTexto(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return h === 1 ? "1 hora" : `${h} horas`;
  return `${h} h ${m} min`;
}

/** ISO -> "YYYY-MM-DD" en hora de Ecuador. */
export function fechaDe(iso: string): string {
  return new Date(new Date(iso).getTime() - OFFSET_MS).toISOString().slice(0, 10);
}

/** ISO -> minutos desde medianoche en hora de Ecuador. */
export function minutosDe(iso: string): number {
  const d = new Date(new Date(iso).getTime() - OFFSET_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Lunes de la semana de una fecha "YYYY-MM-DD". */
export function lunesDe(fecha: string): string {
  const ds = diaSemana(fecha);
  return sumarDias(fecha, ds === 0 ? -6 : 1 - ds);
}
