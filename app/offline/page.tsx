import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/lib/site";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/offline",
  title: "Offline",
  description: "Diese Seite erscheint, wenn keine Verbindung besteht.",
  noindex: true,
});

export default function OfflinePage() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-5 pt-16 text-center md:px-8">
      <p className="font-mono text-[0.8125rem] tracking-[0.14em] text-ink-faint">
        KEINE VERBINDUNG
      </p>
      <h1 className="text-headline mt-4">Sie sind offline.</h1>
      <p className="mt-4 max-w-md text-lg text-ink-soft">
        Sobald Ihre Verbindung zurück ist, geht es hier nahtlos weiter. Bereits
        besuchte Seiten bleiben verfügbar.
      </p>

      {/* Wer ohne Netz hier landet, hat oft genau das Problem, für das die
          Notfallseite gemacht ist – sie liegt deshalb im Cache bereit. */}
      <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/notfall"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-ink-strong px-5 text-[0.9375rem] font-medium text-[var(--surface-page)] transition-opacity hover:opacity-90"
        >
          <Icon name="shield" size={17} />
          Notfall-Soforthilfe öffnen
        </Link>
        <a
          href={site.phoneHref}
          className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
        >
          <Icon name="phone" size={17} />
          {site.phone}
        </a>
      </div>
      <p className="mt-5 max-w-sm text-[0.8125rem] leading-relaxed text-ink-faint">
        Die Notfall-Protokolle sind auf Ihrem Gerät gespeichert und funktionieren
        auch ohne Verbindung. Ein Anruf braucht nur Netz, kein Internet.
      </p>
    </section>
  );
}
