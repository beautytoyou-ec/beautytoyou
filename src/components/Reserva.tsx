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
  Check,
  Corazon,
  Mas,
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
const PERIODOS = [
  { nombre: "Mañana", desde: 0, hasta: 12 * 60 },
  { nombre: "Tarde", desde: 12 * 60, hasta: 18 * 60 },
  { nombre: "Noche", desde: 18 * 60, hasta: 24 * 60 },
];
/** 13:30 -> "1:30" (el periodo ya dice si es mañana o tarde) */
const horaCorta = (min: number) => {
  const h = Math.floor(min / 60) % 12 || 12;
  return `${h}:${String(min % 60).padStart(2, "0")}`;
};

/** Fotos y textos por categoría. Cambia las fotos en /public/fotos. */
const CATEGORIAS = [
  { nombre: "Uñas", Icono: IconoUnas, foto: "/fotos/unas.jpg", texto: "Uñas bonitas, duraderas y hechas con detalle." },
  { nombre: "Cejas", Icono: IconoCejas, foto: "/fotos/rostro.jpg", texto: "Cejas definidas que enmarcan tu mirada." },
  { nombre: "Pestañas", Icono: IconoPestanas, foto: "/fotos/rostro.jpg", texto: "Una mirada que se nota, sin esfuerzo." },
];
/** Diseños para inspirarse. Agrega más fotos en /public/inspo. */
const INSPIRACION = [
  { id: "frances-estrellas", nombre: "Francés con estrellas", foto: "/inspo/1.jpg" },
  { id: "estrellas-puntos", nombre: "Estrellas y puntos", foto: "/inspo/2.jpg" },
  { id: "tonos-tierra", nombre: "Tonos tierra", foto: "/inspo/3.jpg" },
];

const infoCategoria = (c: string) => CATEGORIAS.find((x) => x.nombre === c) ?? CATEGORIAS[0];

