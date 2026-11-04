"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Horario } from "@/lib/tipos";

const NOMBRES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ORDEN = [1, 2, 3, 4, 5, 6, 0];

export default function HorarioEditor() {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    supabase()
      .from("horarios")
      .select("*")
      .then(({ data, error }) => (error ? setMensaje(error.message) : setHorarios(data as Horario[])));
  }, []);

  const cambiar = (dia: number, c: Partial<Horario>) =>
    setHorarios((hs) => hs.map((h) => (h.dia_semana === dia ? { ...h, ...c } : h)));

  async function guardar() {
    for (const h of horarios) {
      if (!h.cerrado && (!h.abre || !h.cierra || h.abre >= h.cierra))
        return setMensaje(`Revisa el ${NOMBRES[h.dia_semana]}: la hora de cierre debe ser después de la de apertura.`);
    }
    setGuardando(true);
    const db = supabase();
    const resultados = await Promise.all(
      horarios.map((h) =>
        db
          .from("horarios")
          .update({ abre: h.cerrado ? null : h.abre, cierra: h.cerrado ? null : h.cierra, cerrado: h.cerrado })
          .eq("dia_semana", h.dia_semana),
      ),
    );
    setGuardando(false);
    const error = resultados.find((r) => r.error)?.error;
    setMensaje(error ? "Error: " + error.message : "Horario guardado. Ya se refleja en la página de reservas.");
  }

  return (
    <div>
      <h2 className="font-serif text-3xl text-cafe">Horario de atención</h2>
      <p className="text-sm text-cafe/55">Las clientas solo ven horas dentro de este horario.</p>
      {mensaje && <p className="mt-3 rounded-2xl bg-white/70 px-4 py-2.5 text-sm text-cafe">{mensaje}</p>}

      <ul className="vidrio mt-4 divide-y divide-acento/20 rounded-3xl px-4">
        {ORDEN.map((d) => {
          const h = horarios.find((x) => x.dia_semana === d);
          if (!h) return null;
          return (
            <li key={d} className="py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-cafe">{NOMBRES[d]}</span>
                <button
                  type="button"
                  onClick={() =>
                    cambiar(d, { cerrado: !h.cerrado, abre: h.abre ?? "09:00", cierra: h.cierra ?? "18:00" })
                  }
                  className={`relative h-6 w-11 rounded-full transition ${h.cerrado ? "bg-acento/30" : "bg-oscuro"}`}
                  aria-label={h.cerrado ? "Abrir" : "Cerrar"}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${h.cerrado ? "left-0.5" : "left-[1.375rem]"}`}
                  />
                </button>
              </div>
              {h.cerrado ? (
                <p className="mt-1 text-sm text-cafe/45">Cerrado</p>
              ) : (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    step={1800}
                    value={h.abre?.slice(0, 5) ?? ""}
                    onChange={(e) => cambiar(d, { abre: e.target.value })}
                    className="campo min-w-0 flex-1 px-3 py-2"
                  />
                  <span className="text-cafe/50">a</span>
                  <input
                    type="time"
                    step={1800}
                    value={h.cierra?.slice(0, 5) ?? ""}
                    onChange={(e) => cambiar(d, { cierra: e.target.value })}
                    className="campo min-w-0 flex-1 px-3 py-2"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button
        onClick={guardar}
        disabled={guardando || !horarios.length}
        className="mt-4 w-full rounded-full bg-oscuro py-3.5 font-medium text-hueso disabled:opacity-50"
      >
        {guardando ? "Guardando…" : "Guardar horario"}
      </button>
    </div>
  );
}
