import { CONTENT_W, MARGIN_L, MARGIN_R } from "@/lib/invoice/paginate";

/*
  Der Briefkopf.

  Ein Beleg ist das einzige Stück der Marke, das jemand anfasst. Auf dem
  Bildschirm trägt die Seite tiefes Schwarz, Glas und Bewegung – auf Papier
  steht nichts davon zur Verfügung. Was bleibt, ist Geometrie, Strichstärke
  und Typografie.

  Die drei Elemente hier stammen aus dem Wertpapierdruck, nicht aus dem
  Webdesign: eine Mikroschriftlinie statt einer gewöhnlichen Haarlinie, eine
  Guillochenrosette als Wasserzeichen, und eine Millimeterskala am Blattrand.
  Alle drei sind aus einem Meter Entfernung unsichtbar und aus dreißig
  Zentimetern unverwechselbar. Genau das ist der Punkt: Ein Dokument, das man
  nicht in fünf Minuten in Word nachbaut.
*/

/* ---- Mikroschriftlinie --------------------------------------------------- */

/**
 * Was wie eine Haarlinie aussieht, ist ein Schriftzug in 1,1 pt.
 *
 * Klassisches Merkmal von Banknoten und Urkunden: Ein Laserdrucker mit 600 dpi
 * gibt das gestochen wieder, ein Fotokopierer verliert es zu einem grauen
 * Strich. Der Unterschied zwischen Original und Kopie liegt damit im Blatt
 * selbst und nicht in einem aufgedruckten Wort.
 */
export function MicroRule({ text, width = CONTENT_W }: { text: string; width?: number }) {
  // Ein Durchlauf wiegt rund 42 mm; für die volle Breite entsprechend oft.
  const unit = `${text.toUpperCase()}  ·  `;
  const repeats = Math.ceil((width / 42) * 1.4) + 1;

  return (
    <svg
      width={`${width}mm`}
      height="1.4mm"
      viewBox={`0 0 ${width} 1.4`}
      aria-hidden="true"
      className="sheet-micro"
    >
      <text x="0" y="1.05" className="sheet-micro-text">
        {unit.repeat(repeats)}
      </text>
    </svg>
  );
}

/* ---- Guillochenrosette --------------------------------------------------- */

/**
 * Rosette aus überlagerten Epitrochoiden.
 *
 * Keine Grafikdatei, sondern eine Kurvenschar: `x = R·cos t + r·cos(k·t)`.
 * Vier Ringe mit leicht verschobenen Parametern ergeben das Moiré, das man
 * von Aktien und Zertifikaten kennt. Bei 0,05 mm Strichstärke und sehr hellem
 * Grau stört sie den Text nicht und ist trotzdem da.
 */
export function Guilloche({
  size = 44,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const rings = [
    { R: 46, r: 15, k: 7, step: 0.06 },
    { R: 42, r: 19, k: 11, step: 0.055 },
    { R: 38, r: 12, k: 13, step: 0.05 },
    { R: 33, r: 17, k: 5, step: 0.07 },
  ];

  const paths = rings.map(({ R, r, k, step }) => {
    const pts: string[] = [];
    for (let t = 0; t <= Math.PI * 2 + step; t += step) {
      const x = 50 + R * Math.cos(t) + r * Math.cos(k * t);
      const y = 50 + R * Math.sin(t) + r * Math.sin(k * t);
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return `M${pts.join("L")}Z`;
  });

  return (
    <svg
      width={`${size}mm`}
      height={`${size}mm`}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`sheet-guilloche ${className}`}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={0.18} />
      ))}
      <circle cx="50" cy="50" r="17" fill="none" stroke="currentColor" strokeWidth={0.3} />
    </svg>
  );
}

/* ---- Randskala ----------------------------------------------------------- */

/**
 * Millimeterskala im rechten Rand.
 *
 * Eine Werkstatt, die Bauteile auf den Zehntelmillimeter setzt, darf das auf
 * ihrem Briefpapier zeigen. Praktischer Nebennutzen: Wer den Beleg einscannt,
 * hat einen Maßstab im Bild.
 */
export function EdgeScale({ from = 45, to = 250 }: { from?: number; to?: number }) {
  const ticks: { y: number; len: number; label?: string }[] = [];
  for (let y = from; y <= to; y += 5) {
    const major = y % 25 === 0;
    ticks.push({
      y,
      len: major ? 4 : y % 10 === 0 ? 2.6 : 1.4,
      label: y % 50 === 0 ? String(y) : undefined,
    });
  }

  return (
    <svg
      className="sheet-scale"
      width="9mm"
      height={`${to - from + 6}mm`}
      viewBox={`0 0 9 ${to - from + 6}`}
      aria-hidden="true"
      style={{ top: `${from - 3}mm` }}
    >
      {ticks.map((t) => (
        <g key={t.y}>
          <line
            x1={0}
            y1={t.y - from + 3}
            x2={t.len}
            y2={t.y - from + 3}
            stroke="currentColor"
            strokeWidth={0.15}
          />
          {t.label && (
            <text x={5} y={t.y - from + 3.55} className="sheet-scale-text">
              {t.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/* ---- Bildmarke ----------------------------------------------------------- */

/** Bildmarke für den Druck – dieselbe Geometrie wie im Kopf der Website. */
export function SheetMark({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={`${size}mm`}
      height={`${size}mm`}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="sheet-mark-logo"
    >
      <rect
        x="7.25"
        y="2.25"
        width="17.5"
        height="27.5"
        rx="4.25"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M16 9.5v13M9.5 16h13"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="square"
      />
    </svg>
  );
}

/* ---- Stempel ------------------------------------------------------------- */

/**
 * Gummistempel-Optik: Doppelrahmen, gesperrte Versalien, leichte Schräglage.
 *
 * Bewusst kein sauberer Kasten. Ein Stempel, der exakt achsparallel sitzt,
 * sieht nach Textverarbeitung aus; die vier Grad Schräge machen ihn zu einem
 * Vermerk, den jemand gesetzt hat.
 */
export function Stamp({
  text,
  tone = "dark",
  style,
}: {
  text: string;
  tone?: "dark" | "muted";
  style?: React.CSSProperties;
}) {
  return (
    <div className={`sheet-stamp sheet-stamp-${tone}`} style={style} aria-hidden="true">
      <span>{text}</span>
    </div>
  );
}

/* ---- Kopfzeile Folgeseiten ----------------------------------------------- */

export function ContinuationHead({
  wordmark,
  docLabel,
  number,
  page,
  pages,
}: {
  wordmark: string;
  docLabel: string;
  number: string;
  page: number;
  pages: number;
}) {
  return (
    <header
      className="absolute"
      style={{ left: `${MARGIN_L}mm`, right: `${MARGIN_R}mm`, top: "16mm" }}
    >
      <div className="flex items-baseline justify-between gap-6">
        <span className="sheet-cont-brand">{wordmark}</span>
        <span className="sheet-cont-meta">
          {docLabel} {number} · Seite {page} von {pages}
        </span>
      </div>
      <div className="sheet-hairline" style={{ marginTop: "2mm" }} />
    </header>
  );
}
