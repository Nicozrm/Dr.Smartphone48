/**
 * Die Lautsprecher-Entwässerung – Wasser mit Schall aus der Kammer treiben.
 *
 * Ein Mikrolautsprecher sitzt hinter einem Gitter in einer kleinen Kammer.
 * Kommt Wasser hinein – Regen, Spritzer, Schweiß, ein Glas –, dann bleibt es
 * dort: Die Öffnung ist schmal genug, dass die Oberflächenspannung den
 * Tropfen hält. Der Klang wird dumpf und leise, und viele halten das für
 * einen defekten Lautsprecher.
 *
 * Er ist meist nicht defekt. Die Membran kann das Wasser selbst
 * heraustreiben, wenn man sie weit genug auslenkt: Bei tiefen Tönen legt sie
 * je Schwingung den längsten Weg zurück und schiebt das größte Luftvolumen
 * durch die Öffnung. Apple macht in der Apple Watch dasselbe – dort heißt es
 * „Water Lock“ und arbeitet mit rund 165 Hz.
 *
 * ## Warum ein Band und kein fester Ton
 *
 * Welche Frequenz eine bestimmte Kammer am besten leert, hängt an ihrem
 * Volumen, an der Form des Kanals und an der Größe der Öffnung. Diese Seite
 * kennt das Modell nicht, das gerade in der Hand liegt. Ein fest gewählter
 * Ton wäre also für die meisten Geräte geraten – deshalb läuft der Ton über
 * ein Band um die 165 Hz herum und wieder zurück. Was hier nicht passiert:
 * eine Frequenz nennen, die „die richtige“ sei.
 *
 * ## Warum jede Schwingung sanft anfängt und aufhört
 *
 * Ein Sinus, der bei voller Lautstärke aus dem Nichts einsetzt, beginnt mit
 * einem Sprung. Der Sprung enthält alle Frequenzen gleichzeitig, klingt als
 * hartes Knacken und belastet die Membran an ihrem Anschlag, statt sie zu
 * bewegen. Die Hüllkurve fährt deshalb an beiden Enden jedes Durchlaufs auf
 * null – hörbar als weiches An- und Abschwellen, messbar als
 * `envelopeAt(0) === 0`.
 *
 * ## Was das Werkzeug nicht ist
 *
 * Es ist keine Wasserschaden-Behandlung. Es räumt eine Kammer frei, die von
 * außen zugänglich ist. Wasser **im** Gerät erreicht es nicht, und ein Gerät,
 * das nass geworden ist, soll man ohnehin nicht einschalten – das steht auf
 * /notfall und gilt weiter. Wer den Ton startet, hat ein laufendes Gerät mit
 * einem dumpfen Lautsprecher, nicht ein nasses Telefon in der Hand.
 */

/** Untere Bandgrenze in Hertz. */
export const SWEEP_LOW = 110;

/** Obere Bandgrenze in Hertz. Zusammen mit SWEEP_LOW liegt die Mitte des
    Bandes bei 185 Hz, also in der Gegend, die Apple für dieselbe Aufgabe
    nutzt. Nach oben hinaus nimmt die Auslenkung ab, nach unten hinaus geben
    die meisten Mikrolautsprecher nichts mehr her. */
export const SWEEP_HIGH = 260;

/** Dauer eines Durchlaufs (hinauf und zurück) in Sekunden. */
export const CYCLE_SECONDS = 1.8;

/** Anzahl der Durchläufe. Acht mal 1,8 s ergibt gut 14 Sekunden – lang genug,
    dass ein gelöster Tropfen den Weg nach draußen findet, kurz genug, dass
    niemand das Gerät weglegt. */
export const CYCLES = 8;

/** Gesamtdauer der Behandlung in Sekunden. */
export const TOTAL_SECONDS = CYCLE_SECONDS * CYCLES;

/** Anteil eines Durchlaufs, über den die Hüllkurve auf- bzw. abfährt.
    30 ms bei 1,8 s Durchlauf – kurz genug, um nicht als Ausblendung zu
    wirken, lang genug gegen das Knacken. */
export const FADE = 0.03 / CYCLE_SECONDS;

/**
 * Frequenz an der Stelle `t` innerhalb eines Durchlaufs (0 … CYCLE_SECONDS).
 *
 * Dreieckig: die erste Hälfte hinauf, die zweite zurück. Der Rückweg ist
 * kein Zierrat – er sorgt dafür, dass der nächste Durchlauf wieder bei
 * SWEEP_LOW anfängt und die Frequenz beim Übergang nicht springt. Ein Sprung
 * wäre wieder ein Knacken, siehe oben.
 */
