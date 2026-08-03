"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import {
  handoverGroups,
  passcodeOptions,
  platformLabel,
  type PasscodeChoice,
  type Platform,
} from "@/lib/data/handover";
import { site } from "@/lib/site";

/**
 * Übergabe-Assistent.
 *
 * Beantwortet die Frage, die vor jedem Werkstattbesuch steht und die sonst
 * niemand beantwortet: „Was muss ich vorher machen – und was passiert, wenn
 * ich es nicht mache?"
 *
 * Drei Entscheidungen, die ihn von einer Checkliste unterscheiden:
 *
 * – **Jeder Schritt nennt seine Folge.** Nicht „bitte erledigen", sondern
 *   was konkret entfällt. Wer den Grund kennt, entscheidet selbst.
 * – **Der Sperrcode ist eine Abwägung, keine Aufforderung.** Für alle drei
 *   Wege steht, welche Prüfungen möglich bleiben und welche nicht. Die
 *   Werkstatt hat ein Interesse am bequemsten Weg – das ist kein Grund, die
 *   anderen schlechtzureden.
 * – **Nichts wird gespeichert.** Der Fortschritt steht in der Adresse
 *   (Plattform, erledigte Schritte, Sperrcode-Wahl) – nichts Persönliches,
 *   kein Konto, kein Cookie. Wie beim Reparatur-Ticket ist der Link damit
 *   teilbar und übersteht einen Neuladen.
 */

/* Zustand ↔ Adresse ------------------------------------------------- */

const PARAM_PLATFORM = "p";
const PARAM_DONE = "ok";
const PARAM_CODE = "c";

function readState(search: string) {
  const params = new URLSearchParams(search);
  const p = params.get(PARAM_PLATFORM);
  const platform: Platform | null = p === "ios" || p === "android" ? p : null;
  const done = new Set((params.get(PARAM_DONE) ?? "").split(".").filter(Boolean));
  const c = params.get(PARAM_CODE);
  const passcode: PasscodeChoice | null =
    c === "offen" || c === "muendlich" || c === "behalten" ? c : null;
  return { platform, done, passcode };
}

function writeState(
  platform: Platform | null,
  done: Set<string>,
  passcode: PasscodeChoice | null,
) {
  const params = new URLSearchParams();
  if (platform) params.set(PARAM_PLATFORM, platform);
  if (done.size > 0) params.set(PARAM_DONE, [...done].sort().join("."));
  if (passcode) params.set(PARAM_CODE, passcode);
  const query = params.toString();
  // replaceState statt push: Ein Haken ist kein Schritt in der Historie –
  // sonst müsste man sich durch zwanzig Zustände zurückklicken.
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}

/* ------------------------------------------------------------------- */

