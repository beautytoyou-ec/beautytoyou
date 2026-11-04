"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Servicio } from "@/lib/tipos";

const CATEGORIAS = ["Uñas", "Cejas", "Pestañas"];

export default function Servicios() {
  const [lista, setLista] = useState<Servicio[]>([]);
  const [cambios, setCambios] = useState<Record<string, Partial<Servicio>>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase().from("servicios").select("*").order("categoria").order("duracion_min");
    if (error) return setMensaje(error.message);
    setLista(data as Servicio[]);
    setCambios({});
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const editar = (id: string, campo: Partial<Servicio>) =>
    setCambios((c) => ({ ...c, [id]: { ...c[id], ...campo } }));

  async function guardar(s: Servicio) {
    const c = cambios[s.id];
    if (!c) return;
    const { error } = await supabase().from("servicios").update(c).eq("id", s.id);
    setMensaje(error ? "Error: " + error.message : `“${c.nombre ?? s.nombre}” guardado.`);
    if (!error) cargar();
  }

  async function nuevo() {
    const { error } = await supabase()
      .from("servicios")
      .insert({ categoria: "Uñas", nombre: "Nuevo servicio", duracion_min: 60, activo: false });
    setMensaje(error ? "Error: " + error.message : "Servicio creado (inactivo). Edítalo y actívalo.");
    if (!error) cargar();
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-3xl text-cafe">Servicios</h2>
          <p className="text-sm text-cafe/55">Nombre, duración, precio y si se muestra en la página.</p>
        </div>
        <button onClick={nuevo} className="shrink-0 rounded-full bg-oscuro px-4 py-2 text-sm whitespace-nowrap text-hueso">
          + Nuevo
        </button>
      </div>
      {mensaje && <p className="mt-3 rounded-2xl bg-white/70 px-4 py-2.5 text-sm text-cafe">{mensaje}</p>}

      <ul className="mt-4 space-y-2">
        {lista.map((s) => {
          const v = { ...s, ...cambios[s.id] };
          const sucio = !!cambios[s.id];
          return (
            <li key={s.id} className={`vidrio rounded-3xl p-4 ${v.activo ? "" : "opacity-60"}`}>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  value={v.nombre}
                  onChange={(e) => editar(s.id, { nombre: e.target.value })}
                  className="campo py-2.5 font-medium"
                />
                <select
                  value={v.categoria}
                  onChange={(e) => editar(s.id, { categoria: e.target.value })}
                  className="campo w-auto py-2.5"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="mt-2 grid grid-cols-3 items-end gap-2">
                <label className="text-xs text-cafe/60">
                  Minutos
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={v.duracion_min}
                    onChange={(e) => editar(s.id, { duracion_min: Number(e.target.value) })}
                    className="campo mt-1 py-2"
                  />
                </label>
                <label className="text-xs text-cafe/60">
                  Precio $
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={v.precio ?? ""}
                    placeholder="—"
                    onChange={(e) => editar(s.id, { precio: e.target.value === "" ? null : Number(e.target.value) })}
                    className="campo mt-1 py-2"
                  />
                </label>
                <label className="flex items-center gap-2 pb-3 text-sm text-cafe">
                  <input type="checkbox" checked={v.activo} onChange={(e) => editar(s.id, { activo: e.target.checked })} />
                  Visible
                </label>
              </div>
              {sucio && (
                <div className="mt-3 flex justify-end gap-3">
                  <button onClick={() => cargar()} className="text-sm text-cafe/60">
                    Deshacer
                  </button>
                  <button onClick={() => guardar(s)} className="rounded-full bg-oscuro px-4 py-1.5 text-sm text-hueso">
                    Guardar
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