export function frequencyAt(t: number): number {
  const x = clamp01(t / CYCLE_SECONDS);
  // 0 → 0, 0.5 → 1, 1 → 0
  const up = x <= 0.5 ? x * 2 : (1 - x) * 2;
  return SWEEP_LOW + (SWEEP_HIGH - SWEEP_LOW) * up;
}

/**
 * Lautstärkefaktor an der Stelle `t` innerhalb eines Durchlaufs.
 *
 * Voll ausgesteuert in der Mitte, an beiden Enden auf null. Der Wert ist ein
 * Faktor auf die Ausgabe, keine Systemlautstärke – die kann eine Website
 * nicht setzen, und deshalb steht der Hinweis „Lautstärke aufdrehen“ auf der
 * Seite.
 */
export function envelopeAt(t: number): number {
  const x = clamp01(t / CYCLE_SECONDS);
  if (x < FADE) return x / FADE;
  if (x > 1 - FADE) return (1 - x) / FADE;
  return 1;
}

/** Wie viel der Behandlung nach `elapsed` Sekunden erledigt ist (0 … 1). */
export function progressAt(elapsed: number): number {
  return clamp01(elapsed / TOTAL_SECONDS);
}

/** Nummer des laufenden Durchlaufs, 1-basiert und auf CYCLES gedeckelt. */
export function cycleAt(elapsed: number): number {
  if (elapsed >= TOTAL_SECONDS) return CYCLES;
  return Math.min(CYCLES, Math.floor(elapsed / CYCLE_SECONDS) + 1);
}

/** Frequenz zur absoluten Laufzeit – für die Anzeige während der Behandlung. */
export function frequencyAtElapsed(elapsed: number): number {
  return frequencyAt(elapsed % CYCLE_SECONDS);
}

/**
 * Stützstellen eines Durchlaufs für die Zeitplanung im Web-Audio-Graphen.
 *
 * Die Kurve wird nicht je Bild gesetzt, sondern einmal im Voraus geplant:
 * `AudioParam` interpoliert zwischen den Stützstellen im Audio-Thread, und
 * der ist der einzige, den ein hakender Hauptstrang nicht stört. Ein Ton,
 * der beim Scrollen stottert, wäre hier nicht nur unschön – er wäre eine
 * andere Messung.
 */
export function curve(steps = 64): { t: number; hz: number; gain: number }[] {
  const out: { t: number; hz: number; gain: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * CYCLE_SECONDS;
    out.push({ t, hz: frequencyAt(t), gain: envelopeAt(t) });
  }
  return out;
}

/**
 * Die ganze Behandlung als **eine** Kurve.
 *
 * Der naheliegende Weg wäre, je Durchlauf ein `setValueCurveAtTime` zu
 * planen – acht Aufrufe, sauber aneinandergereiht. Genau das lehnt die
 * Web-Audio-Umsetzung von Chromium ab: Zwei Kurven, von denen die zweite
 * exakt dort beginnt, wo die erste endet, gelten ihr als überlappend, und
 * der dritte Aufruf wirft `NotSupportedError`. Der Ton lief damit in keinem
 * Chromium-Browser – ohne sichtbaren Fehler, denn der Wurf landete vor dem
 * Zustandswechsel, und die Schaltfläche blieb einfach auf „Ton starten“.
 *
 * Eine einzige Kurve über die volle Dauer umgeht das und ist obendrein
 * ehrlicher: Der Ablauf ist eine Bewegung, nicht acht.
 *
 * Die Stelle innerhalb des Durchlaufs wird aus dem Index gerechnet, nicht
 * aus der Zeit. `t % CYCLE_SECONDS` sammelt über acht Durchläufe
 * Gleitkommafehler ein und trifft die Nahtstellen dann knapp daneben – dort
 * steht die Hüllkurve aber auf null, und knapp daneben ist sie es nicht
 * mehr. Ein Knacken je Naht wäre die Folge.
 */
export function fullCurve(stepsPerCycle = 64): {
  t: number;
  hz: number;
  gain: number;
}[] {
  const out: { t: number; hz: number; gain: number }[] = [];
  const steps = stepsPerCycle * CYCLES;
  for (let i = 0; i <= steps; i++) {
    const within = ((i % stepsPerCycle) / stepsPerCycle) * CYCLE_SECONDS;
    out.push({
      t: (i / steps) * TOTAL_SECONDS,
      hz: frequencyAt(within),
      gain: envelopeAt(within),
    });
  }
  return out;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