export function HandoverAssistant() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [passcode, setPasscode] = useState<PasscodeChoice | null>(null);
  const [ready, setReady] = useState(false);

  // Zustand aus der Adresse übernehmen – einmal, vor der ersten Interaktion.
  useEffect(() => {
    const s = readState(window.location.search);
    setPlatform(s.platform);
    setDone(s.done);
    setPasscode(s.passcode);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeState(platform, done, passcode);
  }, [ready, platform, done, passcode]);

  const groups = useMemo(
    () => (platform ? handoverGroups(platform) : []),
    [platform],
  );

  const allSteps = useMemo(() => groups.flatMap((g) => g.steps), [groups]);
  const requiredOpen = allSteps.filter((s) => s.required && !done.has(s.id));
  const doneCount = allSteps.filter((s) => done.has(s.id)).length;
  const complete = allSteps.length > 0 && doneCount === allSteps.length && !!passcode;

  const toggle = useCallback((id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const reset = () => {
    setPlatform(null);
    setDone(new Set());
    setPasscode(null);
  };

  /* Plattformwahl --------------------------------------------------- */

  if (!platform) {
    return (
      <div className="mx-auto max-w-2xl">
        <fieldset>
          <legend className="text-title">Womit fangen wir an?</legend>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Die Wege unterscheiden sich – bei Apple heißt die Sperre anders als
            bei Android, und gesichert wird auch woanders.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {(["ios", "android"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className="press group rounded-[var(--radius-m)] border border-line bg-raised p-6 text-left transition-[border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)] hover:border-ink-faint hover:shadow-raised"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-s)] bg-sunken text-ink-strong">
                  <Icon name={p === "ios" ? "cpu" : "tool"} size={22} />
                </span>
                <span className="mt-4 block text-title">{platformLabel[p]}</span>
                <span className="mt-1.5 block text-[0.9375rem] leading-relaxed text-ink-soft">
                  {p === "ios"
                    ? "iPhone – iCloud, „Wo ist?“, Apple-ID"
                    : "Samsung, Google, Xiaomi und andere"}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <p className="mt-8 border-t border-line pt-6 text-[0.9375rem] leading-relaxed text-ink-soft">
          Diese Seite verkauft nichts. Sie ist auch dann richtig, wenn Sie Ihr
          Gerät anschließend woanders abgeben – oder es sich am Ende anders
          überlegen.
        </p>
      </div>
    );
  }

  /* Assistent -------------------------------------------------------- */

  return (
    <div data-print-root>
      {/* Kopf nur im Druck */}
      <div className="print-only mb-6">
        <p className="text-[1.1rem] font-semibold">
          {site.name} · Vorbereitung zur Abgabe
        </p>
        <p className="mt-1 text-[0.8125rem]">
          {platformLabel[platform]} · Stand:{" "}
          {new Date().toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Fortschritt */}
      <div
        className="glass sticky top-20 z-20 mb-10 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-l)] p-4 md:p-5"
        data-print="hide"
      >
        <div className="min-w-0">
          <p className="text-[0.875rem] font-medium text-ink-strong">
            {platformLabel[platform]} · {doneCount} von {allSteps.length} erledigt
            {passcode ? " · Sperrcode entschieden" : ""}
          </p>
          <p className="mt-0.5 text-[0.8125rem] text-ink-soft">
            {complete
              ? "Alles beisammen. Sie können kommen."
              : requiredOpen.length > 0
                ? `Noch offen: ${requiredOpen.map((s) => s.title).join(", ")}`
                : "Nur noch die Sperrcode-Entscheidung."}
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="press shrink-0 rounded-full border border-line-strong px-4 py-2 text-[0.8125rem] font-medium text-ink-strong transition-colors duration-[var(--duration-fast)] hover:border-ink-strong"
        >
          Plattform wechseln
        </button>
      </div>

      {/* Schrittgruppen */}
      <div className="space-y-14">
        {groups.map((group) => (
          <section key={group.id}>
            <h2 className="text-title">{group.label}</h2>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
              {group.lede}
            </p>

            <div className="mt-6 space-y-4">
              {group.steps.map((step) => {
                const checked = done.has(step.id);
                return (
                  <article
                    key={step.id}
                    className={`rounded-[var(--radius-l)] border p-5 transition-[border-color,background-color] duration-[var(--duration-base)] md:p-6 ${
                      checked
                        ? "border-[color-mix(in_oklab,var(--positive)_40%,var(--line))] bg-[var(--positive-subtle)]"
                        : "border-line bg-raised"
                    }`}
                  >
                    <label className="flex cursor-pointer items-start gap-4">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(step.id)}
                        className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2.5">
                          <span className="text-[1.0625rem] font-medium text-ink-strong">
                            {step.title}
                          </span>
                          {step.required ? (
                            <span className="rounded-full bg-sunken px-2.5 py-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-soft">
                              nötig
                            </span>
                          ) : (
                            <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-soft">
                              empfohlen
                            </span>
                          )}
                        </span>
                        <span className="mt-2 block leading-relaxed text-ink">
                          {step.why}
                        </span>
                      </span>
                    </label>

                    {/* Wege im Gerät */}
                    {step.paths ? (
                      <div className="mt-5 space-y-2.5 pl-9">
                        {step.paths.map((path) => (
                          <div
                            key={path.label}
                            className="rounded-[var(--radius-s)] border border-line bg-page p-3.5"
                          >
                            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-faint">
                              {path.label}
                            </p>
                            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-strong">
                              {path.steps}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Der Stolperstein */}
                    {step.pitfall ? (
                      <p className="mt-4 border-l-2 border-[var(--warn)] py-0.5 pl-4 text-[0.9375rem] leading-relaxed text-ink-soft ml-9">
                        <span className="font-medium text-ink-strong">
                          Übersehen die meisten:{" "}
                        </span>
                        {step.pitfall}
                      </p>
                    ) : null}

                    {/* Die ehrliche Folge */}
                    <p className="mt-4 pl-9 text-[0.9375rem] leading-relaxed text-ink-soft">
                      <span className="font-medium text-ink-strong">
                        Wenn nicht:{" "}
                      </span>
                      {step.ifSkipped}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {/* Sperrcode-Entscheidung */}
        <section>
          <h2 className="text-title">Der Sperrcode – Ihre Entscheidung</h2>
          <p className="mt-1.5 max-w-2xl leading-relaxed text-ink-soft">
            Hier gibt es keine richtige Antwort, nur einen Preis je Weg. Für
            jede Variante steht, was wir damit prüfen können und was entfällt.
            Wir haben ein Interesse an der ersten – das ist kein Grund, Ihnen
            die anderen auszureden.
          </p>

          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            {passcodeOptions.map((option) => {
              const active = passcode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPasscode(option.id)}
                  aria-pressed={active}
                  className={`press flex h-full flex-col rounded-[var(--radius-l)] border p-5 text-left transition-[border-color,background-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)] ${
                    active
                      ? "border-accent bg-accent-subtle shadow-[inset_0_0_0_1px_var(--accent)]"
                      : "border-line bg-raised hover:border-ink-faint hover:shadow-raised"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-[1.0625rem] font-medium text-ink-strong">
                      {option.label}
                    </span>
                    {active ? (
                      <Icon name="check" size={18} className="mt-0.5 shrink-0 text-accent" />
                    ) : null}
                  </span>
                  <span className="mt-2 block text-[0.9375rem] leading-relaxed text-ink-soft">
                    {option.summary}
                  </span>

                  <span className="mt-4 block border-t border-line pt-4">
                    <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-faint">
                      Prüfbar
                    </span>
                    <span className="mt-2 block space-y-1.5">
                      {option.covered.map((item) => (
                        <span key={item} className="flex items-start gap-2 text-[0.875rem] text-ink">
                          <Icon
                            name="check"
                            size={14}
                            className="mt-1 shrink-0 text-positive"
                          />
                          {item}
                        </span>
                      ))}
                    </span>
                  </span>

                  {option.notCovered.length > 0 ? (
                    <span className="mt-4 block border-t border-line pt-4">
                      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-faint">
                        Entfällt
                      </span>
                      <span className="mt-2 block space-y-1.5">
                        {option.notCovered.map((item) => (
                          <span
                            key={item}
                            className="flex items-start gap-2 text-[0.875rem] text-ink-soft"
                          >
                            <Icon
                              name="close"
                              size={14}
                              className="mt-1 shrink-0"
                              style={{ color: "var(--danger)" }}
                            />
                            {item}
                          </span>
                        ))}
                      </span>
                    </span>
                  ) : (
                    <span className="mt-4 block border-t border-line pt-4 text-[0.875rem] text-ink-soft">
                      Nichts entfällt.
                    </span>
                  )}

                  <span className="mt-4 block rounded-[var(--radius-s)] bg-sunken p-3 text-[0.8125rem] leading-relaxed text-ink-soft">
                    {option.handling}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Abschluss */}
      <section className="mt-14 rounded-[var(--radius-l)] border border-line bg-sunken p-6 md:p-8">
        <h2 className="text-title">
          {complete ? "Fertig. Bringen Sie das mit." : "Ihr Stand"}
        </h2>

        <dl className="mt-5 space-y-2.5 border-y border-line py-5">
          {allSteps.map((step) => (
            <div key={step.id} className="flex items-baseline justify-between gap-4">
              <dt className="text-[0.9375rem] text-ink">{step.title}</dt>
              <dd className="shrink-0 font-mono text-[0.8125rem] text-ink-soft">
                {done.has(step.id) ? "erledigt" : "offen"}
              </dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[0.9375rem] text-ink">Sperrcode</dt>
            <dd className="shrink-0 text-right font-mono text-[0.8125rem] text-ink-soft">
              {passcode
                ? passcodeOptions.find((o) => o.id === passcode)?.label
                : "noch offen"}
            </dd>
          </div>
        </dl>

        <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink-soft">
          Nichts davon verlässt Ihr Gerät. Der Stand steht in der Adresse
          dieser Seite – kein Konto, kein Cookie, kein Datensatz bei uns. Sie
          können den Link auf ein anderes Gerät schicken oder das Blatt
          ausdrucken und mitbringen.
        </p>

        <div className="mt-7 flex flex-wrap gap-3" data-print="hide">
          <button
            type="button"
            onClick={() => window.print()}
            className="press breathe inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[0.9375rem] font-medium text-accent-contrast shadow-button transition-colors hover:bg-accent-hover"
          >
            Als Merkzettel drucken
          </button>
          <Link
            href="/ticket"
            className="press inline-flex h-12 items-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
          >
            Weiter zum Reparatur-Ticket
            <Icon name="arrow-right" size={16} />
          </Link>
          <a
            href={site.phoneHref}
            className="press inline-flex h-12 items-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
          >
            <Icon name="phone" size={16} />
            Rückfrage stellen
          </a>
        </div>
      </section>
    </div>
  );
}
