"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

/*
  DeviceExploded – eine interaktive 3D-Explosionszeichnung des Geräts.
  Der Gedanke aus dem Briefing wörtlich genommen: „Think museum exhibition,
  think industrial design." Fünf Schichten schweben in echtem 3D-Raum
  auseinander; der Zeiger kippt die Szene, jede Schicht ist ein
  Reparaturweg mit Preis.

  Bewusst ohne Bibliothek: pure CSS-3D-Transforms (transform-style:
  preserve-3d, translateZ). Die Parallaxe läuft GPU-nah per rAF, das
  Auffächern lebt als CSS-Transition. prefers-reduced-motion schaltet die
  Bewegung ab (statische, gefächerte Ansicht); ohne Zeiger bleibt alles
  bedien- und lesbar. Eine unsichtbare Liste trägt denselben Inhalt
  barrierefrei nach.
*/

interface Layer {
  id: string;
  name: string;
  sub: string;
  price: string;
  /** Z-Ordnung: 0 = vorderste Schicht (Frontglas). */
  depth: number;
  motif: ReactNode;
  /** Befundkarte – wie ein Bauteilbericht aus der Werkstatt. */
  detail: {
    funktion: string;
    ausfall: string;
    dauer: string;
    schwierigkeit: "Routine" | "Erhöht" | "Spezialist";
    teil: string;
    garantie: string;
  };
}

const W = 210;
const H = 430;

const frame = (fill: string, stroke: string, extra?: ReactNode) => (
  <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" fill="none">
    <rect x="4" y="4" width={W - 8} height={H - 8} rx="30" fill={fill} stroke={stroke} strokeWidth="1.5" />
    {extra}
  </svg>
);

