"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { site } from "@/lib/site";

/*
  DeviceCheck – eine ehrliche Selbstdiagnose des Besuchergeräts, komplett im
  Browser. Jeder Test läuft lokal; nichts wird gesendet. Ergebnisse fließen in
  einen Befund, der bei Auffälligkeiten den passenden Reparaturweg vorschlägt.

  Warum es das so kaum gibt: Die nötigen Web-APIs (Sensoren, Audio, Akku)
  existieren, werden aber selten zu einem ruhigen, verständlichen Ganzen
  zusammengefügt. Genau das ist hier der Anspruch.
*/

type Status = "idle" | "running" | "pass" | "warn" | "fail" | "info" | "na";

interface Result {
  status: Status;
  summary: string;
  /** Reparatur-Empfehlung fürs Befund-Fazit, falls auffällig. */
  advise?: string;
}

type ReportFn = (id: string, r: Result) => void;

const statusMeta: Record<Status, { label: string; color: string; subtle: string }> = {
  idle: { label: "Bereit", color: "var(--ink-soft)", subtle: "var(--surface-sunken)" },
  running: { label: "Läuft", color: "var(--accent)", subtle: "var(--accent-subtle)" },
  pass: { label: "In Ordnung", color: "var(--positive)", subtle: "var(--positive-subtle)" },
  warn: { label: "Prüfen", color: "var(--warn)", subtle: "var(--warn-subtle)" },
  fail: { label: "Auffällig", color: "var(--danger)", subtle: "var(--danger-subtle)" },
  info: { label: "Info", color: "var(--ink-soft)", subtle: "var(--surface-sunken)" },
  na: { label: "Nicht verfügbar", color: "var(--ink-faint)", subtle: "var(--surface-sunken)" },
};

function StatusPill({ status }: { status: Status }) {
  const m = statusMeta[status];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.6875rem] font-medium tracking-wide"
      style={{ color: m.color, background: m.subtle }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: m.color,
          animation: status === "running" ? "op-pulse 1.2s var(--ease-inout) infinite" : undefined,
        }}
      />
      {m.label}
    </span>
  );
}

function Card({
  icon,
  title,
  desc,
  status,
  children,
}: {
  icon: IconName;
  title: string;
  desc: string;
  status: Status;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-l)] border border-line bg-raised p-5 shadow-raised md:p-6">
      <div className="flex items-start gap-4">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-s)] bg-sunken text-ink-strong">
          <Icon name={icon} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-title">{title}</h3>
            <StatusPill status={status} />
          </div>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">{desc}</p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "solid",
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "solid" | "quiet";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls =
    variant === "solid"
      ? "bg-ink-strong text-[var(--surface-page)] hover:opacity-90"
      : "border border-line-strong text-ink-strong hover:border-ink-strong";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[0.875rem] font-medium transition-[opacity,border-color] duration-[var(--duration-fast)] ${cls}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------- 1. Geräteprofil (automatisch) ---------- */

