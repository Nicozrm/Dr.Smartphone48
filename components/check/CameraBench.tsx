"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  DARK_FRAMES,
  type DarkResult,
  FIELD_COLS,
  FIELD_ROWS,
  type FieldResult,
  type FocusResult,
  type FocusSample,
  addDarkFrame,
  createDark,
  darkReading,
  downsample,
  evaluateDark,
  evaluateField,
  fieldReading,
  focusReading,
  focusSummary,
  grayFrom,
  sharpness,
} from "@/lib/camera/sensor";

/**
 * Der Kamera-Prüfstand.
 *
 * Die Auswertung steht vollständig in lib/camera/sensor.ts und ist dort ohne
 * Browser prüfbar. Hier steht das, was nur im Browser geht – und vier
 * Entscheidungen, die man beim Weiterbauen leicht rückgängig macht:
 *
 * ## Kein Bild verlässt das Gerät, und keines bleibt liegen
 *
 * Die Bilder werden in ein Canvas gezeichnet, zu Zahlen gerechnet und
 * verworfen. Es gibt keinen Upload, keine Datei, keinen Speicher – dieselbe
 * Zusage wie beim Stethoskop, und hier wiegt sie schwerer: Eine Kamera sieht
 * das Wohnzimmer. Deshalb steht der Satz auch auf der Karte und nicht nur
 * hier im Quelltext.
 *
 * ## Die Aufbereitung wird abgeschaltet, soweit der Browser das zulässt
 *
 * Dieselbe Regel wie beim Mikrofon: Was das Gerät automatisch geradezieht,
 * beseitigt genau den Befund, den die Messung sucht. Für Kameras gibt es
 * keine Schalter wie `noiseSuppression`, aber es gibt `advanced`-Zwänge für
 * Belichtungszeit und Weißabgleich. Wo der Browser sie kennt, werden sie
 * gesetzt; wo nicht, wird nichts behauptet – der Prüfstand meldet dann
 * einfach, was ankommt.
 *
 * ## Gerechnet wird in voller Auflösung, angezeigt in kleiner
 *
 * Ein heißer Bildpunkt ist ein Bildpunkt. Wer das Bild vor der Auswertung
 * verkleinert, mittelt ihn mit 399 gesunden Nachbarn zusammen und findet
 * nie wieder einen. Für die Fleckensuche ist es genau umgekehrt: Dort wird
 * bewusst über ganze Kacheln gemittelt, weil ein einzelnes Rauschkorn kein
 * Staubkorn ist.
 *
 * ## Die Kamera wird freigegeben
 *
 * Wie beim Mikrofon: Beim Verlassen der Seite oder nach der Messung werden
 * alle Spuren gestoppt. Eine Kamera, die nach dem Wegklicken weiterläuft,
 * ist ein Fehler mit Leuchtanzeige.
 */

type Stage = "idle" | "bereit" | "dunkel" | "hell" | "fokus";

/** Auflösung, in der die Schärfe verfolgt wird. Klein genug für 30 Messungen
    je Sekunde, groß genug für Kanten. */
const FOCUS_W = 192;
const FOCUS_H = 144;

/** Wie lange der Fokuslauf misst. */
const FOCUS_MS = 3000;

const num = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

