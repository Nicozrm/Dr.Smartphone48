"use client";

import { Icon } from "@/components/ui/Icon";
import type { Handoff } from "@/lib/intern/handoff";

/**
 * Der Hinweis auf eine wartende Übergabe.
 *
 * Er steht in Rechnung und Zertifikat an derselben Stelle und stellt dieselbe
 * Frage. Der Grund, warum er überhaupt fragt statt einfach zu übernehmen:
 *
 * Das Rechnungswerkzeug sichert laufend einen Entwurf. Wer aus einem Vorgang
 * heraus eine Rechnung anlegt, hätte also fast immer einen Entwurf, der
 * dabei stillschweigend verschwände – womöglich eine halb fertige Rechnung
 * für einen anderen Kunden. Deshalb wird nur dann ungefragt übernommen, wenn
 * nichts zu verlieren ist (leeres Formular); sonst entscheidet der Betrieb.
 *
 * Und er zeigt vorher, **was** übernommen wird. Eine Übernahme, die man erst
 * am Ergebnis erkennt, ist keine Entscheidung, sondern eine Überraschung.
 */
export function HandoffNotice({
  handoff,
  replaces,
  onApply,
  onDismiss,
}: {
  handoff: Handoff;
  /** Steht schon Arbeit im Formular, die dabei ersetzt würde? */
  replaces: boolean;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const what = handoff.repairs.map((r) => r.label).join(" · ");

  return (
    <div className="handoff" role="status">
      <div className="handoff__body">
        <p className="handoff__title">
          <Icon name="arrow-right" size={15} aria-hidden="true" />
          Vorgang <span className="font-mono">{handoff.ticketCode}</span> übernehmen?
        </p>
        <p className="handoff__what">
          {handoff.customer} · {handoff.device}
          {handoff.imei ? ` · IMEI ${handoff.imei}` : ""}
          {what ? ` · ${what}` : ""}
        </p>
        {replaces ? (
          <p className="handoff__warn">
            Im Formular steht bereits etwas. Beim Übernehmen wird es ersetzt.
          </p>
        ) : null}
      </div>
      <div className="handoff__actions">
        <button type="button" onClick={onApply} data-ripple className="press handoff__yes">
          Übernehmen
        </button>
        <button type="button" onClick={onDismiss} className="press handoff__no">
          Verwerfen
        </button>
      </div>
    </div>
  );
}
