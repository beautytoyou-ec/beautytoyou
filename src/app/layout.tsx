import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "./globals.css";

const titulo = "Beauty to You · Agenda tu cita";
const descripcion = "Reserva tu cita de uñas, cejas o pestañas en Beauty to You, Portoviejo.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://beautytoyou.vercel.app"),
  title: titulo,
  description: descripcion,
  openGraph: {
    title: titulo,
    description: descripcion,
    siteName: "Beauty to You",
    locale: "es_EC",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: titulo, description: descripcion },
};

export const viewport: Viewport = {
  themeColor: "#F4ECE3",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