export function CameraBench() {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dark, setDark] = useState<DarkResult | null>(null);
  const [field, setField] = useState<FieldResult | null>(null);
  const [focus, setFocus] = useState<FocusResult | null>(null);
  const [fieldCells, setFieldCells] = useState<number[] | null>(null);
  const [live, setLive] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stopRef = useRef(false);

  /** Ein Canvas, das nie im Dokument hängt – es dient nur als Lesegerät. */
  const scratch = useCallback((w: number, h: number) => {
    let c = canvasRef.current;
    if (!c) {
      c = document.createElement("canvas");
      canvasRef.current = c;
    }
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    return ctx;
  }, []);

  const release = useCallback(() => {
    stopRef.current = true;
    const stream = streamRef.current;
    if (stream) for (const track of stream.getTracks()) track.stop();
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => release(), [release]);

  const open = useCallback(async () => {
    setError(null);
    setBusy(true);
    stopRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setStage("bereit");
    } catch {
      setError(
        "Kein Zugriff auf die Kamera. Entweder wurde die Freigabe abgelehnt, oder der Browser gibt sie nur über eine verschlüsselte Verbindung heraus.",
      );
      setStage("idle");
    } finally {
      setBusy(false);
    }
  }, []);

  /** Ein Bild in voller Auflösung als Helligkeitsfläche. */
  const readFull = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const w = video.videoWidth;
    const h = video.videoHeight;
    const ctx = scratch(w, h);
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    return { gray: grayFrom(data, w * h), w, h };
  }, [scratch]);

  const runDark = useCallback(async () => {
    const first = readFull();
    if (!first) return;
    setStage("dunkel");
    setDark(null);
    const acc = createDark(first.w * first.h);

    for (let i = 0; i < DARK_FRAMES; i++) {
      if (stopRef.current) return;
      const frame = readFull();
      if (!frame) break;
      addDarkFrame(acc, frame.gray);
      setLive((i + 1) / DARK_FRAMES);
      await nextFrame();
    }

    setLive(null);
    setDark(evaluateDark(acc));
    setStage("bereit");
  }, [readFull]);

  const runField = useCallback(() => {
    const frame = readFull();
    if (!frame) return;
    setStage("hell");
    const cells = downsample(frame.gray, frame.w, frame.h, FIELD_COLS, FIELD_ROWS);
    setField(evaluateField(cells, FIELD_COLS, FIELD_ROWS));
    setFieldCells(Array.from(cells));
    setStage("bereit");
  }, [readFull]);

  const runFocus = useCallback(async () => {
    setStage("fokus");
    setFocus(null);
    const samples: FocusSample[] = [];
    const start = performance.now();

    while (performance.now() - start < FOCUS_MS) {
      if (stopRef.current) return;
      const video = videoRef.current;
      const ctx = scratch(FOCUS_W, FOCUS_H);
      if (!video || !ctx) break;
      ctx.drawImage(video, 0, 0, FOCUS_W, FOCUS_H);
      const { data } = ctx.getImageData(0, 0, FOCUS_W, FOCUS_H);
      const gray = grayFrom(data, FOCUS_W * FOCUS_H);
      const value = sharpness(gray, FOCUS_W, FOCUS_H);
      const t = performance.now() - start;
      samples.push({ t, value });
      setLive(t / FOCUS_MS);
      await nextFrame();
    }

    setLive(null);
    setFocus(focusSummary(samples));
    setStage("bereit");
  }, [scratch]);

  const running = stage === "dunkel" || stage === "hell" || stage === "fokus";
  /* Als Menge, nicht als Liste: Die Fläche hat 3.072 Kacheln, und ein
     `includes` je Kachel wäre eine Suche über alle Flecken – dreitausendmal. */
  const spotSet =
    field && field.conclusive ? new Set(field.spots) : new Set<number>();
  const open_ = stage !== "idle";

  return (
    <div className="cam">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl">
          <h3 className="text-title">Kamera-Prüfstand</h3>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Die Kamera ist das teuerste Bauteil im Gerät und das einzige, das
            sich am Tresen nicht prüfen lässt: Das Vorschaubild sieht immer gut
            aus. Drei Messungen holen heraus, was darunter liegt – heiße
            Bildpunkte im Dunkeln, Dreck vor der Linse im Hellen und die Zeit,
            die der Autofokus braucht.
          </p>
          <p className="mt-3 text-sm text-ink-faint">
            Braucht die Kamera-Freigabe. Kein Bild wird gespeichert, keines
            verlässt dieses Gerät – jedes wird gelesen, zu Zahlen gerechnet und
            verworfen. Sie sehen unten nur, was die Kamera gerade sieht.
          </p>
        </div>

        {!open_ ? (
          <button
            type="button"
            onClick={open}
            disabled={busy}
            data-ripple
            className="press inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-accent px-5 text-[0.9375rem] font-medium text-accent-contrast transition-colors"
          >
            {busy ? "Öffne …" : "Kamera freigeben"}
            <Icon name="arrow-right" size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              release();
              setStage("idle");
              setLive(null);
            }}
            className="press inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
          >
            <span className="scope-live" aria-hidden="true" />
            Kamera schließen
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-7 max-w-2xl text-sm leading-relaxed text-ink" role="status">
          {error}
        </p>
      ) : null}

      <div className="cam-stage mt-7" data-open={open_}>
        {/* Das Vorschaubild ist stumm, läuft inline und wird nie aufgezeichnet. */}
        <video ref={videoRef} playsInline muted className="cam-video" />
        {!open_ ? (
          <p className="cam-idle">Kamera aus</p>
        ) : null}
        {live !== null ? (
          <div className="cam-progress" role="progressbar" aria-label="Messung läuft">
            <div style={{ width: `${Math.min(100, live * 100)}%` }} />
          </div>
        ) : null}
      </div>

      {open_ ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={runDark}
            disabled={running}
            className="press inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-sm font-medium text-ink-strong transition-colors hover:border-ink-strong disabled:opacity-50"
          >
            Dunkelbild ({DARK_FRAMES} Bilder)
          </button>
          <button
            type="button"
            onClick={runField}
            disabled={running}
            className="press inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-sm font-medium text-ink-strong transition-colors hover:border-ink-strong disabled:opacity-50"
          >
            Hellbild
          </button>
          <button
            type="button"
            onClick={runFocus}
            disabled={running}
            className="press inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-sm font-medium text-ink-strong transition-colors hover:border-ink-strong disabled:opacity-50"
          >
            Autofokus (3 s)
          </button>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8">
        <section>
          <p className="cam-label">1 · Dunkelbild – heiße Bildpunkte</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Legen Sie einen Finger flach über die Linse, ohne Spalt, und
            starten Sie das Dunkelbild. Gemessen wird über {DARK_FRAMES} Bilder
            je Bildpunkt das <em>Minimum</em>: Ein defekter Punkt leuchtet in
            jedem Bild, ein Lichtschlitz nicht.
          </p>
          {dark ? (
            <>
              <dl className="frames-readout mt-5">
                <div>
                  <dt>Heiße Punkte</dt>
                  <dd className="font-mono tabular-nums" data-warn={dark.conclusive && dark.hot > 0}>
                    {dark.conclusive ? dark.hot : "–"}
                  </dd>
                </div>
                <div>
                  <dt>Ausleserauschen</dt>
                  <dd className="font-mono tabular-nums">
                    {num.format(dark.noise * 100)} %
                  </dd>
                </div>
                <div>
                  <dt>Restlicht</dt>
                  <dd className="font-mono tabular-nums">
                    {num.format(dark.level * 100)} %
                  </dd>
                </div>
                <div>
                  <dt>Bildpunkte</dt>
                  <dd className="font-mono tabular-nums">
                    {(dark.pixels / 1e6).toFixed(1).replace(".", ",")} Mio.
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{darkReading(dark)}</p>
            </>
          ) : null}
        </section>

        <section>
          <p className="cam-label">2 · Hellbild – was vor der Linse sitzt</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Richten Sie die Kamera auf eine weiße Wand oder den hellen Himmel,
            möglichst nah, damit nichts scharf wird. Verglichen wird jede
            Stelle mit ihrer eigenen Umgebung – die Abdunklung zum Rand hin
            gehört zu jedem Objektiv und wird deshalb nicht gemeldet.
          </p>
          {field ? (
            <>
              {fieldCells ? (
                <figure className="mt-5">
                  <div
                    className="cam-field"
                    style={{ gridTemplateColumns: `repeat(${FIELD_COLS}, 1fr)` }}
                    aria-hidden="true"
                  >
                    {fieldCells.map((v, i) => (
                      <span
                        key={i}
                        data-spot={spotSet.has(i) ? "1" : undefined}
                        style={{ opacity: Math.max(0.05, Math.min(1, v)) }}
                      />
                    ))}
                  </div>
                  <figcaption className="mt-3 text-sm leading-relaxed text-ink-soft">
                    {fieldReading(field)}
                  </figcaption>
                </figure>
              ) : null}
            </>
          ) : null}
        </section>

        <section>
          <p className="cam-label">3 · Autofokus – wie lange er braucht</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Halten Sie die Kamera dicht an einen bedruckten Text, drücken Sie
            auf „Autofokus“ und ziehen Sie sie sofort weg. Gemessen wird die
            Kantenschärfe über drei Sekunden, normiert auf die Helligkeit –
            sonst zeigte die Kurve die Belichtungsautomatik statt des Fokus.
          </p>
          {focus ? (
            <>
              <dl className="frames-readout mt-5">
                <div>
                  <dt>Scharf nach</dt>
                  <dd className="font-mono tabular-nums">
                    {focus.conclusive ? `${Math.round(focus.settleMs)} ms` : "–"}
                  </dd>
                </div>
                <div>
                  <dt>Maximum bei</dt>
                  <dd className="font-mono tabular-nums">
                    {focus.conclusive ? `${Math.round(focus.peakAtMs)} ms` : "–"}
                  </dd>
                </div>
                <div>
                  <dt>Zugewinn</dt>
                  <dd className="font-mono tabular-nums">
                    {focus.gain > 0 ? `${num.format(focus.gain)} ×` : "–"}
                  </dd>
                </div>
                <div>
                  <dt>Messwerte</dt>
                  <dd className="font-mono tabular-nums">{focus.samples}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{focusReading(focus)}</p>
            </>
          ) : null}
        </section>
      </div>

      <div className="mt-8 grid max-w-3xl gap-x-10 gap-y-5 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-ink-strong">Was der Prüfstand zeigt</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Fehler, die nach der Bildaufbereitung übrig sind – also genau die,
            die auch auf Ihren Fotos landen. Ein Fleck im Hellbild sitzt vor
            dem Sensor und lässt sich oft schlicht abwischen; sitzt er innen,
            ist es ein Fall für die Werkstatt.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-ink-strong">Was er übersieht</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Defekte Bildpunkte, die der Sensor-Chip selbst schon korrigiert,
            bevor der Browser irgendetwas zu sehen bekommt. Ein sauberes
            Dunkelbild heißt „kein unkorrigierter Fehler übrig“, nicht
            „makelloser Sensor“. Und einen breiten, flachen Belag – eine
            beschlagene oder gleichmäßig verschmierte Linse – findet das
            Hellbild nicht: Er sieht aus wie die Abdunklung zum Rand hin, und
            die wird bewusst herausgerechnet. Gefunden werden begrenzte
            Stellen, nicht ganzflächige.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Ein Bild warten – die Kamera liefert ohnehin nicht schneller. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
