import { createClient } from "@supabase/supabase-js";
import { fechaDe, fechaLarga, hora12, minutosDe } from "@/lib/tiempo";

/**
 * Supabase llama a esta ruta cada vez que se crea una cita (ver supabase/03_aviso_correo.sql)
 * y aquí se envía un correo al estudio con Resend.
 *
 * Variables en Vercel:
 *   RESEND_API_KEY   clave de resend.com
 *   AVISO_EMAIL      correo(s) que reciben el aviso, separados por coma
 *   AVISO_SECRETO    el mismo texto secreto que va en el SQL
 *   AVISO_REMITENTE  (opcional) remitente; por defecto onboarding@resend.dev
 */
export async function POST(req: Request) {
  if (!process.env.AVISO_SECRETO || req.headers.get("x-aviso-secreto") !== process.env.AVISO_SECRETO) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  const para = process.env.AVISO_EMAIL?.split(",").map((s) => s.trim()).filter(Boolean);
  if (!apiKey || !para?.length) return Response.json({ error: "falta configurar el correo" }, { status: 500 });

  const { record } = (await req.json()) as {
    record: {
      servicio_id: string;
      profesional_id: string;
      cliente_nombre: string;
      cliente_telefono: string;
      inicio: string;
      fin: string;
    };
  };

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [s, p] = await Promise.all([
    db.from("servicios").select("nombre").eq("id", record.servicio_id).maybeSingle(),
    db.from("profesionales").select("nombre").eq("id", record.profesional_id).maybeSingle(),
  ]);

  const servicio = s.data?.nombre ?? "Servicio";
  const profesional = p.data?.nombre ?? "—";
  const dia = fechaLarga(fechaDe(record.inicio));
  const hora = `${hora12(minutosDe(record.inicio))} – ${hora12(minutosDe(record.fin))}`;
  const tel = record.cliente_telefono;
  const wa = `https://wa.me/593${tel.replace(/^0/, "")}`;
  const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? "https://beautytoyou.vercel.app";

  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const fila = (k: string, v: string) =>
    `<tr><td style="padding:8px 0;color:#8a7868;font-size:13px">${k}</td><td style="padding:8px 0;text-align:right;color:#4a3b30;font-weight:600">${esc(v)}</td></tr>`;

  const html = `
  <div style="background:#f4ece3;padding:32px 16px;font-family:Helvetica,Arial,sans-serif">
    <div style="max-width:440px;margin:0 auto;background:#fbf7f2;border-radius:24px;padding:28px">
      <p style="margin:0;letter-spacing:4px;font-size:10px;color:#a89584;text-transform:uppercase">Beauty to You · Nueva cita</p>
      <h1 style="margin:8px 0 2px;font-family:Georgia,serif;font-weight:400;color:#4a3b30;font-size:28px">${esc(record.cliente_nombre)}</h1>
      <p style="margin:0 0 18px;color:#8a7868">${esc(servicio)}</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #eadccd">
        ${fila("Día", dia.charAt(0).toUpperCase() + dia.slice(1))}
        ${fila("Hora", hora)}
        ${fila("Con", profesional)}
        ${fila("WhatsApp", tel)}
      </table>
      <a href="${wa}" style="display:block;margin-top:22px;background:#2b211b;color:#fbf7f2;text-decoration:none;text-align:center;padding:14px;border-radius:999px;font-weight:600">Escribirle por WhatsApp</a>
      <a href="${sitio}/admin" style="display:block;margin-top:10px;text-align:center;color:#4a3b30;font-size:13px">Ver agenda</a>
    </div>
  </div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.AVISO_REMITENTE ?? "Beauty to You <onboarding@resend.dev>",
      to: para,
      subject: `Nueva cita: ${record.cliente_nombre} · ${servicio} · ${dia}, ${hora12(minutosDe(record.inicio))}`,
      html,
    }),
  });

  if (!r.ok) {
    const detalle = await r.text();
    console.error("Resend:", detalle);
    return Response.json({ error: "no se pudo enviar", detalle }, { status: 502 });
  }
  return Response.json({ ok: true });
}
