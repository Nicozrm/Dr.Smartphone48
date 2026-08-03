import { site } from "@/lib/site";
import { pageMeta } from "@/lib/seo";
import { hasTicketBackend } from "@/lib/supabase/env";

export const metadata = pageMeta({
  path: "/datenschutz",
  title: "Datenschutzerklärung",
  description: `Wie ${site.name} personenbezogene Daten verarbeitet – Kontaktformular, Hosting, Ihre Rechte nach DSGVO.`,
  noindex: true,
});

export default function DatenschutzPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 pt-28 md:px-8 md:pt-36">
      <p className="text-eyebrow">Rechtliches</p>
      <h1 className="text-headline mt-4">Datenschutzerklärung</h1>

      <div className="mt-10 space-y-8 leading-relaxed text-ink">
        <section>
          <h2 className="text-title">Datenschutz auf einen Blick</h2>
          <p className="mt-3 text-ink-soft">
            Diese Website verarbeitet so wenige Daten wie möglich: Sie setzt
            keine Tracking-Cookies, keine Analysedienste und keine
            Werbenetzwerke ein. Sämtliche Werkzeuge – vom Sofortpreis-Rechner
            über den Geräte-Check bis zum Übergabeprotokoll – arbeiten
            vollständig in Ihrem Browser. Ihre Eingaben verlassen Ihr Gerät
            erst, wenn Sie uns aktiv eine Anfrage senden.
          </p>
        </section>
        <section>
          <h2 className="text-title">Verantwortliche Stelle</h2>
          <p className="mt-3">
            {site.legalName}
            <br />
            {site.street}, {site.zip} {site.city}
            <br />
            E-Mail: {site.email}
          </p>
        </section>
        <section>
          <h2 className="text-title">Einwilligung vor jedem Versand</h2>
          <p className="mt-3 text-ink-soft">
            Auf dieser Website geht nichts ungefragt hinaus. Jede Anfrage und
            jeder Auftrag – Kontaktformular, Terminanfrage aus dem
            Sofortpreis-Rechner, Ankauf-Anfrage
            {hasTicketBackend() ? ", die Anmeldung eines Vorgangs" : ""} und die
            Terminanfrage aus dem Reparatur-Ticket – verlangt zwei getrennte
            Handlungen:
          </p>
          <ol className="mt-4 space-y-2.5 text-ink-soft">
            <li>
              <strong className="font-medium text-ink-strong">
                1. Datenschutzerklärung annehmen.
              </strong>{" "}
              Das Kästchen ist nie vorausgewählt und wird auch nicht durch
              Weiterklicken gesetzt (Art. 6 Abs. 1 lit. a i. V. m. Art. 4
              Nr. 11 DSGVO).
            </li>
            <li>
              <strong className="font-medium text-ink-strong">
                2. Auf „Senden“ drücken.
              </strong>{" "}
              Erst dieser Druck löst die Übermittlung aus. Fehlt der Haken,
              sagt die Schaltfläche das und sendet nichts.
            </li>
          </ol>
          <p className="mt-4 text-ink-soft">
            Die abgeschickte Anfrage geht ausschließlich an {site.name}: als
            E-Mail an {site.email}, das Postfach des Betriebs bei Google
            (Gmail). Dort kann sie nur {site.name} einsehen; an sonstige
            Dritte wird sie nicht weitergegeben. Läuft die Anfrage über
            WhatsApp, gelten für den Transport zusätzlich die
            Datenschutzbestimmungen dieses Anbieters. Die Einwilligung gilt
            nur für die jeweilige Anfrage und lässt sich jederzeit formlos
            an {site.email} widerrufen – die Rechtmäßigkeit der bis dahin
            erfolgten Verarbeitung bleibt davon unberührt.
          </p>
        </section>
        <section>
          <h2 className="text-title">Kontaktaufnahme</h2>
          <p className="mt-3 text-ink-soft">
            Wenn Sie uns per E-Mail oder Telefon kontaktieren, verarbeiten wir
            Ihre Angaben ausschließlich zur Bearbeitung Ihrer Anfrage
            (Art. 6 Abs. 1 lit. b DSGVO). Die Daten werden gelöscht, sobald sie
            für diesen Zweck nicht mehr erforderlich sind und keine
            gesetzlichen Aufbewahrungspflichten bestehen.
          </p>
        </section>
        <section>
          <h2 className="text-title">Werkzeuge auf dieser Website</h2>
          <p className="mt-3 text-ink-soft">
            Sofortpreis-Rechner, Geräte-Check, digitaler Zwilling, Akku-Coach,
            Ankauf-Rechner und Reparatur-Ticket laufen vollständig in Ihrem
            Browser. Es gibt für sie keine Serververarbeitung, keine Datenbank
            und keine Übermittlung an Dritte.
          </p>
          <ul className="mt-4 space-y-2.5 text-ink-soft">
            <li>
              <strong className="font-medium text-ink-strong">Geräte-Check:</strong>{" "}
              Die Tests greifen – nur nach Ihrer ausdrücklichen Freigabe – auf
              Kamera, Mikrofon, Lage- und Bewegungssensoren sowie den
              Akkustatus zu. Die Messwerte werden im Arbeitsspeicher
              ausgewertet und nicht gespeichert oder gesendet. Aufnahmen
              entstehen dabei nicht.
            </li>
            <li>
              <strong className="font-medium text-ink-strong">Reparatur-Ticket:</strong>{" "}
              Name, Telefonnummer, IMEI, Zustandsangaben und Anmerkungen
              bleiben im Arbeitsspeicher dieses Tabs. Sie werden nicht
              gesendet und auch nicht lokal gespeichert; mit dem Schließen des
              Tabs sind sie weg. Gerät und gewählte Reparaturen stehen in der
              Adresse der Seite – teilen Sie diesen Link daher nur bewusst.
              {hasTicketBackend() ? (
                <>
                  {" "}
                  Die Ausnahme ist die freiwillige Anmeldung eines Vorgangs am
                  Ende der Ticketseite; sie ist im übernächsten Abschnitt
                  beschrieben.
                </>
              ) : null}
            </li>
            <li>
              <strong className="font-medium text-ink-strong">
                Anfragen, die Sie absenden:
              </strong>{" "}
              Erst wenn Sie eine Terminanfrage, eine Ankauf-Anfrage oder das
              Kontaktformular nach angenommener Datenschutzerklärung
              abschicken, verlassen die eingegebenen Daten Ihr Gerät – zur
              Bearbeitung Ihres Anliegens (Art. 6 Abs. 1 lit. b DSGVO).
            </li>
            <li>
              <strong className="font-medium text-ink-strong">
                Gewählte Darstellung:
              </strong>{" "}
              Ob Sie hell oder dunkel lesen, merkt sich Ihr Browser lokal
              (localStorage). Diese Angabe ist rein technisch, wird nicht
              übertragen und lässt keinen Rückschluss auf Ihre Person zu.
            </li>
          </ul>
        </section>
        {/* Der Abschnitt erscheint nur, wo es die Vorgangsverwaltung gibt.
            Eine Datenschutzerklärung, die eine Verarbeitung beschreibt, die
            gar nicht stattfindet, ist genauso falsch wie eine, die eine
            verschweigt. */}
        {hasTicketBackend() ? (
          <section>
            <h2 className="text-title">Reparaturvorgang anmelden (freiwillig)</h2>
            <p className="mt-3 text-ink-soft">
              Am Ende der Ticketseite können Sie Ihren Vorgang bei uns
              anmelden. Erst dieser Schritt legt einen Datensatz an – ohne ihn
              bleibt es beim oben Beschriebenen. Die Anmeldung ist freiwillig;
              ohne sie können Sie das Gerät genauso abgeben.
            </p>
            <ul className="mt-4 space-y-2.5 text-ink-soft">
              <li>
                <strong className="font-medium text-ink-strong">
                  Was gespeichert wird:
                </strong>{" "}
                Name, Telefonnummer und/oder E-Mail-Adresse, auf Wunsch die
                IMEI, Ihre Anmerkung, das Gerät, die beauftragten Leistungen
                mit Festpreis sowie der Bearbeitungsstand mit seinen
                Zeitpunkten. Aus dem Übergabeprotokoll wird nichts übernommen –
                Schadenskarte, Zubehörliste und Angaben zur Gerätesperre
                bleiben in Ihrem Browser.
              </li>
              <li>
                <strong className="font-medium text-ink-strong">Wozu:</strong>{" "}
                zur Durchführung des Reparaturauftrags und zur Auskunft über
                den Stand (Art. 6 Abs. 1 lit. b DSGVO). Wenn Sie einen Weg für
                Benachrichtigungen wählen, verarbeiten wir Ihre Kontaktdaten
                zusätzlich dafür auf Grundlage Ihrer Einwilligung (Art. 6
                Abs. 1 lit. a DSGVO); „keine Nachrichten“ ist die Vorauswahl.
              </li>
              <li>
                <strong className="font-medium text-ink-strong">Wo:</strong>{" "}
                in einer Datenbank bei Supabase (Rechenzentrum in der EU), die
                ausschließlich {site.name} zugänglich ist – über ein
                persönliches Konto mit Passwort. Eine Weitergabe an Dritte
                findet nicht statt.
              </li>
              <li>
                <strong className="font-medium text-ink-strong">
                  Die Vorgangsnummer ist ein Schlüssel:
                </strong>{" "}
                Wer sie hat, sieht die Statusseite. Deshalb stehen dort weder
                Ihr Name noch Telefonnummer, E-Mail oder IMEI – nur Gerät,
                Auftrag und Bearbeitungsstand. Behandeln Sie die Nummer wie
                einen Schlüssel und geben Sie sie nur weiter, wenn jemand
                mitschauen soll.
              </li>
              <li>
                <strong className="font-medium text-ink-strong">
                  Wie lange:
                </strong>{" "}
                bis zum Abschluss des Vorgangs und darüber hinaus, solange
                Gewährleistungs- und Garantiefragen möglich sind oder
                gesetzliche Aufbewahrungspflichten bestehen. Danach wird der
                Vorgang samt Verlauf gelöscht.
              </li>
              <li>
                <strong className="font-medium text-ink-strong">
                  Widerruf und Löschung:
                </strong>{" "}
                formlos an {site.email} oder telefonisch unter {site.phone} –
                mit der Vorgangsnummer geht es am schnellsten. Der Widerruf der
                Einwilligung in Benachrichtigungen wirkt sofort und lässt die
                Bearbeitung des Auftrags unberührt.
              </li>
            </ul>
          </section>
        ) : null}
        <section>
          <h2 className="text-title">Offline-Nutzung (Service Worker)</h2>
          <p className="mt-3 text-ink-soft">
            Damit insbesondere die Notfall-Soforthilfe auch ohne Verbindung
            lesbar bleibt, legt die Website Seiteninhalte im Cache Ihres
            Browsers ab (Art. 6 Abs. 1 lit. f DSGVO). Gespeichert werden
            ausschließlich öffentliche Seiten dieser Website, keine
            personenbezogenen Daten. Sie können den Speicher jederzeit über
            die Website-Einstellungen Ihres Browsers leeren.
          </p>
        </section>
        <section>
          <h2 className="text-title">Externe Dienste und Verweise</h2>
          <p className="mt-3 text-ink-soft">
            Diese Website bindet keine fremden Inhalte ein, die sich beim
            bloßen Aufrufen laden – keine Schriften von fremden Servern, keine
            Analyse-Skripte, keine Werbenetzwerke.
          </p>
          <p className="mt-3 text-ink-soft">
            <strong className="font-medium text-ink-strong">
              Google-Maps-Karte auf der Kontaktseite:
            </strong>{" "}
            Sie ist zunächst nur eine Vorschau aus eigenen Mitteln. Erst wenn
            Sie auf „Karte von Google laden“ klicken, wird die Karte
            nachgeladen; dabei werden Ihre IP-Adresse und technische Angaben
            zu Ihrem Browser an Google übertragen, und Google kann Cookies
            setzen. Rechtsgrundlage ist Ihre Einwilligung durch diesen Klick
            (Art. 6 Abs. 1 lit. a DSGVO). Ohne Klick findet keine Verbindung
            statt.
          </p>
          <p className="mt-3 text-ink-soft">
            Verweise auf Google-Rezensionen, die Routenplanung und WhatsApp
            sind gewöhnliche Links: Sie werden erst beim Anklicken aufgerufen.
            Ab dann gelten die Datenschutzbestimmungen des jeweiligen
            Anbieters.
          </p>
        </section>
        <section>
          <h2 className="text-title">Hosting und Server-Logs</h2>
          <p className="mt-3 text-ink-soft">
            Beim Aufruf der Website verarbeitet der Hosting-Anbieter technisch
            notwendige Daten (IP-Adresse, Zeitpunkt, aufgerufene Seite), um die
            Website sicher auszuliefern (Art. 6 Abs. 1 lit. f DSGVO).
          </p>
        </section>
        <section>
          <h2 className="text-title">Ihre Rechte</h2>
          <p className="mt-3 text-ink-soft">
            Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Löschung,
            Einschränkung der Verarbeitung, Datenübertragbarkeit sowie
            Widerspruch. Wenden Sie sich dazu formlos an {site.email}. Zudem
            besteht ein Beschwerderecht bei der zuständigen Aufsichtsbehörde.
          </p>
        </section>
        <p className="border-t border-line pt-6 text-[0.875rem] text-ink-faint">
          Hinweis: Dies ist eine Platzhalter-Datenschutzerklärung. Vor
          Veröffentlichung juristisch prüfen und vervollständigen.
        </p>
      </div>
    </section>
  );
}
