import { aMinutos, diaSemana, hoyEcuador, instante, sumarDias } from "./tiempo";
import type { Horario, Ocupado, Profesional } from "./tipos";

/** Cada cuánto se ofrecen horas (minutos). */
export const INTERVALO_MIN = 30;
/** Anticipación mínima para reservar (minutos). */
export const ANTICIPACION_MIN = 60;
export const DIAS_A_MOSTRAR = 30;

/** Próximos días abiertos, empezando hoy. */
export function diasDisponibles(horarios: Horario[], ahora: Date = new Date()): string[] {
  const hoy = hoyEcuador(ahora);
  const porDia = new Map(horarios.map((h) => [h.dia_semana, h]));
  const dias: string[] = [];
  for (let i = 0; i < DIAS_A_MOSTRAR; i++) {
    const fecha = sumarDias(hoy, i);
    const h = porDia.get(diaSemana(fecha));
    if (h && !h.cerrado && h.abre && h.cierra) dias.push(fecha);
  }
  return dias;
}

export type Turno = {
  /** minutos desde medianoche */
  inicio: number;
  /** profesionales libres para este turno */
  libres: string[];
};

/**
 * Turnos libres de un día para un servicio de `duracion` minutos.
 * `elegida` = id de la profesional, o null para "Cualquiera".
 */
export function turnosDelDia(opts: {
  fecha: string;
  horario: Horario | undefined;
  duracion: number;
  profesionales: Profesional[];
  ocupados: Ocupado[];
  elegida: string | null;
  ahora?: Date;
}): Turno[] {
  const { fecha, horario, duracion, profesionales, ocupados, elegida } = opts;
  const ahora = opts.ahora ?? new Date();
  if (!horario || horario.cerrado || !horario.abre || !horario.cierra) return [];

  const candidatas = elegida ? profesionales.filter((p) => p.id === elegida) : profesionales;
  const abre = aMinutos(horario.abre);
  const cierra = aMinutos(horario.cierra);
  const limite = ahora.getTime() + ANTICIPACION_MIN * 60_000;

  const ocupadosPor = new Map<string, { ini: number; fin: number }[]>();
  for (const o of ocupados) {
    // Un bloqueo sin profesional (feriado, cierre) aplica a todas.
    const ids = o.profesional_id ? [o.profesional_id] : profesionales.map((p) => p.id);
    for (const id of ids) {
      const lista = ocupadosPor.get(id) ?? [];
      lista.push({ ini: new Date(o.inicio).getTime(), fin: new Date(o.fin).getTime() });
      ocupadosPor.set(id, lista);
    }
  }

  const turnos: Turno[] = [];
  for (let t = abre; t + duracion <= cierra; t += INTERVALO_MIN) {
    const ini = instante(fecha, t).getTime();
    const fin = ini + duracion * 60_000;
    if (ini < limite) continue;
    const libres = candidatas
      .filter((p) => !(ocupadosPor.get(p.id) ?? []).some((o) => o.ini < fin && o.fin > ini))
      .map((p) => p.id);
    if (libres.length) turnos.push({ inicio: t, libres });
  }
  return turnos;
}

/** Con "Cualquiera": la profesional libre con menos citas ese día. */
export function asignarProfesional(libres: string[], ocupados: Ocupado[]): string {
  const carga = (id: string) => ocupados.filter((o) => o.profesional_id === id).length;
  return [...libres].sort((a, b) => carga(a) - carga(b))[0];
}
