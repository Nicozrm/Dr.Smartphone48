import type { DiagramPart } from "@/lib/data/devices";

interface DeviceDiagramProps {
  highlight?: DiagramPart | null;
  className?: string;
}

/**
 * Schematische Explosionszeichnung eines Smartphones im Stil einer
 * technischen Zeichnung. Das ausgewählte Bauteil wird präzise hervorgehoben –
 * keine Dekoration, sondern Orientierung.
 */
export function DeviceDiagram({ highlight = null, className = "" }: DeviceDiagramProps) {
  const partProps = (part: DiagramPart) => {
    const active = highlight === part || highlight === "full";
    return {
      stroke: active ? "var(--accent)" : "var(--ink-faint)",
      fill: active ? "var(--accent-subtle)" : "transparent",
      strokeWidth: active ? 2 : 1.5,
      style: {
        transition:
          "stroke var(--duration-base) var(--ease-out), fill var(--duration-base) var(--ease-out), stroke-width var(--duration-base) var(--ease-out)",
      },
    };
  };

  const bodyActive = highlight === "full";

  return (
    <svg
      viewBox="0 0 320 420"
      role="img"
      aria-label="Schematische Darstellung des Geräts mit hervorgehobenem Bauteil"
      className={className}
      fill="none"
    >
      {/* Raster im Hintergrund – Werkstatt-Zeichnung */}
      <g stroke="var(--line)" strokeWidth="1">
        {Array.from({ length: 7 }, (_, i) => (
          <line key={`v${i}`} x1={40 + i * 40} y1={10} x2={40 + i * 40} y2={410} />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <line key={`h${i}`} x1={20} y1={30 + i * 40} x2={300} y2={30 + i * 40} />
        ))}
      </g>

      {/* Gehäuse */}
      <rect
        x="90"
        y="40"
        width="140"
        height="290"
        rx="26"
        stroke={bodyActive ? "var(--accent)" : "var(--ink-soft)"}
        strokeWidth={bodyActive ? 2 : 1.5}
        fill={bodyActive ? "var(--accent-subtle)" : "var(--surface-raised)"}
        style={{
          transition:
            "stroke var(--duration-base) var(--ease-out), fill var(--duration-base) var(--ease-out)",
        }}
      />

      {/* Display / Frontglas */}
      <rect x="100" y="50" width="120" height="270" rx="18" {...partProps("screen")} />

      {/* Kameramodul */}
      <g {...partProps("camera")}>
        <rect x="106" y="58" width="52" height="52" rx="12" />
        <circle cx="121" cy="73" r="7" />
        <circle cx="143" cy="95" r="7" />
        <circle cx="143" cy="73" r="2.5" />
      </g>

      {/* Akku */}
      <g {...partProps("battery")}>
        <rect x="112" y="140" width="96" height="120" rx="10" />
        <line x1="112" y1="170" x2="208" y2="170" strokeWidth="1" />
        <line x1="112" y1="200" x2="208" y2="200" strokeWidth="1" />
        <line x1="112" y1="230" x2="208" y2="230" strokeWidth="1" />
      </g>

      {/* Logic Board */}
      <g {...partProps("board")}>
        <rect x="196" y="60" width="22" height="70" rx="5" />
        <rect x="201" y="78" width="12" height="12" rx="2" />
        <line x1="201" y1="100" x2="213" y2="100" strokeWidth="1" />
        <line x1="201" y1="108" x2="213" y2="108" strokeWidth="1" />
      </g>

      {/* Lautsprecher */}
      <g {...partProps("speaker")}>
        <rect x="118" y="278" width="50" height="30" rx="8" />
        <line x1="127" y1="286" x2="127" y2="300" strokeWidth="1" />
        <line x1="135" y1="286" x2="135" y2="300" strokeWidth="1" />
        <line x1="143" y1="286" x2="143" y2="300" strokeWidth="1" />
        <line x1="151" y1="286" x2="151" y2="300" strokeWidth="1" />
        <line x1="159" y1="286" x2="159" y2="300" strokeWidth="1" />
      </g>

      {/* Ladebuchse */}
      <g {...partProps("port")}>
        <rect x="178" y="284" width="30" height="18" rx="7" />
        <rect x="184" y="290" width="18" height="6" rx="3" strokeWidth="1" />
      </g>

      {/* Rückglas – separat rechts angedeutet (Explosionsansicht) */}
      <rect
        x="248"
        y="76"
        width="44"
        height="218"
        rx="16"
        {...partProps("back")}
      />
      <line
        x1="234"
        y1="185"
        x2="246"
        y2="185"
        stroke="var(--ink-faint)"
        strokeWidth="1"
        strokeDasharray="3 4"
      />

      {/* Maßlinien – technische Anmutung */}
      <g stroke="var(--ink-faint)" strokeWidth="1">
        <line x1="66" y1="40" x2="66" y2="330" />
        <line x1="60" y1="40" x2="72" y2="40" />
        <line x1="60" y1="330" x2="72" y2="330" />
      </g>
      <text
        x="52"
        y="190"
        fill="var(--ink-faint)"
        fontSize="10"
        fontFamily="var(--font-geist-mono)"
        transform="rotate(-90 52 190)"
        textAnchor="middle"
      >
        146,6 mm
      </text>
    </svg>
  );
}