type Confirmada = {
  servicio: Servicio;
  profesional: Profesional;
  fecha: string;
  inicio: number;
  nombre: string;
  inspo: string[];
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
  const [inspo, setInspo] = useState<string[]>([]);
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
    if (s.categoria !== servicio?.categoria) setInspo([]);
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
      inspo,
    });
    setPantalla("listo");
  }

  function reiniciar() {
    setServicio(null);
    setTurno(null);
    setConfirmada(null);
    setAviso(null);
    setInspo([]);
    setPantalla("inicio");
  }

  const toggleInspo = (id: string) =>
    setInspo((lista) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]));

  return (
    <div className="relative min-h-dvh">
      {/* Fondo: foto del estudio difuminada */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <Image src="/fotos/portada.jpg" alt="" fill priority className="scale-125 object-cover blur-3xl" sizes="100vw" />
        <div className="absolute inset-0 bg-crema/75" />
      </div>

      <div className="mx-auto w-full max-w-md px-3 pt-3">
        {/* ───────────── INICIO ───────────── */}
        {pantalla === "inicio" && (
          <>
            <section className="relative h-[64dvh] min-h-[470px] overflow-hidden rounded-[2.5rem] bg-oscuro shadow-[0_20px_50px_rgba(43,33,27,0.25)]">
              <Image src="/fotos/portada.jpg" alt="" fill priority className="object-cover object-top opacity-85" sizes="448px" />
              <div className="absolute inset-0 bg-gradient-to-b from-oscuro/30 via-transparent to-oscuro/95" />

              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                <span className="grid size-12 place-items-center rounded-full bg-crema/90 p-1 backdrop-blur">
                  <Image src="/logo.png" alt="Beauty to You" width={44} height={20} />
                </span>
                <a href={NEGOCIO.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="boton-glass">
                  <Instagram />
                </a>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-6 text-hueso">
                <p className="text-[10px] tracking-[0.45em] text-hueso/75 uppercase">Beauty Studio · Portoviejo</p>
                <h1 className="mt-3 font-serif text-[2.9rem] leading-[1.02]">
                  Cuidarte
                  <br />
                  te queda
                  <br />
                  precioso <span className="text-acento">♥</span>
                </h1>
                <p className="mt-3 max-w-[16rem] text-sm text-hueso/70">Uñas, cejas y pestañas con detalle. Agenda en un minuto.</p>
                <button
                  onClick={() => listaRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="mt-6 flex w-full items-center justify-between rounded-full border border-white/40 bg-white/20 py-2 pr-2 pl-6 font-medium text-hueso backdrop-blur-md"
                >
                  Agendar cita
                  <span className="flecha bg-hueso text-oscuro">
                    <Flecha />
                  </span>
                </button>
              </div>
            </section>

            <section ref={listaRef} className="vidrio mt-3 scroll-mt-3 rounded-[2.5rem] px-4 pt-5 pb-8">
              <div className="grid grid-cols-3 gap-3">
                {CATEGORIAS.map(({ nombre: c, Icono }) => (
                  <button key={c} onClick={() => setCategoria(c)} className="flex flex-col items-center gap-2">
                    <span
                      className={`grid aspect-square w-full place-items-center rounded-[1.6rem] border transition ${
                        categoria === c ? "border-oscuro bg-oscuro text-hueso" : "border-white/80 bg-white/70 text-cafe/70"
                      }`}
                    >
                      <Icono />
                    </span>
                    <span className={`text-sm ${categoria === c ? "font-medium text-cafe" : "text-cafe/60"}`}>{c}</span>
                  </button>
                ))}
              </div>

              <div className="mt-7 mb-3 flex items-baseline justify-between px-1">
                <h2 className="font-serif text-2xl text-cafe">Servicios de {categoria.toLowerCase()}</h2>
                <span className="text-xs text-cafe/50">{serviciosCategoria.length}</span>
              </div>

              {cargando && <p className="py-10 text-center text-cafe/50">Cargando servicios…</p>}
              {errorCarga && <p className="py-10 text-center text-cafe">{errorCarga}</p>}

              <ul className="space-y-2.5">
                {serviciosCategoria.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => abrirServicio(s)}
                      className="flex w-full items-center gap-4 rounded-[1.6rem] border border-white/80 bg-white/75 p-2 pr-4 text-left transition hover:bg-white"
                    >
                      <span className="relative size-14 shrink-0 overflow-hidden rounded-full">
                        <Image src={infoCategoria(s.categoria).foto} alt="" fill className="object-cover" sizes="56px" />
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
                        <span className="grid size-8 place-items-center rounded-full bg-crema text-cafe/60">
                          <Adelante className="size-4" />
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>

              <Pie />
            </section>
          </>
        )}

        {/* ───────────── DETALLE ───────────── */}
        {pantalla === "detalle" && servicio && (
          <>
            <section className="relative h-64 overflow-hidden rounded-[2.5rem] bg-arena shadow-[0_20px_50px_rgba(43,33,27,0.18)]">
              <Image src={infoCategoria(servicio.categoria).foto} alt="" fill priority className="object-cover" sizes="448px" />
              <div className="absolute inset-0 bg-gradient-to-b from-oscuro/35 via-transparent to-oscuro/60" />
              <div className="absolute inset-x-0 top-0 flex justify-between p-4">
                <button onClick={() => setPantalla("inicio")} aria-label="Atrás" className="boton-glass">
                  <Atras />
                </button>
                <button onClick={compartir} aria-label="Compartir" className="boton-glass">
                  <Compartir />
                </button>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 text-hueso">
                <p className="text-[10px] tracking-[0.4em] text-hueso/75 uppercase">{servicio.categoria}</p>
                <div className="flex items-end justify-between gap-4">
                  <h1 className="font-serif text-[2.3rem] leading-tight">{servicio.nombre}</h1>
                  {servicio.precio != null && (
                    <span className="pb-1 font-serif text-3xl">${Number(servicio.precio).toFixed(0)}</span>
                  )}
                </div>
              </div>
            </section>

            <section className="vidrio mt-3 rounded-[2.5rem] px-5 pt-5 pb-32">
              <p className="flex items-center gap-1.5 text-sm text-cafe/60">
                <Reloj /> {duracionTexto(servicio.duracion_min)} · {infoCategoria(servicio.categoria).texto}
              </p>

              <h3 className="etiqueta mt-6">Elige con quién</h3>
              <div className="sin-barra -mx-5 flex gap-2 overflow-x-auto px-5">
                {[{ id: CUALQUIERA, nombre: "Cualquiera" }, ...profesionales].map((p) => {
                  const activo = elegida === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setElegida(p.id);
                        setTurno(null);
                      }}
                      className={`flex shrink-0 items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-sm transition ${
                        activo ? "border-oscuro bg-oscuro text-hueso" : "border-white/80 bg-white/70 text-cafe"
                      }`}
                    >
                      <span
                        className={`grid size-8 place-items-center rounded-full font-serif text-base ${
                          activo ? "bg-hueso/15" : "bg-arena"
                        }`}
                      >
                        {p.id === CUALQUIERA ? <Destello className="size-4" /> : p.nombre[0]}
                      </span>
                      {p.nombre}
                    </button>
                  );
                })}
              </div>

              <h3 className="etiqueta mt-6">Elige el día</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setVentana((v) => Math.max(0, v - DIAS_VISIBLES))}
                  disabled={ventana === 0}
                  aria-label="Días anteriores"
                  className="shrink-0 p-1 text-cafe/60 disabled:opacity-20"
                >
                  <Atras className="size-4" />
                </button>
                <div className="grid flex-1 grid-cols-5 gap-1.5">
                  {dias.slice(ventana, ventana + DIAS_VISIBLES).map((d) => {
                    const c = fechaCorta(d);
                    const activo = d === fecha;
                    return (
                      <button
                        key={d}
                        onClick={() => {
                          setFecha(d);
                          setTurno(null);
                          setAviso(null);
                        }}
                        className={`flex flex-col items-center rounded-2xl border py-2 transition ${
                          activo ? "border-oscuro bg-oscuro text-hueso" : "border-white/80 bg-white/70 text-cafe"
                        }`}
                      >
                        <span className={`text-[10px] tracking-wider uppercase ${activo ? "text-hueso/70" : "text-cafe/50"}`}>
                          {c.dia}
                        </span>
                        <span className="font-serif text-xl leading-tight">{c.numero}</span>
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

              {aviso && <p className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm text-cafe">{aviso}</p>}

              <h3 className="etiqueta mt-6">Elige la hora</h3>
              {cargandoHoras ? (
                <p className="py-6 text-center text-sm text-cafe/50">Buscando horas libres…</p>
              ) : turnos.length === 0 ? (
                <p className="rounded-2xl bg-white/60 py-6 text-center text-sm text-cafe/70">
                  No hay horas libres este día. Prueba con otro.
                </p>
              ) : (
                <div className="space-y-4">
                  {PERIODOS.map(({ nombre: periodo, desde, hasta }) => {
                    const lista = turnos.filter((t) => t.inicio >= desde && t.inicio < hasta);
                    if (!lista.length) return null;
                    return (
                      <div key={periodo}>
                        <div className="mb-2 flex items-center gap-3">
                          <span className="text-[10px] font-medium tracking-[0.3em] text-acento uppercase">{periodo}</span>
                          <span className="h-px flex-1 bg-acento/25" />
                          <span className="text-[11px] text-cafe/40">{lista.length} libres</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {lista.map((t) => {
                            const activo = turno?.inicio === t.inicio;
                            return (
                              <button
                                key={t.inicio}
                                onClick={() => setTurno(t)}
                                className={`rounded-full border py-1.5 text-[13px] tabular-nums transition ${
                                  activo
                                    ? "border-oscuro bg-oscuro font-medium text-hueso"
                                    : "border-white/80 bg-white/70 text-cafe hover:bg-white"
                                }`}
                              >
                                {horaCorta(t.inicio)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {servicio.categoria === "Uñas" && (
                <>
                  <div className="mt-7 flex items-baseline justify-between">
                    <h3 className="etiqueta mb-0">Agrega tu inspiración</h3>
                    <span className="text-xs text-cafe/45">Opcional</span>
                  </div>
                  <p className="mb-3 text-xs text-cafe/55">Marca los diseños que te gustan para tu manicurista.</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {INSPIRACION.map((d) => {
                      const elegido = inspo.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          onClick={() => toggleInspo(d.id)}
                          className={`relative aspect-[4/5] overflow-hidden rounded-[1.6rem] text-left transition ${
                            elegido ? "ring-2 ring-oscuro ring-offset-2 ring-offset-crema" : ""
                          }`}
                        >
                          <Image src={d.foto} alt={d.nombre} fill className="object-cover" sizes="200px" />
                          <span className="absolute inset-0 bg-gradient-to-t from-oscuro/70 via-transparent to-transparent" />
                          <span className="absolute top-2.5 right-2.5 text-hueso">
                            <Corazon lleno={elegido} className="size-5" />
                          </span>
                          <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-hueso">
                            <span className="text-xs leading-tight font-medium">{d.nombre}</span>
                            <span
                              className={`grid size-7 shrink-0 place-items-center rounded-full border ${
                                elegido ? "border-hueso bg-hueso text-oscuro" : "border-hueso/80"
                              }`}
                            >
                              {elegido ? <Check /> : <Mas />}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
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
            <section className="px-2 pt-2 pb-36">
              <button onClick={() => setPantalla("detalle")} aria-label="Atrás" className="flecha vidrio text-cafe">
                <Atras />
              </button>
              <h1 className="mt-5 px-1 font-serif text-[2.4rem] leading-tight text-cafe">Tu reserva</h1>
              <p className="px-1 text-cafe/60">Revisa y déjanos tus datos.</p>

              <Ticket
                className="mt-5"
                estado="Por confirmar"
                servicio={servicio}
                profesional={nombreProfesional(elegida)}
                fecha={fecha}
                inicio={turno.inicio}
                inspo={inspo}
              />

              <form
                id="form-datos"
                className="vidrio mt-3 space-y-4 rounded-[2rem] p-5"
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
              <p className="mt-2 text-center text-[11px] text-cafe/50">
                Si no puedes asistir, avísanos por WhatsApp para liberar tu hora.
              </p>
            </BarraInferior>
          </>
        )}

        {/* ───────────── LISTO ───────────── */}
        {pantalla === "listo" && confirmada && (
          <section className="px-2 pt-8 pb-10 text-center">
            <Image src="/logo.png" alt="Beauty to You" width={160} height={72} className="mx-auto" />
            <div className="mx-auto mt-5 grid size-14 place-items-center rounded-full bg-oscuro text-hueso">
              <Check className="size-6" />
            </div>
            <h1 className="mt-4 font-serif text-[2.4rem] leading-tight text-cafe">¡Cita reservada!</h1>
            <p className="text-cafe/60">Te esperamos, {confirmada.nombre.split(" ")[0]} ♥</p>

            <Ticket
              className="mt-6 text-left"
              estado="Confirmada"
              servicio={confirmada.servicio}
              profesional={confirmada.profesional.nombre}
              fecha={confirmada.fecha}
              inicio={confirmada.inicio}
              inspo={confirmada.inspo}
            />

            <a
              href={enlaceWhatsApp(
                `¡Hola Beauty to You! Acabo de agendar una cita:\n` +
                  `• Servicio: ${confirmada.servicio.nombre}\n` +
                  `• Día: ${fechaLarga(confirmada.fecha)}\n` +
                  `• Hora: ${hora12(confirmada.inicio)}\n` +
                  `• Con: ${confirmada.profesional.nombre}\n` +
                  `• Nombre: ${confirmada.nombre}` +
                  (confirmada.inspo.length
                    ? `\n• Inspiración: ${confirmada.inspo
                        .map((id) => INSPIRACION.find((d) => d.id === id)?.nombre)
                        .filter(Boolean)
                        .join(", ")}`
                    : ""),
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
    </div>
  );
}

function Ticket({
  estado,
  servicio,
  profesional,
  fecha,
  inicio,
  inspo,
  className = "",
}: {
  estado: string;
  servicio: Servicio;
  profesional: string;
  fecha: string;
  inicio: number;
  inspo: string[];
  className?: string;
}) {
  const c = fechaCorta(fecha);
  const fotos = inspo.map((id) => INSPIRACION.find((d) => d.id === id)).filter(Boolean) as typeof INSPIRACION;
  const confirmada = estado === "Confirmada";
  return (
    <div className={`vidrio overflow-hidden rounded-[2.2rem] ${className}`}>
      <div className="flex items-center gap-4 rounded-[2.2rem] bg-arena/80 p-3 pr-4">
        <span className="relative size-28 shrink-0 overflow-hidden rounded-full border-4 border-white/60">
          <Image src={infoCategoria(servicio.categoria).foto} alt="" fill className="object-cover" sizes="112px" />
        </span>
        <div className="min-w-0">
          <span
            className={`inline-block rounded-full px-3 py-0.5 text-[11px] font-medium ${
              confirmada ? "bg-oscuro text-hueso" : "bg-white/80 text-cafe"
            }`}
          >
            {estado}
          </span>
          <p className="mt-2 font-serif text-xl leading-tight text-cafe">{servicio.nombre}</p>
          <p className="text-xs text-cafe/55">{duracionTexto(servicio.duracion_min)}</p>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-oscuro font-serif text-sm text-hueso">
              {profesional === "La primera disponible" ? <Destello className="size-4" /> : profesional[0]}
            </span>
            <span className="text-xs leading-tight">
              <span className="block font-medium text-cafe">Con: {profesional}</span>
              <span className="text-cafe/50">Beauty to You</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-acento/25 px-5 py-4">
        <div className="pr-4">
          <p className="text-xs text-cafe/50">Inspiración</p>
          {fotos.length ? (
            <div className="mt-2 flex items-center">
              {fotos.map((d, i) => (
                <span
                  key={d.id}
                  className="relative -ml-2 size-9 overflow-hidden rounded-full border-2 border-white first:ml-0"
                  style={{ zIndex: 10 - i }}
                >
                  <Image src={d.foto} alt="" fill className="object-cover" sizes="36px" />
                </span>
              ))}
              <span className="ml-2 text-[11px] text-cafe/55">{fotos.length}</span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-cafe/45">Sin fotos</p>
          )}
        </div>
        <div className="pl-4">
          <p className="text-xs text-cafe/50">Fecha elegida</p>
          <p className="mt-1 text-lg font-medium text-cafe">
            {c.dia} {String(c.numero).padStart(2, "0")} {c.mes}
          </p>
          <p className="text-xs text-cafe/60">
            {hora12(inicio)} – {hora12(inicio + servicio.duracion_min)}
          </p>
        </div>
      </div>
    </div>
  );
}

function BarraInferior({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10">
      <div className="mx-auto max-w-md bg-gradient-to-t from-crema via-crema/95 to-crema/0 px-5 pt-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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
