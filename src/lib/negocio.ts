export const NEGOCIO = {
  nombre: "Beauty to You",
  ciudad: "Portoviejo",
  whatsapp: "593978653077", // 097 865 3077 en formato internacional
  whatsappVisible: "097 865 3077",
  instagram: "https://instagram.com/beautytoyou.ec",
};

export function enlaceWhatsApp(texto: string): string {
  return `https://wa.me/${NEGOCIO.whatsapp}?text=${encodeURIComponent(texto)}`;
}

/** Acepta 09XXXXXXXX, 9XXXXXXXX, +5939XXXXXXXX. Devuelve 09XXXXXXXX o null. */
export function normalizarCelular(valor: string): string | null {
  let d = valor.replace(/\D/g, "");
  if (d.startsWith("593")) d = d.slice(3);
  if (d.length === 9 && d.startsWith("9")) d = "0" + d;
  return /^09\d{8}$/.test(d) ? d : null;
}
