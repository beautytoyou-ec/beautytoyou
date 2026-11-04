"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profesional } from "@/lib/tipos";
import { OFFSET, fechaDe, fechaLarga, hoyEcuador, hora12, minutosDe, sumarDias } from "@/lib/tiempo";

type Bloqueo = { id: string; profesional_id: string | null; inicio: string; fin: string; motivo: string | null };

export default function Bloqueos() {
  const [lista, setLista] = useState<Bloqueo[]>([]);
  const [pros, setPros] = useState<Profesional[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const hoy = hoyEcuador();
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [todoDia, setTodoDia] = useState(true);
  const [horaDesde, setHoraDesde] = useState("13:00");
  const [horaHasta, setHoraHasta] = useState("15:00");
  const [quien, setQuien] = useState("");
  const [motivo, setMotivo] = useState("");

  const cargar = useCallback(async () => {
    const db = supabase();
    const [b, p] = await Promise.all([
      db.from("bloqueos").select("*").gte("fin", new Date().toISOString()).order("inicio"),
      db.from("profesionales").select("*").order("nombre"),
    ]);
    if (b.error) return setMensaje(b.error.message);
    setLista(b.data as Bloqueo[]);
    setPros((p.data ?? []) as Profesional[]);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    const fin = todoDia ? hasta : desde;
    if (fin < desde) return setMensaje("La fecha final debe ser igual o posterior a la inicial.");
    if (!todoDia && horaHasta <= horaDesde) return setMensaje("La hora final debe ser después de la inicial.");
    const inicio = todoDia ? `${desde}T00:00:00${OFFSET}` : `${desde}T${horaDesde}:00${OFFSET}`;
    const termina = todoDia ? `${sumarDias(hasta, 1)}T00:00:00${OFFSET}` : `${desde}T${horaHasta}:00${OFFSET}`;
    const { error } = await supabase()
      .from("bloqueos")
      .insert({ profesional_id: quien || null, inicio, fin: termina, motivo: motivo.trim() || null });
    setMensaje(error ? "Error: " + error.message : "Bloqueo creado. Esas horas ya no se ofrecen.");
    if (!error) {
      setMotivo("");
      cargar();
    }
  }

  async function borrar(b: Bloqueo) {
    if (!confirm("¿Quitar este bloqueo? Esas horas volverán a estar disponibles.")) return;
    const { error } = await supabase().from("bloqueos").delete().eq("id", b.id);
    if (error) return setMensaje("Error: " + error.message);
    cargar();
  }

  const nombre = (id: string | null) => (id ? pros.find((p) => p.id === id)?.nombre ?? "—" : "Todo el estudio");

  const describir = (b: Bloqueo) => {
    const d1 = fechaDe(b.inicio);
    const m1 = minutosDe(b.inicio);
    const m2 = minutosDe(b.fin);
    const d2 = fechaDe(new Date(new Date(b.fin).getTime() - 1).toISOString());
    if (m1 === 0 && m2 === 0) return d1 === d2 ? fechaLarga(d1) : `${fechaLarga(d1)} al ${fechaLarga(d2)}`;
    return `${fechaLarga(d1)}, ${hora12(m1)} – ${hora12(m2)}`;
  };

  return (
    <div>
      <h2 className="font-serif text-3xl text-cafe">Bloqueos</h2>
      <p className="text-sm text-cafe/55">Feriados, vacaciones, permisos o un rato libre.</p>
      {mensaje && <p className="mt-3 rounded-2xl bg-white/70 px-4 py-2.5 text-sm text-cafe">{mensaje}</p>}

      <form onSubmit={crear} className="vidrio mt-4 space-y-3 rounded-3xl p-4">
        <div className="vidrio flex rounded-full p-1 text-sm">
          {[true, false].map((v) => (
            <button
              type="button"
              key={String(v)}
              onClick={() => setTodoDia(v)}
              className={`flex-1 rounded-full py-1.5 ${todoDia === v ? "bg-oscuro text-hueso" : "text-cafe/70"}`}
            >
              {v ? "Días completos" : "Unas horas"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-cafe/60">
            {todoDia ? "Desde" : "Día"}
            <input type="date" min={hoy} value={desde} onChange={(e) => { setDesde(e.target.value); if (hasta < e.target.value) setHasta(e.target.value); }} className="campo mt-1 py-2" />
          </label>
          {todoDia ? (
            <label className="text-xs text-cafe/60">
              Hasta
              <input type="date" min={desde} value={hasta} onChange={(e) => setHasta(e.target.value)} className="campo mt-1 py-2" />
            </label>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              <label className="text-xs text-cafe/60">
                De
                <input type="time" value={horaDesde} onChange={(e) => setHoraDesde(e.target.value)} className="campo mt-1 px-2 py-2" />
              </label>
              <label className="text-xs text-cafe/60">
                A
                <input type="time" value={horaHasta} onChange={(e) => setHoraHasta(e.target.value)} className="campo mt-1 px-2 py-2" />
              </label>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-cafe/60">
            Quién
            <select value={quien} onChange={(e) => setQuien(e.target.value)} className="campo mt-1 py-2">
              <option value="">Todo el estudio</option>
              {pros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-cafe/60">
            Motivo
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Feriado…" className="campo mt-1 py-2" />
          </label>
        </div>
        <button className="w-full rounded-full bg-oscuro py-3 text-sm font-medium text-hueso">Crear bloqueo</button>
      </form>

      <h3 className="mt-6 mb-2 text-[11px] font-medium tracking-[0.25em] text-acento uppercase">Próximos bloqueos</h3>
      {!lista.length ? (
        <p className="vidrio rounded-3xl py-8 text-center text-sm text-cafe/55">No hay bloqueos.</p>
      ) : (
        <ul className="space-y-2">
          {lista.map((b) => (
            <li key={b.id} className="vidrio flex items-center justify-between gap-3 rounded-3xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-cafe first-letter:uppercase">{describir(b)}</p>
                <p className="text-xs text-cafe/55">
                  {nombre(b.profesional_id)}
                  {b.motivo ? ` · ${b.motivo}` : ""}
                </p>
              </div>
              <button onClick={() => borrar(b)} className="text-xs text-cafe/60 underline underline-offset-4">
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
