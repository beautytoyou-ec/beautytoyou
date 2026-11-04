"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Horario, Ocupado, Profesional, Servicio } from "@/lib/tipos";
import { asignarProfesional, diasDisponibles, turnosDelDia, type Turno } from "@/lib/horarios";
import { diaSemana, duracionTexto, fechaCorta, fechaLarga, hora12, instante } from "@/lib/tiempo";
import { NEGOCIO, enlaceWhatsApp, normalizarCelular } from "@/lib/negocio";
import {
  Adelante,
  Atras,
  Compartir,
  Destello,
  Flecha,
  IconoCejas,
  IconoPestanas,
  IconoUnas,
  Instagram,
  Reloj,
  WhatsApp,
} from "./Iconos";

type Pantalla = "inicio" | "detalle" | "datos" | "listo";
const CUALQUIERA = "cualquiera";
const DIAS_VISIBLES = 5;

/** Fotos y textos por categoría. Cambia las fotos en /public/fotos. */
const CATEGORIAS = [
  { nombre: "Uñas", Icono: IconoUnas, foto: "/fotos/unas.jpg", texto: "Uñas bonitas, duraderas y hechas con detalle." },
  { nombre: "Cejas", Icono: IconoCejas, foto: "/fotos/rostro.jpg", texto: "Cejas definidas que enmarcan tu mirada." },
  { nombre: "Pestañas", Icono: IconoPestanas, foto: "/fotos/rostro.jpg", texto: "Una mirada que se nota, sin esfuerzo." },
];
const infoCategoria = (c: string) => CATEGORIAS.find((x) => x.nombre === c) ?? CATEGORIAS[0];

type Confirmada = {
  servicio: Servicio;
  profesional: Profesional;
  fecha: string;
  inicio: number;
  nombre: string;
};