const layers: Layer[] = [
  {
    id: "display",
    name: "Display",
    sub: "Frontglas · OLED · Touch",
    price: "ab 129 €",
    depth: 0,
    detail: {
      funktion:
        "Frontglas, OLED-Panel und Touch-Digitizer sind zu einer Einheit verklebt. Sie zeigen das Bild und nehmen jede Berührung entgegen.",
      ausfall:
        "Sturz auf die Kante, Druck in der Hosentasche oder ein Haarriss unter dem Glas. Typisch: Touch reagiert nur teilweise, grüne oder schwarze Streifen, Flackern.",
      dauer: "45 Minuten",
      schwierigkeit: "Routine",
      teil: "Originalteil oder gleichwertiges OLED",
      garantie: "12 Monate auf Teil und Einbau",
    },
    motif: frame(
      "#0b0c0e",
      "rgba(123,160,255,0.5)",
      <>
        <defs>
          <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1a2140" />
            <stop offset="0.5" stopColor="#0b0c0e" />
            <stop offset="1" stopColor="#101a33" />
          </linearGradient>
          <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="12" y="12" width={W - 24} height={H - 24} rx="24" fill="url(#scr)" />
        <rect x="12" y="12" width={W - 24} height={H - 24} rx="24" fill="url(#sheen)" />
        <rect x={W / 2 - 26} y="26" width="52" height="15" rx="7.5" fill="#000" />
        <circle cx={W / 2 + 16} cy="33.5" r="3.4" fill="#12203f" />
      </>,
    ),
  },
  {
    id: "battery",
    name: "Akku",
    sub: "Zelle · Laufzeit · Laden",
    price: "ab 59 €",
    depth: 1,
    detail: {
      funktion:
        "Lithium-Ionen-Zelle mit Lade- und Schutzelektronik. Sie bestimmt Laufzeit, Spitzenleistung und ob das Gerät unter Last stabil bleibt.",
      ausfall:
        "Nach 500 bis 800 Ladezyklen sinkt die Kapazität spürbar. Typisch: plötzliches Abschalten bei 20 Prozent, schnelles Entladen, Aufblähen.",
      dauer: "30 Minuten",
      schwierigkeit: "Routine",
      teil: "Zelle mit geprüfter Zellchemie",
      garantie: "12 Monate auf Teil und Einbau",
    },
    motif: frame(
      "var(--surface-raised)",
      "var(--line-strong)",
      <>
        <rect x="34" y="70" width={W - 68} height={H - 150} rx="16" fill="var(--positive-subtle)" stroke="var(--positive)" strokeWidth="1.5" />
        <rect x={W / 2 - 16} y="58" width="32" height="14" rx="4" fill="var(--positive)" />
        <path d={`M${W / 2 - 6} ${H / 2 - 26} l-16 34 h20 l-8 30 24 -42 h-22 z`} fill="var(--positive)" opacity="0.9" />
      </>,
    ),
  },
  {
    id: "board",
    name: "Diagnose",
    sub: "Logicboard · Ursachenanalyse",
    price: "kostenlos",
    depth: 2,
    detail: {
      funktion:
        "Das Logicboard verbindet alles: Prozessor, Speicher, Strompfade und Antennen. Hier messen wir, bevor wir irgendetwas tauschen.",
      ausfall:
        "Feuchtigkeit, Überspannung durch fremde Ladegeräte oder ein Sturz können einzelne Leiterbahnen unterbrechen. Typisch: kein Bild trotz intaktem Display, Boot-Schleife, kein Laden.",
      dauer: "20 Minuten Messung",
      schwierigkeit: "Spezialist",
      teil: "Keine – zuerst wird gemessen",
      garantie: "Diagnose immer kostenlos",
    },
    motif: frame(
      "var(--surface-sunken)",
      "var(--line-strong)",
      <>
        <rect x="60" y={H / 2 - 42} width="90" height="90" rx="10" fill="var(--surface-raised)" stroke="var(--accent)" strokeWidth="1.5" />
        <rect x="80" y={H / 2 - 22} width="50" height="50" rx="5" fill="var(--accent-subtle)" stroke="var(--accent)" strokeWidth="1.2" />
        {Array.from({ length: 6 }).map((_, i) => (
          <g key={i} stroke="var(--accent)" strokeWidth="1.2" opacity="0.8">
            <line x1={72 + i * 13} y1={H / 2 - 42} x2={72 + i * 13} y2={H / 2 - 52} />
            <line x1={72 + i * 13} y1={H / 2 + 48} x2={72 + i * 13} y2={H / 2 + 58} />
            <line x1="60" y1={H / 2 - 30 + i * 13} x2="50" y2={H / 2 - 30 + i * 13} />
            <line x1="150" y1={H / 2 - 30 + i * 13} x2="160" y2={H / 2 - 30 + i * 13} />
          </g>
        ))}
        <circle cx="150" cy="100" r="6" fill="var(--accent)" opacity="0.5" />
        <rect x="52" y="300" width="36" height="18" rx="4" fill="var(--line-strong)" />
      </>,
    ),
  },
  {
    id: "camera",
    name: "Kamera",
    sub: "Optik · Sensor · Fokus",
    price: "ab 79 €",
    depth: 3,
    detail: {
      funktion:
        "Mehrere Objektive mit Bildsensor und optischer Stabilisierung. Die Mechanik für Autofokus und Bildstabilisierung ist der empfindlichste Teil.",
      ausfall:
        "Ein Sturz verstellt die Stabilisierung, Staub oder ein Kratzer im Deckglas streut das Licht. Typisch: unscharfe Bilder, sichtbares Zittern, Klackern beim Fokussieren.",
      dauer: "40 Minuten",
      schwierigkeit: "Erhöht",
      teil: "Kameramodul inkl. Deckglas",
      garantie: "12 Monate auf Teil und Einbau",
    },
    motif: frame(
      "var(--surface-raised)",
      "var(--line-strong)",
      <>
        <rect x="30" y="30" width="86" height="86" rx="22" fill="var(--surface-sunken)" stroke="var(--line-strong)" strokeWidth="1.5" />
        <circle cx="58" cy="58" r="16" fill="#0b0c0e" stroke="var(--ink-faint)" strokeWidth="1.5" />
        <circle cx="58" cy="58" r="7" fill="#1a2140" />
        <circle cx="90" cy="58" r="16" fill="#0b0c0e" stroke="var(--ink-faint)" strokeWidth="1.5" />
        <circle cx="90" cy="58" r="7" fill="#1a2140" />
        <circle cx="74" cy="90" r="16" fill="#0b0c0e" stroke="var(--ink-faint)" strokeWidth="1.5" />
        <circle cx="74" cy="90" r="7" fill="#1a2140" />
        <circle cx="104" cy="92" r="5" fill="var(--warn)" opacity="0.8" />
      </>,
    ),
  },
  {
    id: "backglass",
    name: "Rückglas",
    sub: "Gehäuse · Rückseite",
    price: "ab 79 €",
    depth: 4,
    detail: {
      funktion:
        "Verklebte Glasrückseite mit Dichtung. Sie schützt Elektronik und Akku und trägt bei vielen Geräten die Antenne für kabelloses Laden.",
      ausfall:
        "Sturz auf eine harte Kante. Ein Riss wirkt kosmetisch, öffnet aber die Dichtung – danach dringt Feuchtigkeit ein und der Folgeschaden wird teuer.",
      dauer: "60 Minuten",
      schwierigkeit: "Erhöht",
      teil: "Rückglas inkl. neuer Dichtung",
      garantie: "12 Monate auf Teil und Einbau",
    },
    motif: frame(
      "var(--surface-raised)",
      "var(--line-strong)",
      <>
        <defs>
          <linearGradient id="back" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--surface-sunken)" />
            <stop offset="0.5" stopColor="var(--surface-raised)" />
            <stop offset="1" stopColor="var(--surface-sunken)" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width={W - 20} height={H - 20} rx="26" fill="url(#back)" />
        <rect x="30" y="30" width="70" height="70" rx="18" fill="var(--surface-sunken)" stroke="var(--line)" strokeWidth="1.2" />
        <circle cx={W / 2} cy={H / 2} r="20" fill="none" stroke="var(--line-strong)" strokeWidth="1.5" />
        <path d={`M${W / 2 - 9} ${H / 2 - 9} a12 12 0 1 0 18 0`} stroke="var(--ink-faint)" strokeWidth="1.5" fill="none" />
      </>,
    ),
  },
];

