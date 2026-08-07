"use client";

import { useId, useState } from "react";
import {
  DEPTH_MAX,
  DEPTH_MIN,
  TIP_MAX,
  TIP_MIN,
  flaws,
  formatLength,
  remainingStrength,
  stressConcentration,
} from "@/lib/motion/crack";

/**
 * Die Spannungslinse – warum „nur ein Kratzer" keiner ist.
 *
 * Glas bricht nicht, weil es überall zu schwach wäre, sondern an einem
 * Fehler: An dessen Spitze bündelt sich die Spannung wie Licht in einer
 * Linse. Die Rechnung dazu steht in `lib/motion/crack.ts` und ist von 1913.
 *
 * Die Zahl daneben ist echt. Das Bild darunter ist ein **Schema** und sagt
 * das auch: Die Linien zeigen, dass sich der Kraftfluss vor der Spitze
 * staut, nicht wie stark. Eine echte Spannungsverteilung wäre eine
 * Finite-Elemente-Rechnung, und die hier zu behaupten wäre genau die Sorte
 * Genauigkeit, die niemand pflegt – dieselbe Überlegung wie beim
 * PWM-Diagramm auf derselben Seite.
 *
 * Die Schieber laufen logarithmisch. Linear wäre der ganze interessante
 * Bereich – Zehntelmikrometer bis Mikrometer an der Spitze – in den ersten
 * zwei Prozent des Wegs zusammengedrückt.
 */

const VIEW_W = 560;
const VIEW_H = 240;
const LINES = 17;

const factorFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const percentFormat = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Schieberstellung 0…1 auf einen Wert zwischen min und max, logarithmisch. */
function fromSlider(position: number, min: number, max: number): number {
  return min * (max / min) ** position;
}
function toSlider(value: number, min: number, max: number): number {
  return Math.log(value / min) / Math.log(max / min);
}

