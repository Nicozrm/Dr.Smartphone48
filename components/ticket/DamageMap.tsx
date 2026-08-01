"use client";

import { Icon, type IconName } from "@/components/ui/Icon";

/*
  Schadenskarte – die Idee stammt aus der Fahrzeugübergabe und fehlt in
  unserer Branche vollständig.

  Wer ein Gerät abgibt, kann hinterher nicht mehr beweisen, welcher Kratzer
  schon vorher da war. Also hält ihn hier der Kunde selbst fest, vor der
  Übergabe, auf Vorder- und Rückseite. Die Marken sind nummeriert und
  erscheinen im gedruckten Protokoll – ein Blatt, das beide Seiten
  unterschreiben.

  Nichts davon verlässt den Browser. Das Protokoll entsteht auf Papier oder
  als PDF über die Druckfunktion, nicht auf einem Server.
*/

export type MarkKind = "kratzer" | "riss" | "delle" | "feucht";

export interface Mark {
  id: number;
  side: "front" | "back";
  /** Relative Position im Gehäuse, jeweils 0 bis 1. */
  x: number;
  y: number;
  kind: MarkKind;
}

export const markKinds: {
  id: MarkKind;
  label: string;
  short: string;
  icon: IconName;
  hint: string;
}[] = [
  { id: "kratzer", label: "Kratzer", short: "K", icon: "sparkle", hint: "Oberfläche angegriffen, Glas geschlossen" },
  { id: "riss", label: "Riss / Bruch", short: "R", icon: "close", hint: "Glas durchbrochen, Splittergefahr" },
  { id: "delle", label: "Delle / Verzug", short: "D", icon: "tool", hint: "Rahmen verformt, Gehäuse steht ab" },
  { id: "feucht", label: "Feuchtigkeit", short: "F", icon: "waveform", hint: "Beschlag, Rand oder Kontakt sichtbar" },
];

interface DamageMapProps {
  marks: Mark[];
  active: MarkKind;
  onActiveChange: (kind: MarkKind) => void;
  onAdd: (side: "front" | "back", x: number, y: number) => void;
  onRemove: (id: number) => void;
}

