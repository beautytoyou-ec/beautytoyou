type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export const Flecha = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const Atras = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);
export const Adelante = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
export const Compartir = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 3v12M8 7l4-4 4 4M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" />
  </svg>
);
export const Instagram = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r=".6" fill="currentColor" />
  </svg>
);
export const Reloj = ({ className = "size-4" }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const WhatsApp = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 000-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.2 2.2 2.2 0 00.1-1.2c0-.1-.2-.2-.5-.3z" />
  </svg>
);

/* Categorías */
export const IconoUnas = ({ className = "size-7" }: P) => (
  <svg {...base} className={className}>
    <path d="M8 21v-6.5a1.5 1.5 0 013 0V9.5a1.5 1.5 0 013 0v5" />
    <path d="M14 11.5a1.5 1.5 0 013 0v3.5a6 6 0 01-6 6H10a4 4 0 01-3.3-1.8L5 16.5a1.4 1.4 0 012.2-1.7L8 16" />
    <path d="M11 6.5c0-1.5.7-3 1.5-3S14 5 14 6.5" />
  </svg>
);
export const IconoCejas = ({ className = "size-7" }: P) => (
  <svg {...base} className={className}>
    <path d="M3 10c3-3.5 7-4 10-3s5 2 8 1" />
    <path d="M5 15.5c2-2 4.5-2.5 7-2.5s5 .5 7 2.5c-2 2-4.5 2.5-7 2.5s-5-.5-7-2.5z" />
    <circle cx="12" cy="15.5" r="1.6" />
  </svg>
);
export const IconoPestanas = ({ className = "size-7" }: P) => (
  <svg {...base} className={className}>
    <path d="M3 11c2.5 3 5.7 4.5 9 4.5s6.5-1.5 9-4.5" />
    <path d="M6 13.6L4.5 16M9 15l-.8 2.8M12 15.5V18.5M15 15l.8 2.8M18 13.6l1.5 2.4" />
  </svg>
);
export const Destello = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" />
    <path d="M19 16l.6 1.9 1.9.6-1.9.6L19 21l-.6-1.9-1.9-.6 1.9-.6z" />
  </svg>
);

export const Corazon = ({ className = "size-4", lleno = false }: P & { lleno?: boolean }) => (
  <svg {...base} fill={lleno ? "currentColor" : "none"} className={className}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
  </svg>
);
export const Mas = ({ className = "size-4" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 6v12M6 12h12" />
  </svg>
);
export const Check = ({ className = "size-4" }: P) => (
  <svg {...base} strokeWidth={2} className={className}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