export default function Reserva() {
  const [pantalla, setPantalla] = useState<Pantalla>("inicio");
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);

  const [categoria, setCategoria] = useState("Uñas");
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [elegida, setElegida] = useState<string>(CUALQUIERA);
  const [fecha, setFecha] = useState<string | null>(null);
  const [ventana, setVentana] = useState(0);
  const [ocupados, setOcupados] = useState<Ocupado[]>([]);
  const [cargandoHoras, setCargandoHoras] = useState(false);
  const [turno, setTurno] = useState<Turno | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [confirmada, setConfirmada] = useState<Confirmada | null>(null);

  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const db = supabase();
        const [s, p, h] = await Promise.all([
          db.from("servicios").select("*").eq("activo", true).order("duracion_min"),
          db.from("profesionales").select("*").eq("activa", true).order("nombre"),
          db.from("horarios").select("*"),
        ]);
        if (s.error || p.error || h.error) throw s.error ?? p.error ?? h.error;
        setServicios(s.data as Servicio[]);
        setProfesionales(p.data as Profesional[]);
        setHorarios(h.data as Horario[]);
      } catch (e) {
        console.error(e);
        const detalle =
          e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String(e.message) : String(e);
        setErrorCarga(`No pudimos cargar la agenda. Intenta de nuevo en un momento. (${detalle})`);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pantalla]);

  const dias = useMemo(() => diasDisponibles(horarios), [horarios]);
  const serviciosCategoria = servicios.filter((s) => s.categoria === categoria);

  const cargarOcupados = useCallback(async (dia: string) => {
    setCargandoHoras(true);
    const { data, error } = await supabase().rpc("ocupados", { dia });
    setCargandoHoras(false);
    if (error) {
      console.error(error);
      setAviso("No pudimos ver las horas libres. Intenta de nuevo.");
      setOcupados([]);
      return;
    }
    setOcupados((data ?? []) as Ocupado[]);
  }, []);

  useEffect(() => {
    if (pantalla === "detalle" && fecha) cargarOcupados(fecha);
  }, [pantalla, fecha, cargarOcupados]);

  const turnos = useMemo(() => {
    if (!servicio || !fecha) return [];
    return turnosDelDia({
      fecha,
      horario: horarios.find((h) => h.dia_semana === diaSemana(fecha)),
      duracion: servicio.duracion_min,
      profesionales,
      ocupados,
      elegida: elegida === CUALQUIERA ? null : elegida,
    });
  }, [servicio, fecha, horarios, profesionales, ocupados, elegida]);

  const nombreProfesional = (id: string) =>
    id === CUALQUIERA ? "La primera disponible" : profesionales.find((p) => p.id === id)?.nombre ?? "";

  function abrirServicio(s: Servicio) {
    setServicio(s);
    setTurno(null);
    setAviso(null);
    if (!fecha && dias[0]) setFecha(dias[0]);
    setPantalla("detalle");
  }

  async function compartir() {
    const datos = { title: "Beauty to You · Agenda tu cita", url: window.location.href };
    try {
      if (navigator.share) await navigator.share(datos);
      else await navigator.clipboard.writeText(datos.url);
    } catch {
      /* la usuaria canceló */
    }
  }

  async function confirmar() {
    if (!servicio || !fecha || !turno) return;
    const nom = nombre.trim();
    const cel = normalizarCelular(telefono);
    if (nom.length < 2) return setErrorForm("Escribe tu nombre.");
    if (!cel) return setErrorForm("Escribe un número de WhatsApp válido, por ejemplo 0991234567.");
    setErrorForm(null);
    setEnviando(true);

    const profesionalId = elegida === CUALQUIERA ? asignarProfesional(turno.libres, ocupados) : elegida;
    const inicio = instante(fecha, turno.inicio);
    const fin = new Date(inicio.getTime() + servicio.duracion_min * 60_000);

    const { error } = await supabase().from("citas").insert({
      servicio_id: servicio.id,
      profesional_id: profesionalId,
      cliente_nombre: nom,
      cliente_telefono: cel,
      inicio: inicio.toISOString(),
      fin: fin.toISOString(),
    });
    setEnviando(false);

    if (error) {
      console.error(error);
      if (error.code === "23P01") {
        setTurno(null);
        setAviso("¡Uy! Alguien acaba de reservar esa hora. Elige otra, por favor.");
        await cargarOcupados(fecha);
        setPantalla("detalle");
      } else {
        setErrorForm("No pudimos guardar tu cita. Intenta de nuevo o escríbenos por WhatsApp.");
      }
      return;
    }

    setConfirmada({
      servicio,
      profesional: profesionales.find((p) => p.id === profesionalId)!,
      fecha,
      inicio: turno.inicio,
      nombre: nom,
    });
    setPantalla("listo");
  }

  function reiniciar() {
    setServicio(null);
    setTurno(null);
    setConfirmada(null);
    setAviso(null);
    setPantalla("inicio");
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-hueso shadow-[0_0_60px_rgba(74,59,48,0.08)]">
      {/* ───────────── INICIO ───────────── */}
      {pantalla === "inicio" && (
        <>
          <section className="relative h-[66dvh] min-h-[480px] overflow-hidden rounded-b-[2.5rem] bg-oscuro">
            <Image src="/fotos/portada.jpg" alt="" fill priority className="object-cover object-top opacity-80" sizes="448px" />
            <div className="absolute inset-0 bg-gradient-to-b from-oscuro/40 via-oscuro/10 to-oscuro" />

            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
              <span className="grid size-12 place-items-center overflow-hidden rounded-full bg-crema/95 p-1">
                <Image src="/logo.png" alt="Beauty to You" width={44} height={24} />
              </span>
              <a
                href={NEGOCIO.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flecha bg-oscuro/50 text-hueso backdrop-blur"
              >
                <Instagram />
              </a>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-6 pb-7 text-hueso">
              <p className="text-[11px] tracking-[0.4em] text-hueso/80 uppercase">Beauty Studio · Portoviejo</p>
              <h1 className="mt-3 font-serif text-[2.9rem] leading-[1.02]">
                Cuidarte
                <br />
                te queda
                <br />
                precioso <span className="text-acento">♥</span>
              </h1>
              <p className="mt-3 max-w-[16rem] text-sm text-hueso/75">
                Uñas, cejas y pestañas con detalle. Agenda tu cita en un minuto.
              </p>
              <button
                onClick={() => listaRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="mt-6 flex w-full items-center justify-between rounded-full bg-arena py-2 pr-2 pl-6 font-medium text-oscuro"
              >
                Agendar cita
                <span className="flecha bg-oscuro text-hueso">
                  <Flecha />
                </span>
              </button>
            </div>
          </section>

          <section ref={listaRef} className="scroll-mt-4 px-5 pt-6 pb-10">
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIAS.map(({ nombre: c, Icono }) => (
                <button key={c} onClick={() => setCategoria(c)} className="flex flex-col items-center gap-2">
                  <span
                    className={`grid aspect-square w-full place-items-center rounded-3xl border transition ${
                      categoria === c ? "border-arena bg-arena text-oscuro" : "border-acento/20 bg-white text-cafe/70"
                    }`}
                  >
                    <Icono />
                  </span>
                  <span className={`text-sm ${categoria === c ? "font-medium text-cafe" : "text-cafe/60"}`}>{c}</span>
                </button>
              ))}
            </div>

            <div className="mt-7 mb-3 flex items-baseline justify-between">
              <h2 className="font-serif text-2xl text-cafe">Servicios de {categoria.toLowerCase()}</h2>
              <span className="text-xs text-cafe/50">{serviciosCategoria.length}</span>
            </div>

            {cargando && <p className="py-10 text-center text-cafe/50">Cargando servicios…</p>}
            {errorCarga && <p className="py-10 text-center text-cafe">{errorCarga}</p>}

            <ul className="space-y-3">
              {serviciosCategoria.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => abrirServicio(s)}
                    className="flex w-full items-center gap-4 rounded-3xl border border-acento/15 bg-white p-2.5 pr-4 text-left transition hover:border-acento/50"
                  >
                    <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-arena">
                      <Image src={infoCategoria(s.categoria).foto} alt="" fill className="object-cover" sizes="64px" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-cafe">{s.nombre}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-sm text-cafe/55">
                        <Reloj /> {duracionTexto(s.duracion_min)}
                      </span>
                    </span>
                    {s.precio != null ? (
                      <span className="font-serif text-xl font-medium text-cafe">${Number(s.precio).toFixed(0)}</span>
                    ) : (
                      <Adelante className="size-5 text-cafe/40" />
                    )}
                  </button>
                </li>
              ))}
            </ul>

            <Pie />
          </section>
        </>
      )}

      {/* ───────────── DETALLE: con quién, día y hora ───────────── */}
      {pantalla === "detalle" && servicio && (
        <>
          <section className="relative h-72 overflow-hidden rounded-b-[2.5rem] bg-arena">
            <Image src={infoCategoria(servicio.categoria).foto} alt="" fill priority className="object-cover" sizes="448px" />
            <div className="absolute inset-0 bg-gradient-to-b from-oscuro/30 to-transparent" />
            <div className="absolute inset-x-0 top-0 flex justify-between p-5">
              <button onClick={() => setPantalla("inicio")} aria-label="Atrás" className="flecha bg-oscuro/60 text-hueso backdrop-blur">
                <Atras />
              </button>
              <button onClick={compartir} aria-label="Compartir" className="flecha bg-oscuro/60 text-hueso backdrop-blur">
                <Compartir />
              </button>
            </div>
          </section>

          <section className="px-5 pt-5 pb-32">
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-serif text-[2.1rem] leading-tight text-cafe">{servicio.nombre}</h1>
              {servicio.precio != null && (
                <span className="pt-1 font-serif text-3xl font-medium text-cafe">${Number(servicio.precio).toFixed(0)}</span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-cafe/55">
              <Reloj /> {duracionTexto(servicio.duracion_min)} · {infoCategoria(servicio.categoria).texto}
            </p>

            <h3 className="etiqueta mt-7">Elige con quién</h3>
            <div className="grid grid-cols-3 gap-3">
              {[{ id: CUALQUIERA, nombre: "Cualquiera" }, ...profesionales].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setElegida(p.id);
                    setTurno(null);
                  }}
                  className={`chip flex flex-col items-center gap-1.5 py-3 ${elegida === p.id ? "chip-activo" : ""}`}
                >
                  <span className="grid size-10 place-items-center rounded-full border border-acento/40 font-serif text-lg">
                    {p.id === CUALQUIERA ? <Destello /> : p.nombre[0]}
                  </span>
                  <span className="text-xs">{p.nombre}</span>
                </button>
              ))}
            </div>

            <h3 className="etiqueta mt-7">Elige el día</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setVentana((v) => Math.max(0, v - DIAS_VISIBLES))}
                disabled={ventana === 0}
                aria-label="Días anteriores"
                className="shrink-0 p-1 text-cafe/60 disabled:opacity-20"
              >
                <Atras className="size-4" />
              </button>
              <div className="grid flex-1 grid-cols-5 gap-2">
                {dias.slice(ventana, ventana + DIAS_VISIBLES).map((d) => {
                  const c = fechaCorta(d);
                  return (
                    <button
                      key={d}
                      onClick={() => {
                        setFecha(d);
                        setTurno(null);
                        setAviso(null);
                      }}
                      className={`chip flex flex-col items-center py-2 ${d === fecha ? "chip-activo" : ""}`}
                    >
                      <span className="text-[11px] text-cafe/60">{c.dia}</span>
                      <span className="text-base">{c.numero}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setVentana((v) => Math.min(Math.max(0, dias.length - DIAS_VISIBLES), v + DIAS_VISIBLES))}
                disabled={ventana + DIAS_VISIBLES >= dias.length}
                aria-label="Días siguientes"
                className="shrink-0 p-1 text-cafe/60 disabled:opacity-20"
              >
                <Adelante className="size-4" />
              </button>
            </div>
            {fecha && <p className="mt-2 text-center text-xs text-cafe/50 first-letter:uppercase">{fechaLarga(fecha)}</p>}

            {aviso && <p className="mt-4 rounded-2xl bg-arena px-4 py-3 text-sm text-cafe">{aviso}</p>}

            <h3 className="etiqueta mt-6">Elige la hora</h3>
            {cargandoHoras ? (
              <p className="py-6 text-center text-sm text-cafe/50">Buscando horas libres…</p>
            ) : turnos.length === 0 ? (
              <p className="rounded-2xl bg-crema py-6 text-center text-sm text-cafe/70">
                No hay horas libres este día. Prueba con otro.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {turnos.map((t) => (
                  <button
                    key={t.inicio}
                    onClick={() => setTurno(t)}
                    className={`chip rounded-full py-2.5 text-[13px] ${turno?.inicio === t.inicio ? "chip-activo" : ""}`}
                  >
                    {hora12(t.inicio)}
                  </button>
                ))}
              </div>
            )}
          </section>

          <BarraInferior>
            <button disabled={!turno} onClick={() => setPantalla("datos")} className="boton-oscuro">
              {turno ? `Continuar · ${hora12(turno.inicio)}` : "Elige una hora"}
              <span className="flecha bg-hueso/10">
                <Flecha />
              </span>
            </button>
          </BarraInferior>
        </>
      )}

      {/* ───────────── DATOS ───────────── */}
      {pantalla === "datos" && servicio && fecha && turno && (
        <>
          <section className="px-5 pt-5 pb-32">
            <button onClick={() => setPantalla("detalle")} aria-label="Atrás" className="flecha border border-acento/30 bg-white text-cafe">
              <Atras />
            </button>
            <h1 className="mt-5 font-serif text-[2.4rem] leading-tight text-cafe">Casi lista</h1>
            <p className="text-cafe/60">Déjanos tus datos para confirmar.</p>

            <div className="mt-6 flex items-center gap-4 rounded-3xl bg-crema p-3">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl">
                <Image src={infoCategoria(servicio.categoria).foto} alt="" fill className="object-cover" sizes="64px" />
              </span>
              <div className="text-sm text-cafe">
                <p className="font-medium">{servicio.nombre}</p>
                <p className="first-letter:uppercase">
                  {fechaLarga(fecha)} · {hora12(turno.inicio)}
                </p>
                <p className="text-cafe/60">Con: {nombreProfesional(elegida)}</p>
              </div>
            </div>

            <form
              id="form-datos"
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                confirmar();
              }}
            >
              <label className="block">
                <span className="etiqueta block">Nombre</span>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoComplete="name"
                  className="campo"
                  placeholder="Tu nombre y apellido"
                />
              </label>
              <label className="block">
                <span className="etiqueta block">WhatsApp</span>
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  className="campo"
                  placeholder="09XXXXXXXX"
                />
              </label>
              {errorForm && <p className="text-sm text-red-700">{errorForm}</p>}
            </form>
          </section>

          <BarraInferior>
            <button type="submit" form="form-datos" disabled={enviando} className="boton-oscuro">
              {enviando ? "Reservando…" : "Confirmar cita"}
              <span className="flecha bg-hueso/10">
                <Flecha />
              </span>
            </button>
          </BarraInferior>
        </>
      )}

      {/* ───────────── LISTO ───────────── */}
      {pantalla === "listo" && confirmada && (
        <section className="px-5 pt-10 pb-10 text-center">
          <Image src="/logo.png" alt="Beauty to You" width={150} height={83} className="mx-auto" />
          <div className="mx-auto mt-6 grid size-16 place-items-center rounded-full bg-oscuro text-2xl text-hueso">✓</div>
          <h1 className="mt-4 font-serif text-[2.4rem] leading-tight text-cafe">¡Cita reservada!</h1>
          <p className="text-cafe/60">Te esperamos, {confirmada.nombre.split(" ")[0]} ♥</p>

          <div className="mt-6 rounded-3xl bg-crema p-5 text-left text-cafe">
            <Fila etiqueta="Servicio" valor={confirmada.servicio.nombre} />
            <Fila etiqueta="Día" valor={fechaLarga(confirmada.fecha)} mayuscula />
            <Fila etiqueta="Hora" valor={hora12(confirmada.inicio)} />
            <Fila etiqueta="Duración" valor={duracionTexto(confirmada.servicio.duracion_min)} />
            <Fila etiqueta="Con" valor={confirmada.profesional.nombre} />
          </div>

          <a
            href={enlaceWhatsApp(
              `¡Hola Beauty to You! Acabo de agendar una cita:\n` +
                `• Servicio: ${confirmada.servicio.nombre}\n` +
                `• Día: ${fechaLarga(confirmada.fecha)}\n` +
                `• Hora: ${hora12(confirmada.inicio)}\n` +
                `• Con: ${confirmada.profesional.nombre}\n` +
                `• Nombre: ${confirmada.nombre}`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="boton-oscuro mt-6"
          >
            Avisar por WhatsApp
            <span className="flecha bg-hueso/10">
              <WhatsApp />
            </span>
          </a>
          <button onClick={reiniciar} className="mt-5 text-sm text-cafe/60 underline underline-offset-4">
            Agendar otra cita
          </button>
          <Pie />
        </section>
      )}
    </div>
  );
}

function BarraInferior({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10">
      <div className="mx-auto max-w-md bg-gradient-to-t from-hueso via-hueso to-hueso/0 px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}

function Pie() {
  return (
    <p className="mt-10 text-center text-xs text-cafe/40">
      {NEGOCIO.nombre} · {NEGOCIO.ciudad} · WhatsApp {NEGOCIO.whatsappVisible}
    </p>
  );
}

function Fila({ etiqueta, valor, mayuscula }: { etiqueta: string; valor: string; mayuscula?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-acento/20 py-2.5 last:border-0">
      <span className="text-sm text-cafe/55">{etiqueta}</span>
      <span className={`text-right font-medium ${mayuscula ? "first-letter:uppercase" : ""}`}>{valor}</span>
    </div>
  );
}
