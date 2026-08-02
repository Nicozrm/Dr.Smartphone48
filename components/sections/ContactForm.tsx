"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/lib/site";

const topics = ["Reparatur", "Geräte-Check", "Refurbished", "Ersatzteile", "Sonstiges"];

const fieldClass =
  "w-full rounded-[var(--radius-s)] border border-line bg-raised px-4 text-[0.9375rem] text-ink-strong placeholder:text-ink-faint transition-colors duration-[var(--duration-fast)] focus:border-accent";

type Errors = Record<string, string>;

/**
 * Kontaktformular – serverseitig entgegengenommen (/api/kontakt).
 *
 * Progressive Enhancement: Gibt es keinen Server (statischer Export) oder ist
 * der Versand noch nicht eingerichtet, öffnet sich ein fertig ausgefüllter
 * E-Mail-Entwurf. Die Nachricht des Besuchers geht nie verloren, und interne
 * Technik ist nie sichtbar.
 */
export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "drafted">("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [fileName, setFileName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const openDraft = (data: FormData) => {
    const body = [
      `Anliegen: ${data.get("topic") ?? ""}`,
      `Name: ${data.get("name") ?? ""}`,
      `E-Mail: ${data.get("email") ?? ""}`,
      data.get("phone") ? `Telefon: ${data.get("phone")}` : "",
      data.get("device") ? `Gerät: ${data.get("device")}` : "",
      "",
      String(data.get("message") ?? ""),
    ]
      .filter(Boolean)
      .join("\n");
    window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(
      `Anfrage – ${data.get("topic") ?? "Reparatur"}`,
    )}&body=${encodeURIComponent(body)}`;
    setState("drafted");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setErrors({});
    setState("sending");

    // Ohne Serverumgebung gar nicht erst anfragen.
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT === "true") {
      openDraft(data);
      return;
    }

    try {
      const res = await fetch("/api/kontakt", { method: "POST", body: data });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        errors?: Errors;
        fallback?: boolean;
      };

      if (res.ok && json.ok) {
        setState("sent");
        form.reset();
        setFileName(null);
        return;
      }
      if (json.errors) {
        setErrors(json.errors);
        setState("idle");
        return;
      }
      openDraft(data);
    } catch {
      openDraft(data);
    }
  };

  if (state === "sent") {
    return (
      <div className="glass rounded-[var(--radius-l)] p-8 text-center">
        <span
          className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "var(--positive-subtle)", color: "var(--positive)" }}
        >
          <Icon name="check" size={24} />
        </span>
        <h3 className="text-title mt-4">Nachricht ist angekommen.</h3>
        <p className="mt-2.5 leading-relaxed text-ink-soft">
          Wir melden uns während der Öffnungszeiten ({site.openingHoursShort})
          zurück – in der Regel noch am selben Tag.
        </p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
        >
          Weitere Nachricht schreiben
        </button>
      </div>
    );
  }

  /**
   * Fehlermeldung mit stabiler ID, damit das zugehörige Feld sie über
   * `aria-describedby` referenzieren kann. `aria-invalid` allein sagt einer
   * Vorlesehilfe nur, *dass* etwas falsch ist – nicht *was*.
   */
  const errId = (k: string) => `fehler-${k}`;
  const err = (k: string) =>
    errors[k] ? (
      <span
        id={errId(k)}
        role="alert"
        className="mt-1.5 block text-[0.8125rem]"
        style={{ color: "var(--danger)" }}
      >
        {errors[k]}
      </span>
    ) : null;
  /** Felder verweisen nur auf die Meldung, solange es sie gibt. */
  const describedBy = (k: string) => (errors[k] ? errId(k) : undefined);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">Name</span>
          <input
            name="name"
            required
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={describedBy("name")}
            className={`h-12 ${fieldClass}`}
            placeholder="Vor- und Nachname"
          />
          {err("name")}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">E-Mail</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={describedBy("email")}
            className={`h-12 ${fieldClass}`}
            placeholder="fuer.die.antwort@example.de"
          />
          {err("email")}
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">
            Telefon <span className="font-normal text-ink-faint">(optional)</span>
          </span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            className={`h-12 ${fieldClass}`}
            placeholder="Für schnelle Rückfragen"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">
            Gerätemodell
          </span>
          <input
            name="device"
            className={`h-12 ${fieldClass}`}
            placeholder="z. B. iPhone 13 oder Galaxy S22"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">Anliegen</span>
        <select name="topic" className={`h-12 appearance-none ${fieldClass}`}>
          {topics.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">
          Problembeschreibung
        </span>
        <textarea
          name="message"
          required
          rows={5}
          aria-invalid={!!errors.message}
          aria-describedby={describedBy("message")}
          className={`py-3 ${fieldClass}`}
          placeholder="Was ist passiert? Seit wann? Alles hilft uns, schneller zu helfen."
        />
        {err("message")}
      </label>

      {/* Bild-Upload */}
      <div>
        <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">
          Foto des Schadens <span className="font-normal text-ink-faint">(optional)</span>
        </span>
        <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-s)] border border-dashed border-line-strong bg-raised px-4 py-3.5 transition-colors hover:border-ink-faint">
          <Icon name="camera" size={19} className="shrink-0 text-ink-soft" />
          <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-ink-soft">
            {fileName ?? "Bild auswählen – max. 5 MB"}
          </span>
          <input
            type="file"
            name="image"
            accept="image/*"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        {err("image")}
      </div>

      {/* Honeypot – für Menschen unsichtbar, für Bots verlockend. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="consent"
          required
          aria-invalid={!!errors.consent}
          aria-describedby={describedBy("consent")}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
        />
        <span className="text-[0.875rem] leading-relaxed text-ink-soft">
          Ich bin einverstanden, dass meine Angaben zur Bearbeitung meiner
          Anfrage verarbeitet werden. Details in der{" "}
          <Link href="/datenschutz" className="text-accent hover:underline">
            Datenschutzerklärung
          </Link>
          . Die Daten werden nicht an Dritte weitergegeben.
        </span>
      </label>
      {err("consent")}

      <button
        type="submit"
        disabled={state === "sending"}
        data-magnetic=""
        className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-accent px-7 text-base font-medium text-accent-contrast shadow-button transition-colors duration-[var(--duration-fast)] hover:bg-accent-hover disabled:opacity-60"
        style={{ transitionProperty: "background-color, opacity" }}
      >
        {state === "sending" ? "Wird gesendet …" : "Anfrage senden"}
        {state === "sending" ? null : <Icon name="arrow-right" size={18} />}
      </button>

      {state === "drafted" ? (
        <p className="flex items-start gap-2 text-[0.9375rem] text-ink-soft">
          <Icon name="mail" size={18} className="mt-0.5 shrink-0" />
          Ihr E-Mail-Programm öffnet sich mit der fertigen Nachricht – bitte nur
          noch abschicken.
        </p>
      ) : null}
    </form>
  );
}
