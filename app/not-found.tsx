import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-5 pt-16 text-center md:px-8">
      <p className="font-mono text-[0.8125rem] tracking-[0.14em] text-ink-faint">
        FEHLER 404
      </p>
      <h1 className="text-headline mt-4">Diese Seite gibt es nicht.</h1>
      <p className="mt-4 max-w-md text-lg text-ink-soft">
        Aber vielleicht können wir trotzdem etwas für Sie reparieren.
      </p>
      <div className="mt-8">
        <Button href="/">
          Zur Startseite
          <Icon name="arrow-right" size={16} />
        </Button>
      </div>
    </section>
  );
}
