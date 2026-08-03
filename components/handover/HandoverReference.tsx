import { handoverGroups, passcodeOptions, platformLabel, type Platform } from "@/lib/data/handover";

/**
 * Der vollständige Text beider Plattformen – als Server-Komponente, ohne
 * Zustand, ohne JavaScript.
 *
 * Warum es das zusätzlich zum Assistenten gibt:
 *
 * Der Assistent ist ein Client-Werkzeug; ohne JavaScript bliebe von dieser
 * Seite nur die Überschrift und eine Plattformwahl, die auf nichts reagiert.
 * Bei einer Seite, deren gesamter Wert im Text steckt, ist das zu wenig – und
 * es widerspräche der Regel aus lib/data/faq.ts: Strukturierte Daten dürfen
 * nur beschreiben, was auch tatsächlich im Dokument steht. Das HowTo-Schema
 * dieser Seite nennt vier Schritte; hier stehen sie.
 *
 * Sichtbar ist immer genau eine der beiden Fassungen – gesteuert über das
 * `html[data-js]`-Gate aus globals.css, dasselbe Muster wie bei den
 * Scroll-Reveals.
 */
export function HandoverReference() {
  return (
    <div className="space-y-16">
      <p className="rounded-[var(--radius-m)] border border-line bg-raised p-5 leading-relaxed text-ink-soft">
        Nachfolgend beide Wege vollständig – für iPhone und für Android. Mit
        aktiviertem JavaScript wird daraus eine abhakbare Liste, die sich
        drucken lässt.
      </p>

      {(["ios", "android"] as Platform[]).map((platform) => (
        <section key={platform}>
          <h2 className="text-headline">{platformLabel[platform]}</h2>

          {handoverGroups(platform).map((group) => (
            <div key={group.id} className="mt-9">
              <h3 className="text-title">{group.label}</h3>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
                {group.lede}
              </p>

              {group.steps.map((step) => (
                <article
                  key={step.id}
                  className="mt-5 rounded-[var(--radius-l)] border border-line bg-raised p-5 md:p-6"
                >
                  <h4 className="flex flex-wrap items-center gap-2.5 text-[1.0625rem] font-medium text-ink-strong">
                    {step.title}
                    <span className="rounded-full bg-sunken px-2.5 py-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-soft">
                      {step.required ? "nötig" : "empfohlen"}
                    </span>
                  </h4>
                  <p className="mt-2 leading-relaxed text-ink">{step.why}</p>

                  {step.paths ? (
                    <dl className="mt-4 space-y-2.5">
                      {step.paths.map((path) => (
                        <div
                          key={path.label}
                          className="rounded-[var(--radius-s)] border border-line bg-page p-3.5"
                        >
                          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-faint">
                            {path.label}
                          </dt>
                          <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-strong">
                            {path.steps}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}

                  {step.pitfall ? (
                    <p className="mt-4 border-l-2 border-[var(--warn)] py-0.5 pl-4 text-[0.9375rem] leading-relaxed text-ink-soft">
                      <span className="font-medium text-ink-strong">
                        Übersehen die meisten:{" "}
                      </span>
                      {step.pitfall}
                    </p>
                  ) : null}

                  <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
                    <span className="font-medium text-ink-strong">Wenn nicht: </span>
                    {step.ifSkipped}
                  </p>
                </article>
              ))}
            </div>
          ))}
        </section>
      ))}

      {/* Die Sperrcode-Abwägung gilt für beide Plattformen gleichermaßen. */}
      <section>
        <h2 className="text-headline">Der Sperrcode – Ihre Entscheidung</h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
          Hier gibt es keine richtige Antwort, nur einen Preis je Weg. Für jede
          Variante steht, was wir damit prüfen können und was entfällt.
        </p>

        <div className="mt-7 space-y-5">
          {passcodeOptions.map((option) => (
            <article
              key={option.id}
              className="rounded-[var(--radius-l)] border border-line bg-raised p-5 md:p-6"
            >
              <h3 className="text-[1.0625rem] font-medium text-ink-strong">
                {option.label}
              </h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{option.summary}</p>

              <div className="mt-4 grid gap-5 border-t border-line pt-4 sm:grid-cols-2">
                <div>
                  <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-faint">
                    Prüfbar
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {option.covered.map((item) => (
                      <li key={item} className="text-[0.875rem] leading-relaxed text-ink">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-faint">
                    Entfällt
                  </p>
                  {option.notCovered.length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                      {option.notCovered.map((item) => (
                        <li
                          key={item}
                          className="text-[0.875rem] leading-relaxed text-ink-soft"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[0.875rem] text-ink-soft">Nichts entfällt.</p>
                  )}
                </div>
              </div>

              <p className="mt-4 rounded-[var(--radius-s)] bg-sunken p-3.5 text-[0.875rem] leading-relaxed text-ink-soft">
                {option.handling}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