function ProfileCard({ report }: { report: ReportFn }) {
  const [rows, setRows] = useState<{ k: string; v: string }[]>([]);
  const [status, setStatus] = useState<Status>("running");

  useEffect(() => {
    let raf = 0;
    const times: number[] = [];
    let last = performance.now();
    let frames = 0;

    const measure = (now: number) => {
      times.push(now - last);
      last = now;
      frames++;
      if (frames < 40) {
        raf = requestAnimationFrame(measure);
        return;
      }
      const sorted = [...times].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] || 16.7;
      const hz = Math.round(1000 / median);
      const nearest = [60, 90, 120, 144].reduce((p, c) =>
        Math.abs(c - hz) < Math.abs(p - hz) ? c : p,
      );

      const nav = navigator as Navigator & {
        connection?: { effectiveType?: string; downlink?: number; rtt?: number };
        deviceMemory?: number;
      };
      const conn = nav.connection;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(window.screen.width * dpr);
      const h = Math.round(window.screen.height * dpr);

      const data: { k: string; v: string }[] = [
        { k: "Auflösung", v: `${w} × ${h} px` },
        { k: "Pixeldichte", v: `${dpr.toFixed(2)}×` },
        { k: "Bildrate", v: `~${nearest} Hz` },
        { k: "Farbtiefe", v: `${window.screen.colorDepth} bit` },
        { k: "Touchpunkte", v: `${navigator.maxTouchPoints || 0}` },
        { k: "Plattform", v: (navigator as Navigator & { platform?: string }).platform || "–" },
      ];
      if (nav.deviceMemory) data.push({ k: "Arbeitsspeicher", v: `~${nav.deviceMemory} GB` });
      if (conn?.effectiveType)
        data.push({
          k: "Verbindung",
          v: `${conn.effectiveType.toUpperCase()}${conn.downlink ? ` · ${conn.downlink} Mbit/s` : ""}`,
        });

      setRows(data);
      setStatus("info");
      report("profile", {
        status: "info",
        summary: `${w} × ${h} px · ~${nearest} Hz · ${navigator.maxTouchPoints || 0} Touchpunkte`,
      });
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [report]);

  return (
    <Card
      icon="cpu"
      title="Geräteprofil"
      desc="Automatisch ausgelesen – Auflösung, Bildrate und Fähigkeiten Ihres Geräts."
      status={status}
    >
      {rows.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
          {rows.map((r) => (
            <div key={r.k} className="min-w-0">
              <dt className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint">{r.k}</dt>
              <dd className="mt-0.5 truncate font-mono text-[0.875rem] text-ink-strong">{r.v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="font-mono text-[0.8125rem] text-ink-faint">Bildrate wird gemessen …</p>
      )}
    </Card>
  );
}

/* ---------- 2. Display / Pixelfehler ---------- */

const SWEEP = [
  { name: "Weiß", css: "#ffffff", fg: "#000" },
  { name: "Schwarz", css: "#000000", fg: "#fff" },
  { name: "Rot", css: "#ff0000", fg: "#fff" },
  { name: "Grün", css: "#00ff00", fg: "#000" },
  { name: "Blau", css: "#0000ff", fg: "#fff" },
  { name: "Grau", css: "#7f7f7f", fg: "#fff" },
];

function PixelCard({ report }: { report: ReportFn }) {
  const [status, setStatus] = useState<Status>("idle");
  const [full, setFull] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
      if (e.key === "ArrowRight" || e.key === " ") setStep((s) => Math.min(s + 1, SWEEP.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [full]);

  const finish = (ok: boolean) => {
    setFull(false);
    setStatus(ok ? "pass" : "fail");
    report("pixel", ok
      ? { status: "pass", summary: "Keine Pixelfehler entdeckt" }
      : { status: "fail", summary: "Display-Auffälligkeit gemeldet", advise: "Display" });
  };

  return (
    <>
      <Card
        icon="sparkle"
        title="Display & Pixelfehler"
        desc="Vollflächige Farben decken tote oder festsitzende Pixel, Flecken und Schlieren auf."
        status={status}
      >
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton onClick={() => { setStep(0); setFull(true); }}>
            {status === "idle" ? "Test starten" : "Erneut prüfen"}
            <Icon name="arrow-right" size={15} />
          </ActionButton>
          {status === "pass" ? (
            <span className="text-[0.875rem] text-ink-soft">Sauberes Bild bestätigt.</span>
          ) : null}
          {status === "fail" ? (
            <span className="text-[0.875rem] text-ink-soft">Wir sehen uns das an.</span>
          ) : null}
        </div>
      </Card>

      {full ? (
        <div
          className="fixed inset-0 z-[300] flex flex-col items-center justify-between"
          style={{ background: SWEEP[step].css, color: SWEEP[step].fg }}
          role="dialog"
          aria-modal="true"
          aria-label="Display-Test"
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-pointer"
            aria-label="Nächste Farbe"
            onClick={() => setStep((s) => (s + 1 < SWEEP.length ? s + 1 : s))}
          />
          <div className="pointer-events-none relative z-10 w-full px-6 pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
            <p className="font-mono text-[0.75rem] uppercase tracking-[0.2em] opacity-70">
              {step + 1} / {SWEEP.length} · {SWEEP[step].name}
            </p>
            <div className="mx-auto mt-3 flex max-w-xs justify-center gap-1.5">
              {SWEEP.map((_, i) => (
                <span
                  key={i}
                  className="h-1 flex-1 rounded-full"
                  style={{ background: "currentColor", opacity: i <= step ? 0.9 : 0.25 }}
                />
              ))}
            </div>
            <p className="mt-4 text-[0.9375rem] opacity-80">
              Tippen Sie, um durchzuschalten. Achten Sie auf Punkte, Flecken oder Schlieren.
            </p>
          </div>
          <div className="relative z-10 flex w-full items-center justify-center gap-3 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {step < SWEEP.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(s + 1, SWEEP.length - 1))}
                className="rounded-full border border-current/40 px-5 py-2.5 text-[0.875rem] font-medium backdrop-blur-sm"
              >
                Weiter
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => finish(true)}
                  className="rounded-full px-5 py-2.5 text-[0.875rem] font-semibold"
                  style={{ background: SWEEP[step].fg, color: SWEEP[step].css }}
                >
                  Alles sauber
                </button>
                <button
                  type="button"
                  onClick={() => finish(false)}
                  className="rounded-full border border-current/40 px-5 py-2.5 text-[0.875rem] font-medium"
                >
                  Fehler gefunden
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ---------- 3. Touch / Multitouch ---------- */

function TouchCard({ report }: { report: ReportFn }) {
  const [status, setStatus] = useState<Status>("idle");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);
  const state = useRef({ maxPoints: 1, cells: new Set<number>(), cols: 8, rows: 5 });

  const start = () => {
    setLive(true);
    setStatus("running");
    state.current = { maxPoints: 1, cells: new Set<number>(), cols: 8, rows: 5 };
  };

  useEffect(() => {
    if (!live) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    resize();

    const active = new Map<number, { x: number; y: number }>();
    const paint = (x: number, y: number) => {
      const r = canvas.getBoundingClientRect();
      const { cols, rows } = state.current;
      const cx = Math.floor((x / r.width) * cols);
      const cy = Math.floor((y / r.height) * rows);
      state.current.cells.add(cy * cols + cx);
      ctx.fillStyle = "rgba(36,86,230,0.5)";
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fill();
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture?.(e.pointerId);
      active.set(e.pointerId, { x: 0, y: 0 });
      state.current.maxPoints = Math.max(state.current.maxPoints, active.size);
      const r = canvas.getBoundingClientRect();
      paint(e.clientX - r.left, e.clientY - r.top);
    };
    const onMove = (e: PointerEvent) => {
      if (!active.has(e.pointerId)) return;
      const r = canvas.getBoundingClientRect();
      paint(e.clientX - r.left, e.clientY - r.top);
    };
    const onUp = (e: PointerEvent) => active.delete(e.pointerId);

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("resize", resize);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", resize);
    };
  }, [live]);

  const finish = () => {
    const { cells, cols, rows, maxPoints } = state.current;
    const coverage = cells.size / (cols * rows);
    setLive(false);
    if (coverage >= 0.75) {
      setStatus("pass");
      report("touch", {
        status: "pass",
        summary: `${maxPoints} Finger erkannt · Fläche vollständig`,
      });
    } else {
      setStatus("warn");
      report("touch", {
        status: "warn",
        summary: `Nur ${Math.round(coverage * 100)} % der Fläche erreicht`,
        advise: "Display",
      });
    }
  };

  return (
    <Card
      icon="touch"
      title="Touch & Multitouch"
      desc="Fahren Sie über das Feld – wir prüfen, ob jeder Bereich und mehrere Finger sauber erkannt werden."
      status={status}
    >
      {live ? (
        <div>
          <canvas
            ref={canvasRef}
            className="h-48 w-full touch-none rounded-[var(--radius-m)] border border-line bg-sunken"
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="font-mono text-[0.8125rem] text-ink-faint">
              Ganze Fläche bemalen · mehrere Finger gleichzeitig
            </p>
            <ActionButton variant="quiet" onClick={finish}>
              Auswerten
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton onClick={start}>
            {status === "idle" ? "Test starten" : "Erneut prüfen"}
            <Icon name="arrow-right" size={15} />
          </ActionButton>
        </div>
      )}
    </Card>
  );
}

/* ---------- 4. Bewegungssensoren ---------- */

function MotionCard({ report }: { report: ReportFn }) {
  const [status, setStatus] = useState<Status>("idle");
  const [tilt, setTilt] = useState<{ beta: number; gamma: number } | null>(null);

  const begin = async () => {
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof DOE?.requestPermission === "function") {
      try {
        const res = await DOE.requestPermission();
        if (res !== "granted") {
          setStatus("na");
          report("motion", { status: "na", summary: "Sensorzugriff abgelehnt" });
          return;
        }
      } catch {
        setStatus("na");
        report("motion", { status: "na", summary: "Sensor nicht verfügbar" });
        return;
      }
    }
    if (!("DeviceOrientationEvent" in window)) {
      setStatus("na");
      report("motion", { status: "na", summary: "Kein Lagesensor (Desktop?)" });
      return;
    }

    setStatus("running");
    let got = false;
    let extremes = 0;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null && e.gamma == null) return;
      got = true;
      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;
      setTilt({ beta, gamma });
      if (Math.abs(gamma) > 30 || Math.abs(beta) > 30) extremes++;
    };
    window.addEventListener("deviceorientation", onOrient);

    window.setTimeout(() => {
      window.removeEventListener("deviceorientation", onOrient);
      if (!got) {
        setStatus("na");
        report("motion", { status: "na", summary: "Keine Sensordaten empfangen" });
      } else if (extremes > 3) {
        setStatus("pass");
        report("motion", { status: "pass", summary: "Lagesensor reagiert sauber" });
      } else {
        setStatus("warn");
        report("motion", { status: "warn", summary: "Sensor kaum bewegt – bitte kippen", advise: "Diagnose" });
      }
    }, 6000);
  };

  const level = tilt
    ? { x: Math.max(-1, Math.min(1, tilt.gamma / 45)), y: Math.max(-1, Math.min(1, tilt.beta / 45)) }
    : { x: 0, y: 0 };

  return (
    <Card
      icon="waveform"
      title="Bewegungssensoren"
      desc="Kippen und neigen Sie das Gerät – Gyroskop und Lagesensor sollten der Bewegung folgen."
      status={status}
    >
      {status === "running" ? (
        <div className="flex items-center gap-5">
          <div className="relative h-28 w-28 shrink-0 rounded-full border border-line bg-sunken">
            <div className="absolute inset-0 rounded-full [background:radial-gradient(circle,transparent_38%,var(--surface-raised)_39%,transparent_40%)]" />
            <div
              className="absolute left-1/2 top-1/2 h-6 w-6 rounded-full bg-accent shadow-[0_0_0_4px_var(--accent-subtle)]"
              style={{
                transform: `translate(calc(-50% + ${level.x * 42}px), calc(-50% + ${level.y * 42}px))`,
                transition: "transform 90ms linear",
              }}
            />
          </div>
          <div>
            <p className="font-mono text-[0.8125rem] text-ink-faint">
              β {Math.round(tilt?.beta ?? 0)}° · γ {Math.round(tilt?.gamma ?? 0)}°
            </p>
            <p className="mt-1.5 text-[0.9375rem] text-ink-soft">
              Neigen Sie das Gerät in alle Richtungen.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton onClick={begin}>
            {status === "idle" ? "Sensor testen" : "Erneut prüfen"}
            <Icon name="arrow-right" size={15} />
          </ActionButton>
          {status === "na" ? (
            <span className="text-[0.875rem] text-ink-soft">
              Auf dem Desktop meist nicht vorhanden – am Smartphone öffnen.
            </span>
          ) : null}
        </div>
      )}
    </Card>
  );
}

/* ---------- 5. Mikrofon-Pegel ---------- */

function MicCard({ report }: { report: ReportFn }) {
  const [status, setStatus] = useState<Status>("idle");
  const [level, setLevel] = useState(0);
  const [live, setLive] = useState(false);
  const peakRef = useRef(0);
  const cleanupRef = useRef<() => void>(() => {});

  const begin = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("na");
      report("mic", { status: "na", summary: "Mikrofonzugriff nicht möglich" });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLive(true);
      setStatus("running");
      peakRef.current = 0;
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      let raf = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        const norm = Math.min(1, rms * 3.2);
        peakRef.current = Math.max(peakRef.current, norm);
        setLevel(norm);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      cleanupRef.current = () => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        ctx.close().catch(() => {});
      };
    } catch {
      setStatus("na");
      report("mic", { status: "na", summary: "Kein Mikrofonzugriff erlaubt" });
    }
  };

  const finish = () => {
    cleanupRef.current();
    setLive(false);
    const peak = peakRef.current;
    if (peak > 0.12) {
      setStatus("pass");
      report("mic", { status: "pass", summary: `Signal erkannt (Spitze ${Math.round(peak * 100)} %)` });
    } else {
      setStatus("fail");
      report("mic", { status: "fail", summary: "Kaum Signal – Mikrofon prüfen", advise: "Lautsprecher / Mikrofon" });
    }
  };

  useEffect(() => () => cleanupRef.current(), []);

  const bars = 28;
  return (
    <Card
      icon="phone"
      title="Mikrofon"
      desc="Sprechen oder schnipsen Sie – der Pegel zeigt live, ob das Mikrofon sauber aufnimmt."
      status={status}
    >
      {live ? (
        <div>
          <div className="flex h-16 items-center gap-1 rounded-[var(--radius-m)] border border-line bg-sunken px-3">
            {Array.from({ length: bars }).map((_, i) => {
              const on = level * bars > i;
              const h = 10 + (i / bars) * 34;
              return (
                <span
                  key={i}
                  className="w-full rounded-full"
                  style={{
                    height: `${h}px`,
                    background: on ? "var(--accent)" : "var(--line-strong)",
                    transition: "background-color 60ms linear",
                  }}
                />
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="font-mono text-[0.8125rem] text-ink-faint">Pegel {Math.round(level * 100)} %</p>
            <ActionButton variant="quiet" onClick={finish}>
              Fertig
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton onClick={begin}>
            {status === "idle" ? "Mikrofon testen" : "Erneut prüfen"}
            <Icon name="arrow-right" size={15} />
          </ActionButton>
        </div>
      )}
    </Card>
  );
}

/* ---------- 6. Lautsprecher-Testton ---------- */

function SpeakerCard({ report }: { report: ReportFn }) {
  const [status, setStatus] = useState<Status>("idle");
  const [playing, setPlaying] = useState<"left" | "right" | null>(null);

  const tone = (side: "left" | "right") => {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner?.();
    osc.type = "sine";
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.14, ctx.currentTime + 0.75);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
    if (pan) {
      pan.pan.value = side === "left" ? -1 : 1;
      osc.connect(gain).connect(pan).connect(ctx.destination);
    } else {
      osc.connect(gain).connect(ctx.destination);
    }
    osc.start();
    osc.stop(ctx.currentTime + 0.95);
    setPlaying(side);
    setStatus("running");
    window.setTimeout(() => {
      setPlaying(null);
      ctx.close().catch(() => {});
    }, 1000);
  };

  const confirm = (ok: boolean) => {
    setStatus(ok ? "pass" : "fail");
    report("speaker", ok
      ? { status: "pass", summary: "Beide Kanäle hörbar" }
      : { status: "fail", summary: "Ton fehlt oder verzerrt", advise: "Lautsprecher" });
  };

  return (
    <Card
      icon="waveform"
      title="Lautsprecher"
      desc="Zwei Testtöne – links und rechts. Hören Sie beide klar, ohne Kratzen oder Verzerrung?"
      status={status}
    >
      <div className="flex flex-wrap items-center gap-3">
        <ActionButton variant="quiet" onClick={() => tone("left")} disabled={playing !== null}>
          {playing === "left" ? "♪ Links …" : "Links"}
        </ActionButton>
        <ActionButton variant="quiet" onClick={() => tone("right")} disabled={playing !== null}>
          {playing === "right" ? "♪ Rechts …" : "Rechts"}
        </ActionButton>
        <span className="mx-1 h-5 w-px bg-line" />
        <ActionButton onClick={() => confirm(true)}>Klar &amp; sauber</ActionButton>
        <ActionButton variant="quiet" onClick={() => confirm(false)}>Problem</ActionButton>
      </div>
    </Card>
  );
}

/* ---------- 7. Akku ---------- */

function BatteryCard({ report }: { report: ReportFn }) {
  const [status, setStatus] = useState<Status>("running");
  const [info, setInfo] = useState<{ level: number; charging: boolean } | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{
        level: number;
        charging: boolean;
        addEventListener: (t: string, cb: () => void) => void;
      }>;
    };
    if (!nav.getBattery) {
      setStatus("na");
      report("battery", { status: "na", summary: "Akku-API nicht verfügbar (iOS/Safari)" });
      return;
    }
    let bm: { level: number; charging: boolean; addEventListener: (t: string, cb: () => void) => void } | null = null;
    const sync = () => {
      if (!bm) return;
      const pct = Math.round(bm.level * 100);
      setInfo({ level: pct, charging: bm.charging });
      setStatus("info");
      report("battery", { status: "info", summary: `${pct} %${bm.charging ? " · lädt" : ""}` });
    };
    nav.getBattery().then((b) => {
      bm = b;
      b.addEventListener("levelchange", sync);
      b.addEventListener("chargingchange", sync);
      sync();
    });
  }, [report]);

  return (
    <Card
      icon="battery"
      title="Akku"
      desc="Ladezustand und Ladeverhalten. Schwache Laufzeit trotz vollem Akku deutet auf Verschleiß hin."
      status={status}
    >
      {info ? (
        <div className="flex items-center gap-4">
          <div className="relative h-8 w-16 rounded-[6px] border-2 border-ink-strong">
            <span className="absolute -right-[5px] top-1/2 h-3 w-1 -translate-y-1/2 rounded-r bg-ink-strong" />
            <span
              className="absolute inset-y-0.5 left-0.5 rounded-[2px]"
              style={{
                width: `calc(${info.level}% - 4px)`,
                background: info.level <= 20 ? "var(--danger)" : "var(--ink-strong)",
              }}
            />
          </div>
          <p className="font-mono text-[0.9375rem] text-ink-strong">
            {info.level}% {info.charging ? "· lädt" : ""}
          </p>
        </div>
      ) : (
        <p className="text-[0.875rem] text-ink-soft">
          Auf iPhones blendet Apple diesen Wert aus – die genaue Akkugesundheit
          messen wir vor Ort in unter zwei Minuten.
        </p>
      )}
    </Card>
  );
}

