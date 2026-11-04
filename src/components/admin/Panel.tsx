"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Agenda from "./Agenda";
import Servicios from "./Servicios";
import HorarioEditor from "./HorarioEditor";
import Bloqueos from "./Bloqueos";

const PESTANAS = ["Agenda", "Servicios", "Horario", "Bloqueos"] as const;
type Pestana = (typeof PESTANAS)[number];

export default function Panel() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [listo, setListo] = useState(false);
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);
  const [pestana, setPestana] = useState<Pestana>("Agenda");

  useEffect(() => {
    const db = supabase();
    db.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setListo(true);
    });
    const { data } = db.auth.onAuthStateChange((_e, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sesion) {
      setEsAdmin(null);
      return;
    }
    supabase()
      .rpc("es_admin")
      .then(({ data, error }) => setEsAdmin(!error && data === true));
  }, [sesion]);

  if (!listo) return <Centro>Cargando…</Centro>;
  if (!sesion) return <Login />;
  if (esAdmin === null) return <Centro>Verificando acceso…</Centro>;
  if (!esAdmin)
    return (
      <Centro>
        <p className="font-serif text-2xl text-cafe">Sin acceso</p>
        <p className="mt-2 text-sm text-cafe/60">
          El correo {sesion.user.email} no está autorizado para el panel. Pide que lo agreguen a la tabla
          administradoras.
        </p>
        <button onClick={() => supabase().auth.signOut()} className="mt-5 text-sm underline">
          Cerrar sesión
        </button>
      </Centro>
    );

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Beauty to You" width={90} height={41} />
          <span className="rounded-full bg-oscuro px-2.5 py-0.5 text-[10px] tracking-widest text-hueso uppercase">
            Panel
          </span>
        </div>
        <button onClick={() => supabase().auth.signOut()} className="text-xs text-cafe/60 underline underline-offset-4">
          Salir
        </button>
      </header>

      <nav className="vidrio sticky top-2 z-20 flex gap-1 rounded-full p-1">
        {PESTANAS.map((p) => (
          <button
            key={p}
            onClick={() => setPestana(p)}
            className={`flex-1 rounded-full py-2 text-sm transition ${
              pestana === p ? "bg-oscuro font-medium text-hueso" : "text-cafe/70 hover:text-cafe"
            }`}
          >
            {p}
          </button>
        ))}
      </nav>

      <main className="mt-4">
        {pestana === "Agenda" && <Agenda />}
        {pestana === "Servicios" && <Servicios />}
        {pestana === "Horario" && <HorarioEditor />}
        {pestana === "Bloqueos" && <Bloqueos />}
      </main>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password: clave });
    setEnviando(false);
    if (error) setError("Correo o contraseña incorrectos.");
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <form onSubmit={entrar} className="vidrio w-full max-w-sm rounded-[2rem] p-7">
        <Image src="/logo.png" alt="Beauty to You" width={150} height={68} className="mx-auto" />
        <p className="mt-2 text-center text-[10px] tracking-[0.4em] text-acento uppercase">Panel del estudio</p>
        <label className="mt-6 block">
          <span className="etiqueta block">Correo</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="campo" autoComplete="email" />
        </label>
        <label className="mt-4 block">
          <span className="etiqueta block">Contraseña</span>
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            className="campo"
            autoComplete="current-password"
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <button disabled={enviando} className="mt-6 w-full rounded-full bg-oscuro py-3.5 font-medium text-hueso disabled:opacity-50">
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function Centro({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-dvh place-items-center px-6 text-center text-cafe/70">{<div>{children}</div>}</div>;
}
