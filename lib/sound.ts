/*
  Der Klick beim Rasten – ein Ton, kein Klang.

  Apple-Niveau bei Mikro-Interaktionen ist zu einem großen Teil eine Frage
  des Tons, nicht der Bewegung: ein Kamera-Auslöser, ein Home-Button, ein
  Lautstärkeregler geben beim Einrasten ein Feedback, das man mehr fühlt als
  hört. Genau das soll dieser Klick sein – am Ende einer Auswahl im
  Sofortpreis-Rechner, nicht als eigenes Erlebnis.

  Drei Entscheidungen halten das ein:

  – **Standardmäßig aus.** Eine Website, die ungefragt Geräusche macht, wirkt
    nicht hochwertig, sondern übergriffig – am Arbeitsplatz, im Wartezimmer,
    überall dort, wo online kaum jemand mit Ton rechnet. Wer ihn will, findet
    ihn in der Befehlspalette oder am kleinen Schalter im Rechner.
  – **Kein Audio-File.** Wie beim Briefkopf im Rechnungswerkzeug: reines
    JavaScript, keine Ladelast, keine Cache-Frage. Der „Klick" ist ein kurzer,
    gefilterter Rauschimpuls – kein Ton, kein Piepsen, sondern ein Geräusch,
    wie ein mechanischer Taster es machen würde.
  – **Nie lauter als nötig.** Der Pegel bleibt bewusst niedrig; wer ihn beim
    ersten Mal überhaupt bemerkt, hat genau richtig hingehört.
*/

const STORAGE_KEY = "op-sound";

/** Ist der Klick eingeschaltet? Ungesetzt heißt: aus. */
export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

/**
 * Ein CustomEvent "op-soundchange" hält andere Komponenten (Schalter im
 * Rechner, Befehlspalette) synchron – dasselbe Muster wie bei
 * `lib/theme.ts` und "op-themechange".
 */
export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Privater Modus o. Ä. – kein Grund zu scheitern.
  }
  window.dispatchEvent(new CustomEvent("op-soundchange", { detail: on }));
}

export function toggleSound(): boolean {
  const next = !soundEnabled();
  setSoundEnabled(next);
  return next;
}

/*
  Die Audio-Engine.

  Ein einziger AudioContext für die ganze Seite, erst erzeugt, wenn der
  erste Klick tatsächlich gebraucht wird – und zwar innerhalb des
  Klick-Handlers selbst. iOS und die meisten anderen Browser erlauben
  AudioContext.resume() nur synchron innerhalb einer Nutzergeste; ein Umweg
  über einen weiteren Tick würde den Ton auf dem iPhone stumm bleiben lassen.

  Der Rauschimpuls wird einmal als Buffer erzeugt und wiederverwendet –
  30 Millisekunden Rauschen kosten nichts Nennenswertes, aber warum bei
  jedem Klick neu würfeln, wenn eine einzige kurze Hüllkurve genügt.
*/

let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function getContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

function getNoiseBuffer(context: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const duration = 0.03;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

/**
 * Der Klick selbst.
 *
 * `variant` unterscheidet Einrasten von Loslassen – derselbe Unterschied,
 * den ein echter Taster beim Drücken und beim Loslassen macht: beim
 * Einrasten heller und eine Idee lauter, beim Loslassen tiefer und leiser.
 * Still, wenn der Ton aus ist, der Browser keine Web Audio API hat oder die
 * Nutzergeste (aus welchem Grund auch immer) keinen Ton erlaubt – ein
 * fehlgeschlagener Klick darf nie die eigentliche Auswahl stören.
 */
export function playClick(variant: "on" | "off" = "on"): void {
  if (!soundEnabled()) return;

  try {
    const context = getContext();
    if (!context) return;
    if (context.state === "suspended") void context.resume();

    const buffer = getNoiseBuffer(context);
    const source = context.createBufferSource();
    source.buffer = buffer;

    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = variant === "on" ? 3200 : 1900;
    filter.Q.value = 1.1;

    const gain = context.createGain();
    const now = context.currentTime;
    const peak = variant === "on" ? 0.07 : 0.045;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    source.connect(filter).connect(gain).connect(context.destination);
    source.start(now);
    source.stop(now + 0.04);
  } catch {
    // Ton ist eine Zugabe. Ein Fehler hier darf die Auswahl nie aufhalten.
  }
}