/* ---------- 8. Frequenzgang (echte Messung) ---------- */

/**
 * Akustische Messung: Das Gerät spielt einen logarithmischen Sweep über den
 * eigenen Lautsprecher und nimmt ihn gleichzeitig über das eigene Mikrofon
 * wieder auf. Aus dem Spektrum entsteht ein Frequenzgang.
 *
 * Ein defekter Lautsprecher zeigt sich als tiefer Einbruch in einem Band,
 * ein loses Gitter als zerklüftete Kurve. Das ist eine echte Messung – aber
 * im Raum, ohne Kalibrierung, deshalb ausdrücklich als Hinweis und nicht als
 * Laborwert ausgewiesen.
 */

const BANDS = [
  { hz: 200, label: "200" },
  { hz: 400, label: "400" },
  { hz: 800, label: "800" },
  { hz: 1600, label: "1.6k" },
  { hz: 3200, label: "3.2k" },
  { hz: 6400, label: "6.4k" },
  { hz: 10000, label: "10k" },
];

function FrequencyCard({ report }: { report: ReportFn }) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [curve, setCurve] = useState<number[] | null>(null);
  const cleanupRef = useRef<() => void>(() => {});

  useEffect(() => () => cleanupRef.current(), []);

  const measure = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("na");
      report("frequency", { status: "na", summary: "Mikrofon nicht verfügbar" });
      return;
    }
    let stream: MediaStream;
    try {
      // Ohne Aufbereitung messen: AGC und Rauschunterdrückung würden die
      // Kurve glattbügeln und den Befund wertlos machen.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch {
      setStatus("na");
      report("frequency", { status: "na", summary: "Kein Mikrofonzugriff erlaubt" });
      return;
    }

    setStatus("running");
    setProgress(0);
    setCurve(null);

    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0;
    src.connect(analyser);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    gain.gain.value = 0.16;
    osc.connect(gain).connect(ctx.destination);

    const F0 = 180;
    const F1 = 11000;
    const DUR = 5.5;
    const now = ctx.currentTime + 0.12;
    osc.frequency.setValueAtTime(F0, now);
    osc.frequency.exponentialRampToValueAtTime(F1, now + DUR);
    osc.start(now);
    osc.stop(now + DUR + 0.05);

    const bins = new Float32Array(analyser.frequencyBinCount);
    const nyquist = ctx.sampleRate / 2;
    const peak = new Array<number>(BANDS.length).fill(-Infinity);
    const t0 = performance.now();
    let raf = 0;

    const sample = () => {
      const elapsed = (performance.now() - t0) / 1000;
      setProgress(Math.min(1, elapsed / (DUR + 0.2)));
      analyser.getFloatFrequencyData(bins);

      // Für jedes Band den lautesten Wert über den ganzen Sweep festhalten.
      BANDS.forEach((b, i) => {
        const lo = Math.max(0, Math.floor(((b.hz / 1.28) / nyquist) * bins.length));
        const hi = Math.min(bins.length - 1, Math.ceil(((b.hz * 1.28) / nyquist) * bins.length));
        let m = -Infinity;
        for (let k = lo; k <= hi; k++) if (bins[k] > m) m = bins[k];
        if (m > peak[i]) peak[i] = m;
      });

      if (elapsed < DUR + 0.2) {
        raf = requestAnimationFrame(sample);
      } else {
        finish();
      }
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      try {
        osc.stop();
      } catch {
        /* bereits gestoppt */
      }
      stream.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => {});
    };
    cleanupRef.current = stop;

    const finish = () => {
      stop();
      const vals = peak.map((v) => (Number.isFinite(v) ? v : -120));
      const max = Math.max(...vals);
      // Relativ zum lautesten Band – absolute Pegel sind ohne Kalibrierung
      // bedeutungslos, die Form der Kurve dagegen aussagekräftig.
      const rel = vals.map((v) => v - max);
      setCurve(rel);

      const tooQuiet = max < -95;
      const worst = Math.min(...rel);
      const dips = rel.filter((v) => v < -26).length;

      if (tooQuiet) {
        setStatus("warn");
        report("frequency", {
          status: "warn",
          summary: "Zu leise gemessen – bitte lauter stellen",
        });
      } else if (dips >= 3 || worst < -40) {
        setStatus("fail");
        report("frequency", {
          status: "fail",
          summary: `Deutliche Einbrüche (${dips} Bänder schwach)`,
          advise: "Lautsprecher",
        });
      } else if (dips > 0) {
        setStatus("warn");
        report("frequency", {
          status: "warn",
          summary: `${dips} Band${dips > 1 ? "änder" : ""} auffällig`,
          advise: "Lautsprecher",
        });
      } else {
        setStatus("pass");
        report("frequency", { status: "pass", summary: "Frequenzgang gleichmäßig" });
      }
    };

    raf = requestAnimationFrame(sample);
  };

  return (
    <Card
      icon="waveform"
      title="Frequenzgang"
      desc="Ihr Gerät spielt einen Sweep von 180 Hz bis 11 kHz und nimmt sich dabei selbst auf. Die Kurve zeigt, ob der Lautsprecher über alle Tonhöhen gleichmäßig arbeitet."
      status={status}
    >
      {status === "running" ? (
        <div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="mt-3 font-mono text-[0.8125rem] text-ink-faint">
            Messung läuft – bitte still sein und nicht abdecken.
          </p>
        </div>
      ) : curve ? (
        <div>
          {/* Gemessene Kurve */}
          <div className="rounded-[var(--radius-m)] border border-line bg-sunken p-4">
            <div className="flex h-28 items-end gap-1.5">
              {curve.map((v, i) => {
                const h = Math.max(4, Math.min(100, ((v + 48) / 48) * 100));
                const bad = v < -26;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-t-[3px]"
                      style={{
                        height: `${h}%`,
                        background: bad ? "var(--danger)" : "var(--accent)",
                        transition: "height var(--duration-area) var(--ease-out)",
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-1.5">
              {BANDS.map((b) => (
                <span
                  key={b.hz}
                  className="flex-1 text-center font-mono text-[0.625rem] text-ink-faint"
                >
                  {b.label}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ActionButton onClick={measure}>Erneut messen</ActionButton>
            <span className="text-[0.8125rem] text-ink-soft">
              Werte relativ zum lautesten Band (Hz).
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton onClick={measure}>
            Messung starten
            <Icon name="arrow-right" size={15} />
          </ActionButton>
          <span className="text-[0.875rem] text-ink-soft">
            Dauert 6 Sekunden. Lautstärke aufdrehen, Gerät nicht abdecken.
          </span>
        </div>
      )}
    </Card>
  );
}

/* ---------- 9. Kamera ---------- */

function CameraCard({ report }: { report: ReportFn }) {
  const [status, setStatus] = useState<Status>("idle");
  const [live, setLive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const begin = async (mode: "user" | "environment") => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("na");
      report("camera", { status: "na", summary: "Kamerazugriff nicht möglich" });
      return;
    }
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });
      streamRef.current = stream;
      setFacing(mode);
      setLive(true);
      setStatus("running");
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setStatus("na");
      report("camera", { status: "na", summary: "Kein Kamerazugriff erlaubt" });
    }
  };

  const finish = (ok: boolean) => {
    stop();
    setLive(false);
    setStatus(ok ? "pass" : "fail");
    report("camera", ok
      ? { status: "pass", summary: "Bild scharf und sauber" }
      : { status: "fail", summary: "Bild unscharf oder fleckig", advise: "Kamera" });
  };

  useEffect(() => () => stop(), []);

  return (
    <Card
      icon="camera"
      title="Kamera"
      desc="Live-Vorschau beider Kameras. Achten Sie auf Unschärfe, Flecken, Schlieren oder einen Grauschleier."
      status={status}
    >
      {live ? (
        <div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-video w-full rounded-[var(--radius-m)] border border-line bg-sunken object-cover"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <ActionButton
              variant="quiet"
              onClick={() => begin(facing === "user" ? "environment" : "user")}
            >
              {facing === "user" ? "Rückkamera" : "Frontkamera"}
            </ActionButton>
            <span className="mx-1 h-5 w-px bg-line" />
            <ActionButton onClick={() => finish(true)}>Scharf &amp; sauber</ActionButton>
            <ActionButton variant="quiet" onClick={() => finish(false)}>Problem</ActionButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton onClick={() => begin("environment")}>
            {status === "idle" ? "Kamera testen" : "Erneut prüfen"}
            <Icon name="arrow-right" size={15} />
          </ActionButton>
          <span className="text-[0.875rem] text-ink-soft">Das Bild bleibt auf Ihrem Gerät.</span>
        </div>
      )}
    </Card>
  );
}

/* ---------- 9. Vibration ---------- */

function VibrationCard({ report }: { report: ReportFn }) {
  const [status, setStatus] = useState<Status>("idle");
  const [asked, setAsked] = useState(false);

  const buzz = () => {
    if (!("vibrate" in navigator)) {
      setStatus("na");
      report("vibration", { status: "na", summary: "Nicht unterstützt (iOS/Desktop)" });
      return;
    }
    navigator.vibrate([120, 90, 120, 90, 240]);
    setAsked(true);
    setStatus("running");
  };

  const confirm = (ok: boolean) => {
    setStatus(ok ? "pass" : "fail");
    report("vibration", ok
      ? { status: "pass", summary: "Vibration deutlich spürbar" }
      : { status: "fail", summary: "Keine oder schwache Vibration", advise: "Vibrationsmotor" });
  };

  return (
    <Card
      icon="waveform"
      title="Vibration"
      desc="Der Vibrationsmotor meldet Anrufe und Eingaben. Ein loses oder defektes Modul fällt sofort auf."
      status={status}
    >
      <div className="flex flex-wrap items-center gap-3">
        <ActionButton onClick={buzz}>
          {asked ? "Nochmal vibrieren" : "Vibration auslösen"}
        </ActionButton>
        {asked ? (
          <>
            <span className="mx-1 h-5 w-px bg-line" />
            <ActionButton onClick={() => confirm(true)}>Deutlich spürbar</ActionButton>
            <ActionButton variant="quiet" onClick={() => confirm(false)}>
              Nichts gespürt
            </ActionButton>
          </>
        ) : null}
      </div>
    </Card>
  );
}

/* ---------- 10. Näherung & Face ID ---------- */

function ProximityCard({ report }: { report: ReportFn }) {
  const [status, setStatus] = useState<Status>("idle");

  const run = () => {
    // Näherungs- und Gesichtssensoren sind im Browser aus Datenschutzgründen
    // gesperrt. Statt etwas zu behaupten, prüfen wir ehrlich, was das Gerät
    // überhaupt preisgibt – und sagen klar, was nur vor Ort messbar ist.
    const hasAmbient = "AmbientLightSensor" in window || "ondevicelight" in window;
    setStatus(hasAmbient ? "info" : "na");
    report("proximity", {
      status: hasAmbient ? "info" : "na",
      summary: hasAmbient
        ? "Lichtsensor vorhanden – Näherung nur vor Ort messbar"
        : "Vom Browser gesperrt – Messung vor Ort",
    });
  };

  return (
    <Card
      icon="shield"
      title="Näherung & Face ID"
      desc="Diese Sensoren sperrt jeder Browser bewusst. Wir sagen das offen – und messen sie vor Ort in zwei Minuten."
      status={status}
    >
      <div className="flex flex-wrap items-center gap-3">
        <ActionButton onClick={run}>Verfügbarkeit prüfen</ActionButton>
        {status !== "idle" ? (
          <span className="text-[0.875rem] text-ink-soft">
            Schaltet das Display beim Telefonieren nicht ab, prüfen wir Sensor und Flexkabel.
          </span>
        ) : null}
      </div>
    </Card>
  );
}

/* ---------- Befund ---------- */

const ORDER = [
  "profile",
  "pixel",
  "touch",
  "motion",
  "mic",
  "speaker",
  "frequency",
  "camera",
  "vibration",
  "proximity",
  "battery",
];

function Befund({ results }: { results: Record<string, Result> }) {
  // Der Zeitstempel darf erst nach dem Mount entstehen: Server und Client
  // würden sonst unterschiedliche Uhrzeiten rendern (Hydration-Mismatch).
  const [printedAt, setPrintedAt] = useState<string | null>(null);
  useEffect(() => {
    setPrintedAt(
      new Date().toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, []);

  const done = ORDER.filter((id) => results[id]);
  const flagged = ORDER
    .map((id) => results[id])
    .filter((r): r is Result => !!r && (r.status === "fail" || r.status === "warn"));
  const advises = Array.from(new Set(flagged.map((r) => r.advise).filter(Boolean))) as string[];

  const testable = [
    "pixel",
    "touch",
    "motion",
    "mic",
    "speaker",
    "frequency",
    "camera",
    "vibration",
  ];
  const ran = testable.filter((id) => results[id]).length;
  const progress = Math.round((ran / testable.length) * 100);

  // Health-Score: nur bewertbare Tests zählen. „na" (vom Browser gesperrt)
  // darf das Ergebnis nicht verschlechtern – sonst bestraft der Report das
  // Gerät für eine Einschränkung des Browsers.
  const scored = testable
    .map((id) => results[id])
    .filter((r): r is Result => !!r && ["pass", "warn", "fail"].includes(r.status));
  const score =
    scored.length === 0
      ? null
      : Math.round(
          (scored.reduce(
            (sum, r) => sum + (r.status === "pass" ? 1 : r.status === "warn" ? 0.5 : 0),
            0,
          ) /
            scored.length) *
            100,
        );

  const verdict =
    ran === 0
      ? { tone: "idle" as Status, title: "Noch kein Test durchgeführt", text: "Starten Sie oben mit einem beliebigen Test – Sie können jederzeit aufhören." }
      : flagged.length === 0
        ? { tone: "pass" as Status, title: "Kein Handlungsbedarf erkennbar", text: `${ran} von ${testable.length} Tests abgeschlossen. Alles im grünen Bereich – Ihr Gerät wirkt gesund.` }
        : { tone: flagged.some((f) => f.status === "fail") ? ("fail" as Status) : ("warn" as Status), title: flagged.length === 1 ? "Eine Auffälligkeit gefunden" : `${flagged.length} Auffälligkeiten gefunden`, text: "Wir haben einen Festpreis vorbereitet. Bringen Sie diesen Befund einfach mit." };

  return (
    <div
      data-print="block"
      className="rounded-[var(--radius-l)] border border-line bg-inverse p-6 text-ink-inverse shadow-floating md:p-8"
    >
      {/* Kopfzeile nur im Druck – macht das Blatt für die Werkstatt eindeutig. */}
      <div className="print-only mb-6 border-b border-line pb-4">
        <p className="text-[0.9375rem] font-semibold">{site.name} · Smartphone Health Report</p>
        <p className="mt-1 font-mono text-[0.75rem]">
          {site.street}, {site.zip} {site.city} · {site.phone}
        </p>
        <p className="mt-1 font-mono text-[0.75rem]">
          {printedAt ? `Erstellt am ${printedAt} · ` : ""}
          Selbstdiagnose im Browser des Kunden
        </p>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ink-inverse-soft">
            Smartphone Health Report
          </p>
          <h3 className="text-headline mt-2 text-ink-inverse">{verdict.title}</h3>
        </div>
        <StatusPill status={verdict.tone} />
      </div>

      <p className="mt-3 max-w-xl leading-relaxed text-ink-inverse-soft">{verdict.text}</p>

      {score !== null ? (
        <div className="mt-7 flex items-center gap-5 border-t border-line-inverse pt-6">
          <div className="relative shrink-0">
            <svg viewBox="0 0 120 120" width={104} height={104} className="-rotate-90">
              <circle cx="60" cy="60" r="48" fill="none" stroke="var(--line-inverse)" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke={
                  score >= 80
                    ? "var(--positive)"
                    : score >= 50
                      ? "var(--warn)"
                      : "var(--danger)"
                }
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 2 * Math.PI * 48} ${2 * Math.PI * 48}`}
                style={{ transition: "stroke-dasharray var(--duration-area) var(--ease-out)" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono text-2xl font-semibold text-ink-inverse">
              {score}
            </span>
          </div>
          <div>
            <p className="text-[0.9375rem] font-medium text-ink-inverse">Gesundheitswert</p>
            <p className="mt-1 max-w-xs text-[0.875rem] leading-relaxed text-ink-inverse-soft">
              Aus {scored.length} bewertbaren {scored.length === 1 ? "Test" : "Tests"}.
              Gesperrte Sensoren fließen bewusst nicht ein.
            </p>
          </div>
        </div>
      ) : null}

      {/* Fortschritt */}
      <div className="mt-6">
        <div className="h-1 w-full overflow-hidden rounded-full bg-line-inverse">
          <div
            className="h-full rounded-full bg-accent-inverse transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-[0.75rem] text-ink-inverse-soft">
          {ran} / {testable.length} interaktive Tests
        </p>
      </div>

      {done.length > 0 ? (
        <ul className="mt-6 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {done.map((id) => {
            const r = results[id];
            return (
              // min-w-0: Ohne das behält der Rasterplatz die Mindestbreite
              // seines Inhalts, und lange Befundtexte schieben die Zeile über
              // den Bildschirmrand hinaus, statt gekürzt zu werden.
              <li
                key={id}
                className="flex min-w-0 items-center justify-between gap-3 border-b border-line-inverse pb-2.5 text-[0.875rem]"
              >
                <span className="flex shrink-0 items-center gap-2 text-ink-inverse-soft">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: statusMeta[r.status].color }}
                  />
                  {LABELS[id]}
                </span>
                <span className="min-w-0 truncate text-right text-ink-inverse">
                  {r.summary}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div data-print="hide" className="mt-8 flex flex-col gap-3 sm:flex-row">
        {advises.length > 0 ? (
          <Link
            href="/reparatur"
            data-magnetic=""
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-[0.9375rem] font-medium text-[#141517] shadow-raised transition-opacity hover:opacity-90"
            style={{ transitionProperty: "opacity" }}
          >
            Festpreis für {advises.join(" & ")}
            <Icon name="arrow-right" size={17} />
          </Link>
        ) : (
          <Link
            href="/reparatur"
            data-magnetic=""
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-[0.9375rem] font-medium text-[#141517] shadow-raised transition-opacity hover:opacity-90"
            style={{ transitionProperty: "opacity" }}
          >
            Zum Sofortpreis-Rechner
            <Icon name="arrow-right" size={17} />
          </Link>
        )}
        <Link
          href="/kontakt"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line-inverse px-6 text-[0.9375rem] font-medium text-ink-inverse transition-colors hover:border-ink-inverse-soft"
        >
          Termin vereinbaren
        </Link>
        {ran > 0 ? (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line-inverse px-6 text-[0.9375rem] font-medium text-ink-inverse transition-colors hover:border-ink-inverse-soft"
          >
            <Icon name="arrow-up-right" size={16} />
            Befund drucken
          </button>
        ) : null}
      </div>
      <p className="mt-4 text-[0.75rem] text-ink-inverse-soft">
        Alle Tests liefen ausschließlich auf Ihrem Gerät. {site.name} speichert
        oder überträgt keine Ergebnisse.
      </p>
    </div>
  );
}

const LABELS: Record<string, string> = {
  profile: "Geräteprofil",
  pixel: "Display",
  touch: "Touch",
  motion: "Sensoren",
  mic: "Mikrofon",
  speaker: "Lautsprecher",
  frequency: "Frequenzgang",
  camera: "Kamera",
  vibration: "Vibration",
  proximity: "Näherung",
  battery: "Akku",
};

export function DeviceCheck() {
  const [results, setResults] = useState<Record<string, Result>>({});
  const report = useCallback<ReportFn>((id, r) => {
    setResults((prev) => ({ ...prev, [id]: r }));
  }, []);

  const cards = useMemo(
    () => (
      <>
        <ProfileCard report={report} />
        <PixelCard report={report} />
        <TouchCard report={report} />
        <MotionCard report={report} />
        <MicCard report={report} />
        <SpeakerCard report={report} />
        <FrequencyCard report={report} />
        <CameraCard report={report} />
        <VibrationCard report={report} />
        <ProximityCard report={report} />
        <BatteryCard report={report} />
      </>
    ),
    [report],
  );

  return (
    <div className="space-y-4" data-print-root="">
      <div data-print="hide" className="space-y-4">
        {cards}
      </div>
      <div className="pt-2">
        <Befund results={results} />
      </div>
    </div>
  );
}