/** Ein Gehäuse-Umriss – die Formsprache des Gerätediagramms, stark reduziert. */
function Shell({
  side,
  marks,
  onAdd,
  onRemove,
}: {
  side: "front" | "back";
  marks: Mark[];
  onAdd: (side: "front" | "back", x: number, y: number) => void;
  onRemove: (id: number) => void;
}) {
  const handleClick = (event: React.MouseEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    onAdd(side, Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)));
  };

  return (
    <div className="flex-1">
      <p className="mb-2 text-center font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
        {side === "front" ? "Vorderseite" : "Rückseite"}
      </p>
      <svg
        viewBox="0 0 100 200"
        className="mx-auto block h-auto w-full max-w-[150px]"
        aria-label={`Schadenskarte ${side === "front" ? "Vorderseite" : "Rückseite"}`}
      >
        <rect
          x="2"
          y="2"
          width="96"
          height="196"
          rx="14"
          fill="var(--surface-sunken)"
          stroke="var(--line-strong)"
          strokeWidth="1"
        />
        {side === "front" ? (
          <>
            {/* Display-Fläche und Hörmuschel */}
            <rect
              x="7"
              y="7"
              width="86"
              height="186"
              rx="10"
              fill="var(--surface-raised)"
              stroke="var(--line)"
              strokeWidth="0.75"
            />
            <rect x="38" y="11" width="24" height="3" rx="1.5" fill="var(--line-strong)" />
          </>
        ) : (
          <>
            {/* Kameramodul */}
            <rect
              x="9"
              y="9"
              width="34"
              height="34"
              rx="9"
              fill="var(--surface-raised)"
              stroke="var(--line)"
              strokeWidth="0.75"
            />
            <circle cx="20" cy="20" r="5" fill="var(--surface-sunken)" stroke="var(--line-strong)" strokeWidth="0.75" />
            <circle cx="32" cy="32" r="5" fill="var(--surface-sunken)" stroke="var(--line-strong)" strokeWidth="0.75" />
          </>
        )}

        {/* Aufnahmefläche – liegt über allem, damit jeder Punkt erreichbar ist */}
        <rect
          x="2"
          y="2"
          width="96"
          height="196"
          rx="14"
          fill="transparent"
          className="cursor-crosshair"
          onClick={handleClick}
        />

        {marks.map((mark) => (
          <g
            key={mark.id}
            transform={`translate(${2 + mark.x * 96} ${2 + mark.y * 196})`}
            className="cursor-pointer"
            onClick={() => onRemove(mark.id)}
          >
            <title>{`Marke ${mark.id} entfernen`}</title>
            <circle r="7" fill="var(--surface-raised)" stroke="var(--ink-strong)" strokeWidth="1.25" />
            <text
              y="3.2"
              textAnchor="middle"
              fontSize="8"
              fontWeight="600"
              fill="var(--ink-strong)"
              style={{ fontFamily: "var(--font-geist-mono), monospace" }}
            >
              {mark.id}
            </text>
          </g>
        ))}
      </svg>

      {/* Ohne Zeigegerät: neun benannte Felder statt einer Klickfläche.
          Eine Schadenskarte, die sich nur mit der Maus ausfüllen lässt, ist
          für einen Teil der Kundschaft gar keine. */}
      <details className="mt-3" data-print="hide">
        <summary className="cursor-pointer text-center text-[0.75rem] text-ink-faint transition-colors hover:text-ink-strong">
          Ohne Maus setzen
        </summary>
        <div
          role="group"
          aria-label={`Bereich auf der ${side === "front" ? "Vorderseite" : "Rückseite"} wählen`}
          className="mx-auto mt-2 grid max-w-[150px] grid-cols-3 gap-1"
        >
          {zones.map((zone) => (
            <button
              key={zone.label}
              type="button"
              onClick={() => onAdd(side, zone.x, zone.y)}
              className="rounded-[6px] border border-line py-1.5 text-[0.625rem] leading-tight text-ink-soft transition-colors hover:border-ink-faint hover:text-ink-strong"
            >
              {zone.label}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

/** Neun benannte Felder – die Tastatur-Entsprechung der Klickfläche. */
const zones: { label: string; x: number; y: number }[] = [
  { label: "oben links", x: 0.22, y: 0.14 },
  { label: "oben", x: 0.5, y: 0.1 },
  { label: "oben rechts", x: 0.78, y: 0.14 },
  { label: "links", x: 0.16, y: 0.5 },
  { label: "Mitte", x: 0.5, y: 0.5 },
  { label: "rechts", x: 0.84, y: 0.5 },
  { label: "unten links", x: 0.22, y: 0.86 },
  { label: "unten", x: 0.5, y: 0.9 },
  { label: "unten rechts", x: 0.78, y: 0.86 },
];

export function DamageMap({
  marks,
  active,
  onActiveChange,
  onAdd,
  onRemove,
}: DamageMapProps) {
  return (
    <div>
      {/* Werkzeugauswahl – im Druck überflüssig */}
      <div className="flex flex-wrap gap-2" data-print="hide">
        {markKinds.map((kind) => {
          const isActive = kind.id === active;
          return (
            <button
              key={kind.id}
              type="button"
              onClick={() => onActiveChange(kind.id)}
              aria-pressed={isActive}
              title={kind.hint}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[0.8125rem] transition-colors duration-[var(--duration-fast)] ${
                isActive
                  ? "border-accent bg-accent-subtle font-medium text-accent"
                  : "border-line text-ink-soft hover:border-ink-faint hover:text-ink-strong"
              }`}
            >
              <Icon name={kind.icon} size={14} />
              {kind.label}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[0.8125rem] text-ink-soft" data-print="hide">
        Tippen Sie auf die Stelle, an der der Schaden sitzt. Ein Tipp auf eine
        gesetzte Marke entfernt sie wieder.
      </p>

      <div className="mt-5 flex gap-6">
        <Shell
          side="front"
          marks={marks.filter((m) => m.side === "front")}
          onAdd={onAdd}
          onRemove={onRemove}
        />
        <Shell
          side="back"
          marks={marks.filter((m) => m.side === "back")}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      </div>

      {/* Legende – der Teil, der im Protokoll zählt */}
      <div className="mt-6 border-t border-line pt-5">
        {marks.length === 0 ? (
          <p className="text-[0.875rem] text-ink-soft">
            Noch nichts markiert. Ein Gerät ohne Vorschäden ist genauso eine
            Aussage – dann bleibt dieses Feld leer.
          </p>
        ) : (
          <ol className="grid gap-2 sm:grid-cols-2">
            {marks.map((mark) => {
              const kind = markKinds.find((k) => k.id === mark.kind)!;
              return (
                <li key={mark.id} className="flex items-baseline gap-2.5 text-[0.875rem]">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-[0.6875rem] text-ink-strong">
                    {mark.id}
                  </span>
                  <span className="min-w-0 flex-1 text-ink">
                    {kind.label}
                    <span className="text-ink-faint">
                      {" · "}
                      {mark.side === "front" ? "Vorderseite" : "Rückseite"}
                    </span>
                  </span>
                  {/* Der Weg zum Löschen ohne Zeigegerät – auf dem Ausdruck
                      wäre ein Löschknopf sinnlos. */}
                  <button
                    type="button"
                    onClick={() => onRemove(mark.id)}
                    aria-label={`Marke ${mark.id}, ${kind.label}, entfernen`}
                    data-print="hide"
                    className="-my-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-sunken hover:text-ink-strong"
                  >
                    <Icon name="close" size={13} />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
