export type Profesional = { id: string; nombre: string; activa: boolean };

export type Servicio = {
  id: string;
  categoria: string;
  nombre: string;
  duracion_min: number;
  precio: number | null;
  activo: boolean;
};

export type Horario = {
  dia_semana: number;
  abre: string | null;
  cierra: string | null;
  cerrado: boolean;
};

export type Ocupado = { profesional_id: string | null; inicio: string; fin: string };