export function DeviceExploded() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [exploded, setExploded] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  /** Isolierte Schicht („MRT-Schnitt"): tritt nach vorn, Rest weicht zurück. */
  const [focused, setFocused] = useState<Layer | null>(null);

  // In-View: Szene fächert auf.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setActive(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Zeiger-Parallaxe (rAF, eigenständig von den CSS-Transitions der Schichten).
  useEffect(() => {
    const stage = stageRef.current;
    const scene = sceneRef.current;
    if (!stage || !scene) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const cur = { rx: 0, ry: 0, tx: 0, ty: 0 };
    let raf = 0;
    let inside = false;

    const tick = () => {
      cur.rx += (cur.tx - cur.rx) * 0.08;
      cur.ry += (cur.ty - cur.ry) * 0.08;
      scene.style.transform = `rotateX(${(18 + cur.ry).toFixed(2)}deg) rotateY(${cur.rx.toFixed(2)}deg)`;
      if (inside || Math.abs(cur.tx - cur.rx) > 0.05 || Math.abs(cur.ty - cur.ry) > 0.05) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      cur.tx = px * 26;
      cur.ty = -py * 16;
      inside = true;
      kick();
    };
    const onLeave = () => {
      inside = false;
      cur.tx = 0;
      cur.ty = 0;
      kick();
    };
    stage.addEventListener("pointermove", onMove, { passive: true });
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const gap = exploded && active ? 62 : 8;
  const mid = (layers.length - 1) / 2;

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
      {/* Bühne */}
      <div
        ref={stageRef}
        className="relative order-2 flex h-[440px] items-center justify-center lg:order-1 lg:h-[560px]"
        style={{ perspective: "1300px" }}
        aria-hidden="true"
      >
        <div
          ref={sceneRef}
          className="relative"
          style={{
            width: W,
            height: H,
            transformStyle: "preserve-3d",
            transform: "rotateX(18deg) rotateY(0deg)",
            scale: "0.82",
          }}
        >
          {layers.map((l) => {
            const isFocus = focused?.id === l.id;
            const isHover = hovered === l.id || isFocus;
            // Im MRT-Schnitt tritt die gewählte Schicht heraus, alle anderen
            // weichen zurück und verlieren an Präsenz.
            const dim = focused ? !isFocus : hovered !== null && !isHover;
            const z = focused
              ? isFocus
                ? 150
                : (mid - l.depth) * gap - 70
              : (mid - l.depth) * gap + (isHover ? 34 : 0);
            return (
              <button
                key={l.id}
                type="button"
                onPointerEnter={() => setHovered(l.id)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(l.id)}
                onBlur={() => setHovered(null)}
                onClick={() => setFocused((f) => (f?.id === l.id ? null : l))}
                tabIndex={-1}
                aria-label={`${l.name} – Bauteilbefund öffnen`}
                className="group absolute inset-0 rounded-[34px] outline-none"
                style={{
                  transform: `translateZ(${z}px)`,
                  // Ohne explizite Stapelordnung gewinnt die DOM-Reihenfolge das
                  // Hit-Testing: die hinterste Schicht fängt dann die Klicks der
                  // vordersten ab. z-index folgt daher der sichtbaren Tiefe.
                  zIndex: focused ? (isFocus ? layers.length + 1 : 0) : layers.length - l.depth,
                  transition:
                    "transform 720ms var(--ease-out), opacity 360ms var(--ease-out), filter 360ms var(--ease-out)",
                  transitionDelay: active && !focused ? `${l.depth * 55}ms` : "0ms",
                  opacity: active ? (dim ? 0.22 : 1) : 0,
                  filter: dim ? "saturate(0.5) blur(1.5px)" : "none",
                  boxShadow: isHover ? "var(--shadow-floating)" : "var(--shadow-raised)",
                  transformStyle: "preserve-3d",
                  // Zurückgetretene Schichten dürfen keine Klicks mehr abfangen.
                  pointerEvents: dim ? "none" : "auto",
                }}
              >
                <span className="pointer-events-none block h-full w-full">{l.motif}</span>
                {/* Schwebendes Label */}
                <span
                  className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center whitespace-nowrap rounded-full border border-line bg-raised px-3 py-1.5 shadow-floating"
                  style={{
                    transform: `translate(-50%, -50%) translateZ(40px)`,
                    opacity: isHover ? 1 : 0,
                    transition: "opacity 240ms var(--ease-out)",
                  }}
                >
                  <span className="text-[0.8125rem] font-semibold text-ink-strong">{l.name}</span>
                  <span className="font-mono text-[0.6875rem] text-accent">{l.price}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Bodenreflexion */}
        <div
          className="pointer-events-none absolute bottom-10 h-8 w-40 rounded-[50%] blur-xl"
          style={{ background: "var(--line-strong)", opacity: active ? 0.6 : 0 }}
        />
      </div>

      {/* Kontrolle + barrierefreie Liste */}
      <div className="order-1 lg:order-2">
        {focused ? (
          // Bauteilbefund – erscheint anstelle der Steuerung, sobald ein
          // Bauteil isoliert ist. Wie ein Blatt aus der Werkstattakte.
          <div className="glass rounded-[var(--radius-l)] p-6 shadow-floating">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
                  Bauteilbefund
                </p>
                <h3 className="text-title mt-1.5">{focused.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setFocused(null)}
                aria-label="Befund schließen"
                className="-mr-1 -mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sunken hover:text-ink-strong"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint">
                  Funktion
                </dt>
                <dd className="mt-1 text-[0.9375rem] leading-relaxed text-ink">
                  {focused.detail.funktion}
                </dd>
              </div>
              <div>
                <dt className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint">
                  Warum es ausfällt
                </dt>
                <dd className="mt-1 text-[0.9375rem] leading-relaxed text-ink">
                  {focused.detail.ausfall}
                </dd>
              </div>
            </dl>

            <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3.5 border-t border-line pt-5">
              {[
                ["Festpreis", focused.price],
                ["Dauer", focused.detail.dauer],
                ["Aufwand", focused.detail.schwierigkeit],
                ["Ersatzteil", focused.detail.teil],
                ["Garantie", focused.detail.garantie],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-ink-faint">
                    {k}
                  </dt>
                  <dd className="mt-0.5 text-[0.875rem] font-medium text-ink-strong">{v}</dd>
                </div>
              ))}
            </dl>

            <Link
              href="/reparatur"
              data-magnetic=""
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[0.9375rem] font-medium text-white shadow-button transition-colors hover:bg-accent-hover"
              style={{ transitionProperty: "background-color" }}
            >
              Preis für mein Modell
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setExploded((v) => !v)}
            data-magnetic=""
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors duration-[var(--duration-fast)] hover:border-ink-strong"
            style={{ transitionProperty: "border-color, color" }}
          >
            {exploded ? "Zusammenklappen" : "Auffächern"}
            <Icon name={exploded ? "close" : "sparkle"} size={16} />
          </button>
          <p className="text-[0.875rem] text-ink-faint">
            Zeiger bewegen zum Kippen · Bauteil anklicken für den Befund
          </p>
        </div>
        )}

        <ul className="mt-6 divide-y divide-line border-y border-line">
          {layers.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onPointerEnter={() => setHovered(l.id)}
                onPointerLeave={() => setHovered(null)}
                onClick={() => setFocused((f) => (f?.id === l.id ? null : l))}
                aria-expanded={focused?.id === l.id}
                className="group flex w-full items-center justify-between gap-4 py-3.5 text-left"
                aria-label={`${l.name} – Bauteilbefund, ${l.price}`}
              >
                <span className="min-w-0">
                  <span
                    className="block text-[0.9375rem] font-medium text-ink-strong transition-colors"
                    style={{ color: hovered === l.id ? "var(--accent)" : undefined }}
                  >
                    {l.name}
                  </span>
                  <span className="mt-0.5 block text-[0.8125rem] text-ink-soft">{l.sub}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[0.875rem] text-ink-strong">{l.price}</span>
                  <Icon
                    name="arrow-right"
                    size={16}
                    className="text-ink-faint transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5"
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
