"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/*
  Röntgenblick – der Zeiger wird zur Durchleuchtung.

  Zwei deckungsgleiche Darstellungen desselben Geräts liegen übereinander:
  oben das intakte Gehäuse, darunter das Innenleben als Radiographie. Eine
  weiche runde Maske gibt exakt dort den Blick nach innen frei, wo der Zeiger
  steht – so, wie wir das Gerät sehen, bevor wir es öffnen.

  Technisch bewusst schlank: die Linse ist eine CSS-Maske, die über zwei
  Custom Properties bewegt wird. Kein Neuzeichnen, kein Layout, reine
  Compositor-Arbeit. Auf Touch zieht der Finger die Linse; ohne Zeiger bleibt
  ein ruhiger Standardausschnitt sichtbar, damit die Sektion auch ohne
  Interaktion vollständig lesbar ist.
*/

const W = 260;
const H = 530;

/** Gehäuse-Ansicht: geschlossen, ruhig, ohne Detail. */
function Shell() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" fill="none">
      <defs>
        <linearGradient id="xr-shell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--surface-sunken)" />
          <stop offset="0.45" stopColor="var(--surface-raised)" />
          <stop offset="1" stopColor="var(--surface-sunken)" />
        </linearGradient>
      </defs>
      <rect
        x="6"
        y="6"
        width={W - 12}
        height={H - 12}
        rx="38"
        fill="url(#xr-shell)"
        stroke="var(--line-strong)"
        strokeWidth="1.5"
      />
      {/* Kamerainsel */}
      <rect
        x="30"
        y="30"
        width="86"
        height="86"
        rx="24"
        fill="var(--surface-sunken)"
        stroke="var(--line)"
        strokeWidth="1.2"
      />
      <circle cx="58" cy="58" r="15" fill="var(--surface-page)" stroke="var(--line-strong)" strokeWidth="1.2" />
      <circle cx="88" cy="88" r="15" fill="var(--surface-page)" stroke="var(--line-strong)" strokeWidth="1.2" />
      {/* Logo-Andeutung */}
      <circle cx={W / 2} cy={H / 2} r="22" fill="none" stroke="var(--line)" strokeWidth="1.4" />
    </svg>
  );
}