export function CrackTip() {
  const id = useId().replace(/:/g, "");
  const [depth, setDepth] = useState(0.00002);
  const [tip, setTip] = useState(0.000001);

  const factor = stressConcentration(depth, tip);
  const rest = remainingStrength(factor);

  /* Die Kerbe im Bild folgt der Tiefe, aber gedämpft: Bei linearer Abbildung
     wäre der Riss bei 1 mm über das ganze Bild und der Kratzer bei 2 µm
     unsichtbar. Gezeigt wird die Größenordnung, nicht der Maßstab. */
  const notch =
    VIEW_H * 0.12 +
    VIEW_H * 0.55 * (Math.log(depth / DEPTH_MIN) / Math.log(DEPTH_MAX / DEPTH_MIN));

  /* Wie stark die Linien vor der Spitze zusammenrücken. Gedeckelt, weil das
     Bild sonst bei Faktor 200 nur noch ein schwarzer Strich wäre. */
  const crowd = Math.min(1, Math.log10(factor) / 2.4);

  return (
    <div className="crack">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <div>
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="crack-plate"
            role="img"
            aria-label={`Schema: Kraftfluss um einen ${formatLength(depth)} tiefen Fehler mit ${formatLength(tip)} Spitzenradius`}
          >
            <defs>
              <clipPath id={`${id}-plate`}>
                <rect x="0" y="0" width={VIEW_W} height={VIEW_H} rx="6" />
              </clipPath>
            </defs>

            <g clipPath={`url(#${id}-plate)`}>
              <rect width={VIEW_W} height={VIEW_H} className="crack-glass" />

              {/* Die Kraftlinien. Sie laufen waagerecht durch die Scheibe und
                  müssen die Kerbe umgehen – vor der Spitze rücken sie
                  zusammen, und genau dort bricht das Glas. */}
              {Array.from({ length: LINES }, (_, i) => {
                const y = ((i + 0.5) / LINES) * VIEW_H;
                const belowTip = y - notch;
                // Nur Linien unterhalb der Spitze werden gestaucht, und zwar
                // umso mehr, je näher sie ihr sind.
                const nearness =
                  belowTip > 0 ? Math.exp(-belowTip / (VIEW_H * 0.16)) : 0;
                const push = belowTip > 0 ? 0 : -belowTip + 10;
                const shift = nearness * crowd * VIEW_H * 0.1;
                const yMid = y > notch ? y + shift : notch + push * 0.12 + 6;

                return (
                  <path
                    key={i}
                    d={`M0 ${y.toFixed(1)} C${VIEW_W * 0.34} ${y.toFixed(1)}, ${
                      VIEW_W * 0.42
                    } ${yMid.toFixed(1)}, ${VIEW_W / 2} ${yMid.toFixed(1)} C${
                      VIEW_W * 0.58
                    } ${yMid.toFixed(1)}, ${VIEW_W * 0.66} ${y.toFixed(1)}, ${VIEW_W} ${y.toFixed(1)}`}
                    className="crack-flow"
                    style={{ opacity: 0.25 + nearness * crowd * 0.7 }}
                  />
                );
              })}

              {/* Die Kerbe selbst: oben so breit wie das Auge sie braucht,
                  unten auf die Spitze zulaufend. */}
              <path
                d={`M${VIEW_W / 2 - 7} -2 L${VIEW_W / 2 - 1.2} ${notch.toFixed(1)} L${
                  VIEW_W / 2 + 1.2
                } ${notch.toFixed(1)} L${VIEW_W / 2 + 7} -2 Z`}
                className="crack-notch"
              />
              <circle
                cx={VIEW_W / 2}
                cy={notch}
                r={4 + crowd * 5}
                className="crack-hotspot"
              />
            </g>

            {/* Zugrichtung – ohne sie ist nicht klar, wonach das Bild fragt. */}
            <g className="crack-load">
              <path d={`M8 ${VIEW_H / 2} L34 ${VIEW_H / 2}`} />
              <path d={`M8 ${VIEW_H / 2} l7 -4 M8 ${VIEW_H / 2} l7 4`} />
              <path d={`M${VIEW_W - 8} ${VIEW_H / 2} L${VIEW_W - 34} ${VIEW_H / 2}`} />
              <path
                d={`M${VIEW_W - 8} ${VIEW_H / 2} l-7 -4 M${VIEW_W - 8} ${VIEW_H / 2} l-7 4`}
              />
            </g>
          </svg>

          <p className="mt-3 text-sm text-ink-faint">
            Schema, keine Simulation: Die Linien zeigen, dass sich der
            Kraftfluss vor der Spitze staut – nicht, wie stark. Die Zahl
            daneben ist gerechnet.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">
            Spannung an der Spitze
          </p>
          <p className="crack-factor tabular-nums">
            {Number.isFinite(factor) ? `${factorFormat.format(factor)}×` : "∞"}
          </p>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Das Glas trägt hier noch{" "}
            <strong className="font-semibold text-ink-strong">
              {percentFormat.format(rest * 100)} %
            </strong>{" "}
            der Last, die es ohne diesen Fehler getragen hätte.
          </p>

          <div className="mt-7 space-y-5">
            <label className="block">
              <span className="flex items-baseline justify-between text-sm font-medium text-ink-strong">
                Tiefe des Fehlers
                <span className="font-mono text-xs font-normal text-ink-faint tabular-nums">
                  {formatLength(depth)}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={toSlider(depth, DEPTH_MIN, DEPTH_MAX)}
                onChange={(e) =>
                  setDepth(fromSlider(Number(e.target.value), DEPTH_MIN, DEPTH_MAX))
                }
                className="crack-slider"
              />
            </label>

            <label className="block">
              <span className="flex items-baseline justify-between text-sm font-medium text-ink-strong">
                Schärfe der Spitze
                <span className="font-mono text-xs font-normal text-ink-faint tabular-nums">
                  {formatLength(tip)}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                // Umgedreht: rechts soll schärfer heißen, und schärfer ist
                // der kleinere Radius. Ein Schieber, der nach rechts weniger
                // bedeutet, wird falsch bedient.
                value={1 - toSlider(tip, TIP_MIN, TIP_MAX)}
                onChange={(e) =>
                  setTip(fromSlider(1 - Number(e.target.value), TIP_MIN, TIP_MAX))
                }
                className="crack-slider"
              />
            </label>
          </div>

          <p className="mt-7 text-xs uppercase tracking-[0.12em] text-ink-faint">
            Typische Fälle
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {flaws.map((flaw) => {
              const active =
                Math.abs(depth - flaw.depth) < flaw.depth * 0.02 &&
                Math.abs(tip - flaw.tip) < flaw.tip * 0.02;
              return (
                <button
                  key={flaw.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setDepth(flaw.depth);
                    setTip(flaw.tip);
                  }}
                  className={`press h-9 rounded-full border px-3.5 text-[0.8125rem] transition-colors ${
                    active
                      ? "border-accent bg-accent text-accent-contrast"
                      : "border-line-strong text-ink-strong hover:border-ink-strong"
                  }`}
                >
                  {flaw.label}
                </button>
              );
            })}
          </div>

          {flaws.map((flaw) =>
            Math.abs(depth - flaw.depth) < flaw.depth * 0.02 &&
            Math.abs(tip - flaw.tip) < flaw.tip * 0.02 ? (
              <p key={flaw.id} className="mt-4 text-sm leading-relaxed text-ink-soft">
                {flaw.note}
              </p>
            ) : null,
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-x-10 gap-y-5 border-t border-line pt-7 sm:grid-cols-2">
        <p className="text-sm leading-relaxed text-ink-soft">
          Gerechnet nach Inglis (1913):{" "}
          <span className="font-mono text-[0.8em]">σ = σ₀ · (1 + 2 · √(a / ρ))</span>{" "}
          mit der Tiefe a und dem Spitzenradius ρ. Die Formel gilt für ein
          elliptisches Loch in einer unendlich ausgedehnten Platte unter
          gleichmäßigem Zug – eine Idealisierung. Die moderne Bruchmechanik
          rechnet mit Spannungsintensitätsfaktoren, weil die Spannung an einer
          wirklich scharfen Spitze rechnerisch über alle Grenzen wächst, ein
          Werkstoff aber nicht.
        </p>
        <p className="text-sm leading-relaxed text-ink-soft">
          Für die Frage hier ist die alte Formel trotzdem die bessere: Ihre
          Aussage – die Schärfe zählt mehr als die Tiefe – gilt auch in der
          modernen Rechnung, und sie liefert eine Zahl, die man versteht. Sie
          erklärt drei Dinge auf einmal: warum das Display beim zweiten,
          harmloseren Sturz bricht; warum ein Riss ohne neuen Anlass
          weiterwandert; und warum eine Schutzfolie mehr bringt, als sie
          aussieht – sie fängt die Kratzer ab, nicht die Stöße.
        </p>
      </div>
    </div>
  );
}
