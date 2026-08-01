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
    </section>
  );
}