/** Innenleben als Radiographie: helle Linien auf tiefem Grund. */
function Internals() {
  const line = "rgba(150,190,255,0.85)";
  const faint = "rgba(120,160,235,0.42)";
  const fill = "rgba(70,110,200,0.16)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" fill="none">
      <defs>
        <radialGradient id="xr-glow" cx="50%" cy="45%" r="70%">
          <stop offset="0" stopColor="#0d1730" />
          <stop offset="1" stopColor="#05080f" />
        </radialGradient>
      </defs>
      <rect x="6" y="6" width={W - 12} height={H - 12} rx="38" fill="url(#xr-glow)" />
      <rect x="6" y="6" width={W - 12} height={H - 12} rx="38" stroke={line} strokeWidth="1.4" />

      {/* Rahmenschrauben */}
      {[
        [24, 26], [W - 24, 26], [24, H - 26], [W - 24, H - 26],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="4.5" stroke={faint} strokeWidth="1.1" />
          <path d={`M${cx - 2.6} ${cy} h5.2M${cx} ${cy - 2.6} v5.2`} stroke={faint} strokeWidth="1" />
        </g>
      ))}

      {/* Kameramodul mit Optikstapel */}
      <rect x="30" y="30" width="86" height="86" rx="20" stroke={line} strokeWidth="1.3" fill={fill} />
      {[[58, 58], [88, 88]].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="16" stroke={line} strokeWidth="1.2" />
          <circle cx={cx} cy={cy} r="11" stroke={faint} strokeWidth="1" />
          <circle cx={cx} cy={cy} r="6" stroke={line} strokeWidth="1.1" />
          <circle cx={cx} cy={cy} r="2.2" fill={line} opacity="0.8" />
        </g>
      ))}
      <rect x="96" y="40" width="14" height="14" rx="4" stroke={faint} strokeWidth="1" />

      {/* Logicboard */}
      <rect x="34" y="132" width={W - 68} height="118" rx="8" stroke={line} strokeWidth="1.3" fill={fill} />
      {/* SoC */}
      <rect x="70" y="158" width="52" height="52" rx="5" stroke={line} strokeWidth="1.2" />
      <rect x="80" y="168" width="32" height="32" rx="3" stroke={faint} strokeWidth="1" />
      {/* Speicher / PMIC */}
      <rect x="134" y="150" width="34" height="26" rx="3" stroke={faint} strokeWidth="1" />
      <rect x="134" y="184" width="34" height="22" rx="3" stroke={faint} strokeWidth="1" />
      <rect x="134" y="214" width="52" height="18" rx="3" stroke={faint} strokeWidth="1" />
      {/* Pins am SoC */}
      {Array.from({ length: 9 }).map((_, i) => (
        <g key={i} stroke={faint} strokeWidth="0.9">
          <line x1={72 + i * 6} y1="158" x2={72 + i * 6} y2="150" />
          <line x1={72 + i * 6} y1="210" x2={72 + i * 6} y2="218" />
        </g>
      ))}
      {/* Leiterbahnen */}
      <path
        d="M44 142h18v-6h26M44 240h40v8h34M186 142h-22v14h-10M186 240h-18v-10h-16"
        stroke={faint}
        strokeWidth="0.9"
      />
      {/* Antennenstecker */}
      <circle cx="46" cy="200" r="5" stroke={line} strokeWidth="1.1" />
      <circle cx="46" cy="200" r="1.8" fill={line} opacity="0.7" />

      {/* Akkuzelle */}
      <rect x="34" y="266" width={W - 68} height="176" rx="10" stroke={line} strokeWidth="1.3" fill={fill} />
      <rect x="46" y="278" width={W - 92} height="152" rx="6" stroke={faint} strokeWidth="1" />
      {/* Zell-Lagen */}
      {Array.from({ length: 5 }).map((_, i) => (
        <line
          key={i}
          x1="46"
          y1={302 + i * 26}
          x2={W - 46}
          y2={302 + i * 26}
          stroke={faint}
          strokeWidth="0.8"
          opacity="0.7"
        />
      ))}
      {/* Akku-Flex zum Board */}
      <path d={`M${W / 2 - 14} 266 v-12 h28 v12`} stroke={line} strokeWidth="1.1" />

      {/* Taptic Engine */}
      <rect x="34" y="456" width="82" height="34" rx="6" stroke={line} strokeWidth="1.2" fill={fill} />
      <rect x="44" y="464" width="46" height="18" rx="3" stroke={faint} strokeWidth="1" />
      <line x1="96" y1="464" x2="96" y2="482" stroke={faint} strokeWidth="1" />

      {/* Lautsprecher + Ladebuchse */}
      <rect x="130" y="456" width="96" height="34" rx="6" stroke={line} strokeWidth="1.2" fill={fill} />
      {Array.from({ length: 7 }).map((_, i) => (
        <circle key={i} cx={144 + i * 12} cy="473" r="3" stroke={faint} strokeWidth="0.9" />
      ))}
      <rect x={W / 2 - 22} y={H - 30} width="44" height="10" rx="5" stroke={line} strokeWidth="1.2" />

      {/* Flexkabel zum Display */}
      <path
        d={`M60 132 v-16 q0 -8 8 -8 h30`}
        stroke={line}
        strokeWidth="1.1"
        opacity="0.9"
      />
    </svg>
  );
}

const HOTSPOTS = [
  { x: 28, y: 14, label: "Kamera" },
  { x: 50, y: 36, label: "Logicboard" },
  { x: 50, y: 67, label: "Akku" },
  { x: 27, y: 89, label: "Taptic" },
  { x: 68, y: 89, label: "Lautsprecher" },
];

