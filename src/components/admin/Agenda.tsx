"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  OFFSET,
  duracionTexto,
  fechaCorta,
  fechaDe,
  fechaLarga,
  hoyEcuador,
  hora12,
  lunesDe,
  minutosDe,
  sumarDias,
} from "@/lib/tiempo";
import { Adelante, Atras, WhatsApp } from "../Iconos";

type Cita = {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  cliente_nombre: string;
  cliente_telefono: string;
  servicios: { nombre: string; duracion_min: number } | null;
  profesionales: { nombre: string } | null;
};

export default function Agenda() {
  const [vista, setVista] = useState<"dia" | "semana">("dia");
  const [fecha, setFecha] = useState(hoyEcuador());
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verCanceladas, setVerCanceladas] = useState(false);

  const desde = vista === "dia" ? fecha : lunesDe(fecha);
  const hasta = sumarDias(desde, vista === "dia" ? 1 : 7);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase()
      .from("citas")
      .select("id,inicio,fin,estado,cliente_nombre,cliente_telefono,servicios(nombre,duracion_min),profesionales(nombre)")
      .gte("inicio", `${desde}T00:00:00${OFFSET}`)
      .lt("inicio", `${hasta}T00:00:00${OFFSET}`)
      .order("inicio");
    setCargando(false);
    if (error) return setError(error.message);
    setError(null);
    setCitas((data ?? []) as unknown as Cita[]);
  }, [desde, hasta]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 60_000);
    return () => clearInterval(t);
  }, [cargar]);

  async function cancelar(c: Cita) {
    if (!confirm(`¿Cancelar la cita de ${c.cliente_nombre}? La hora quedará libre.`)) return;
    const { error } = await supabase().from("citas").update({ estado: "cancelada" }).eq("id", c.id);
    if (error) return alert("No se pudo cancelar: " + error.message);
    cargar();
  }

  const visibles = citas.filter((c) => verCanceladas || c.estado !== "cancelada");
  const porDia = useMemo(() => {
    const m = new Map<string, Cita[]>();
    for (const c of visibles) m.set(fechaDe(c.inicio), [...(m.get(fechaDe(c.inicio)) ?? []), c]);
    return m;
  }, [visibles]);
  const dias = vista === "dia" ? [fecha] : Array.from({ length: 7 }, (_, i) => sumarDias(desde, i));
  const activas = citas.filter((c) => c.estado !== "cancelada").length;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="vidrio flex rounded-full p-1 text-sm">
          {(["dia", "semana"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`rounded-full px-4 py-1.5 ${vista === v ? "bg-oscuro text-hueso" : "text-cafe/70"}`}
            >
              {v === "dia" ? "Día" : "Semana"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setFecha(sumarDias(fecha, vista === "dia" ? -1 : -7))} className="flecha vidrio size-9" aria-label="Anterior">
            <Atras className="size-4" />
          </button>
          <button onClick={() => setFecha(hoyEcuador())} className="vidrio rounded-full px-3 py-2 text-xs">
            Hoy
          </button>
          <button onClick={() => setFecha(sumarDias(fecha, vista === "dia" ? 1 : 7))} className="flecha vidrio size-9" aria-label="Siguiente">
            <Adelante className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-3xl text-cafe first-letter:uppercase">
            {vista === "dia" ? fechaLarga(fecha) : `Semana del ${fechaCorta(desde).numero} ${fechaCorta(desde).mes}`}
          </h2>
          <p className="text-sm text-cafe/55">
            {activas} {activas === 1 ? "cita" : "citas"}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs whitespace-nowrap text-cafe/60">
          <input type="checkbox" checked={verCanceladas} onChange={(e) => setVerCanceladas(e.target.checked)} />
          Ver canceladas
        </label>
      </div>

      {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {cargando && !citas.length && <p className="py-10 text-center text-cafe/50">Cargando…</p>}

      <div className="mt-4 space-y-6">
        {dias.map((d) => {
          const lista = porDia.get(d) ?? [];
          if (vista === "semana" && !lista.length) return null;
          return (
            <section key={d}>
              {vista === "semana" && (
                <h3 className="mb-2 text-[11px] font-medium tracking-[0.25em] text-acento uppercase">{fechaLarga(d)}</h3>
              )}
              {!lista.length ? (
                <p className="vidrio rounded-3xl py-10 text-center text-sm text-cafe/55">Sin citas este día.</p>
              ) : (
                <ul className="space-y-2">
                  {lista.map((c) => (
                    <FilaCita key={c.id} c={c} onCancelar={() => cancelar(c)} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
        {vista === "semana" && !visibles.length && !cargando && (
          <p className="vidrio rounded-3xl py-10 text-center text-sm text-cafe/55">Sin citas esta semana.</p>
        )}
      </div>
    </div>
  );
}

function FilaCita({ c, onCancelar }: { c: Cita; onCancelar: () => void }) {
  const ini = minutosDe(c.inicio);
  const fin = minutosDe(c.fin);
  const cancelada = c.estado === "cancelada";
  const tel = "593" + c.cliente_telefono.replace(/^0/, "");
  return (
    <li className={`vidrio flex gap-4 rounded-3xl p-4 ${cancelada ? "opacity-50" : ""}`}>
      <div className="w-16 shrink-0 border-r border-acento/25 pr-3 text-right">
        <p className="font-serif text-xl leading-tight text-cafe">{hora12(ini).replace(/ [ap]\. m\./, "")}</p>
        <p className="text-[10px] text-cafe/50">{hora12(ini).slice(-5)}</p>
        <p className="mt-1 text-[10px] text-cafe/40">hasta {hora12(fin).replace(/ ([ap])\. m\./, "$1m")}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-medium text-cafe ${cancelada ? "line-through" : ""}`}>{c.cliente_nombre}</p>
          <span className="shrink-0 rounded-full bg-arena px-2.5 py-0.5 text-[11px] text-cafe">
            {c.profesionales?.nombre ?? "—"}
          </span>
        </div>
        <p className="text-sm text-cafe/65">
          {c.servicios?.nombre} · {duracionTexto(c.servicios?.duracion_min ?? 0)}
        </p>
        <div className="mt-2.5 flex items-center gap-3">
          <a
            href={`https://wa.me/${tel}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-oscuro px-3 py-1.5 text-xs text-hueso"
          >
            <WhatsApp className="size-3.5" /> {c.cliente_telefono}
          </a>
          {cancelada ? (
            <span className="text-xs text-cafe/50">Cancelada</span>
          ) : (
            <button onClick={onCancelar} className="text-xs text-cafe/60 underline underline-offset-4">
              Cancelar
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