export function XRay() {
  const stageRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [radius, setRadius] = useState(120);

  useEffect(() => {
    const stage = stageRef.current;
    const lens = lensRef.current;
    if (!stage || !lens) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Ausgangsposition: leicht oberhalb der Mitte, damit sofort Innenleben
    // sichtbar ist – auch ohne jede Interaktion.
    const pos = { x: 50, y: 42, tx: 50, ty: 42 };
    let raf = 0;

    // Auf dem Container gesetzt, damit Linse und Rand dieselbe Position erben.
    const apply = () => {
      lens.style.setProperty("--x", `${pos.x}%`);
      lens.style.setProperty("--y", `${pos.y}%`);
    };
    apply();

    const tick = () => {
      pos.x += (pos.tx - pos.x) * 0.16;
      pos.y += (pos.ty - pos.y) * 0.16;
      apply();
      if (Math.abs(pos.tx - pos.x) > 0.05 || Math.abs(pos.ty - pos.y) > 0.05) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };

    const move = (clientX: number, clientY: number) => {
      const r = stage.getBoundingClientRect();
      pos.tx = ((clientX - r.left) / r.width) * 100;
      pos.ty = ((clientY - r.top) / r.height) * 100;
      if (reduced) {
        pos.x = pos.tx;
        pos.y = pos.ty;
        apply();
      } else if (!raf) {
        raf = requestAnimationFrame(tick);
      }
    };

    const onPointer = (e: PointerEvent) => {
      setActive(true);
      move(e.clientX, e.clientY);
    };
    const onLeave = () => {
      setActive(false);
      pos.tx = 50;
      pos.ty = 42;
      if (reduced) {
        pos.x = 50;
        pos.y = 42;
        apply();
      } else if (!raf) {
        raf = requestAnimationFrame(tick);
      }
    };

    stage.addEventListener("pointermove", onPointer, { passive: true });
    stage.addEventListener("pointerdown", onPointer, { passive: true });
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointermove", onPointer);
      stage.removeEventListener("pointerdown", onPointer);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
      {/* Steuerung + Legende */}
      <div className="order-1">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex h-9 items-center gap-2 rounded-full px-3.5 font-mono text-[0.75rem] uppercase tracking-[0.12em]"
            style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
          >
            <Icon name="search" size={14} />
            {active ? "Durchleuchtung aktiv" : "Zeiger bewegen"}
          </span>
        </div>

        <p className="mt-5 leading-relaxed text-ink-soft">
          Bewegen Sie den Zeiger über das Gerät – die Linse zeigt, was unter dem
          Gehäuse liegt. Kein Rendering aus dem Katalog, sondern die Bauteile,
          an denen wir tatsächlich arbeiten.
        </p>

        <div className="mt-6">
          <label
            htmlFor="xray-radius"
            className="block text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint"
          >
            Linsengröße
          </label>
          <input
            id="xray-radius"
            type="range"
            min={70}
            max={210}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="mt-2 w-full max-w-xs accent-[var(--accent)]"
          />
        </div>

        <ul className="mt-7 grid grid-cols-2 gap-x-6 gap-y-2.5 border-t border-line pt-6">
          {HOTSPOTS.map((h) => (
            <li key={h.label} className="flex items-center gap-2.5 text-[0.875rem] text-ink">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              {h.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Bühne */}
      <div
        ref={stageRef}
        className="order-2 relative mx-auto touch-none select-none"
        style={{ width: "min(100%, 300px)" }}
      >
        <div
          ref={lensRef}
          className="relative"
          style={{ aspectRatio: `${W} / ${H}`, ["--r" as string]: `${radius}px` }}
        >
          {/* Gehäuse */}
          <div className="absolute inset-0">
            <Shell />
          </div>
          {/* Innenleben, durch die Linse freigelegt */}
          <div className="xray-lens absolute inset-0" aria-hidden="true">
            <Internals />
          </div>
          {/* Linsenrand */}
          <div className="xray-ring pointer-events-none absolute inset-0" aria-hidden="true" />
        </div>
        <p className="mt-4 text-center text-[0.75rem] text-ink-faint">
          Schematische Darstellung eines modernen Smartphones – Aufbau je Modell
          unterschiedlich.
        </p>
      </div>
    </div>
  );
}
