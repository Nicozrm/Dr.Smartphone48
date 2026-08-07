"use client";

import { useEffect, useRef } from "react";
import { currentTheme } from "@/lib/theme";

/**
 * DeviceStage – das Gerät selbst, in Echtzeit gerechnet.
 *
 * Kein Bild, kein Video, kein 3D-Modell: Der gesamte Körper entsteht aus
 * Distanzfunktionen und wird pro Bild geraymarcht. Titanrahmen mit
 * Umgebungsspiegelung, Frontglas mit Fresnel-Kante, Kameramodul mit drei
 * Linsen, und auf dem Display ein Lichtfeld, das lebt.
 *
 * Warum ohne Bibliothek: Three.js kostet rund 600 kB – mehr als die gesamte
 * übrige Seite. Für **einen** Körper, der sich dreht, ist das die falsche
 * Rechnung. Der Shader hier wiegt nichts, was nicht ohnehin übertragen wird.
 *
 * Dieselbe Disziplin wie im ShaderField:
 * – Auflösung gedeckelt (Raymarching ist teuer, das Objekt verträgt Weichheit)
 * – 36 Bilder je Sekunde statt 120; die Drehung braucht zwanzig Sekunden
 * – pausiert offscreen und bei verborgenem Tab
 * – auf schwachen Geräten und bei prefers-reduced-motion: ein Standbild
 * – ohne WebGL bleibt der CSS-Verlauf des Elternknotens stehen
 */

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_pointer;   // -1..1, geglättet
uniform float u_dark;
uniform float u_reduced;
uniform vec3  u_accent;    // Markenblau, aus den CSS-Tokens gereicht

const float PI = 3.14159265;

/* ---- Distanzfunktionen ------------------------------------------- */

float sdRoundBox(vec3 p, vec3 b, float r){
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

float sdCylinder(vec3 p, float h, float r){
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

mat3 rotY(float a){
  float c = cos(a), s = sin(a);
  return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}
mat3 rotX(float a){
  float c = cos(a), s = sin(a);
  return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
}

/* Maße eines 6,1-Zoll-Geräts, auf Einheitsmaß gebracht. */
const vec3 BODY = vec3(0.60, 1.24, 0.072);
const float BODY_R = 0.115;

/*
  map() gibt Abstand und Materialkennung zurück:
  1 = Gehäuse (Rahmen/Rückseite), 2 = Kamerabuckel, 3 = Linsenglas
  Front und Rückseite werden erst beim Schattieren über die Normale
  unterschieden – das spart einen ganzen SDF-Zweig je Schritt.
*/
vec2 map(vec3 p){
  float body = sdRoundBox(p, BODY, BODY_R);
  vec2 res = vec2(body, 1.0);

  // Kameramodul auf der Rückseite
  vec3 cp = p - vec3(-0.30, 0.80, -0.088);
  float bump = sdRoundBox(cp, vec3(0.235, 0.235, 0.030), 0.085);
  if (bump < res.x) res = vec2(bump, 2.0);

  // Drei Linsen
  vec3 lp = cp - vec3(0.0, 0.0, -0.030);
  lp = lp.xzy;
  float l1 = sdCylinder(lp - vec3(-0.105, 0.0,  0.105), 0.022, 0.082);
  float l2 = sdCylinder(lp - vec3( 0.105, 0.0,  0.105), 0.022, 0.082);
  float l3 = sdCylinder(lp - vec3(-0.105, 0.0, -0.105), 0.022, 0.082);
  float lens = min(l1, min(l2, l3));
  if (lens < res.x) res = vec2(lens, 3.0);

  return res;
}

vec3 calcNormal(vec3 p){
  vec2 e = vec2(0.0012, 0.0);
  return normalize(vec3(
    map(p + e.xyy).x - map(p - e.xyy).x,
    map(p + e.yxy).x - map(p - e.yxy).x,
    map(p + e.yyx).x - map(p - e.yyx).x
  ));
}

/*
  Weicher Schattenwurf – gibt dem Körper Gewicht.

  Sechzehn Schritte mit großzügiger Schrittweite. Jeder Schritt ist eine
  vollständige Auswertung der Distanzfunktion; bei einem Körper aus fünf
  Grundformen ist das der teuerste Posten nach dem Marsch selbst. Der
  Unterschied zu vierundzwanzig Schritten ist an dieser Objektgröße nicht
  zu sehen.
*/
float softShadow(vec3 ro, vec3 rd){
  float res = 1.0;
  float t = 0.05;
  for(int i = 0; i < 16; i++){
    float h = map(ro + rd * t).x;
    res = min(res, 9.0 * h / t);
    t += clamp(h, 0.03, 0.22);
    if(res < 0.01 || t > 2.6) break;
  }
  return clamp(res, 0.0, 1.0);
}

/*
  Studioumgebung. Der Kontrast ist bewusst hart: Titan sieht nur dann nach
  Metall aus, wenn sich etwas darin spiegelt, das selbst Kontrast hat. Ein
  gleichmäßig graues Umfeld ergibt gleichmäßig graues Blech.
*/
vec3 env(vec3 rd){
  float up = rd.y * 0.5 + 0.5;
  vec3 sky = mix(vec3(0.020, 0.023, 0.030), vec3(0.62, 0.65, 0.72),
                 smoothstep(0.30, 0.98, up));
  // Drei Softboxen: zwei lange Streifen und ein harter Kicker von hinten.
  float box1 = smoothstep(0.955, 0.999, dot(rd, normalize(vec3(-0.45, 0.86, 0.28))));
  float box2 = smoothstep(0.972, 1.0,   dot(rd, normalize(vec3( 0.72, 0.42, 0.55))));
  float kick = smoothstep(0.988, 1.0,   dot(rd, normalize(vec3( 0.30, -0.25, -0.92))));
  sky += vec3(1.0, 0.99, 0.97) * box1 * 2.6;
  sky += vec3(0.92, 0.95, 1.0) * box2 * 1.5;
  sky += u_accent * kick * 2.2;
  return sky;
}

/*
  Displayinhalt.

  Die erste Fassung leuchtete über die ganze Fläche und sah damit aus wie ein
  Hintergrundbild, nicht wie Glas. Ein eingeschaltetes Gerät im Produktlicht
  ist überwiegend **dunkel**: Was man sieht, ist zu neun Zehnteln die
  gespiegelte Umgebung und nur zu einem Zehntel das Panel darunter.

  Deshalb jetzt: tiefes Schwarz als Grund, ein einzelner ruhiger Lichtbogen
  in der Markenfarbe im unteren Drittel, und darüber die harte Spiegelung der
  Softbox. Das liest sich als Gerät, das an ist – ohne zu leuchten wie ein
  Werbedisplay.
*/
vec3 screenContent(vec2 uv, float t){
  vec2 q = uv * 2.0 - 1.0;

  /*
    Die Zahlen sind klein, und das ist der Punkt. Zwei Fassungen vorher
    leuchtete das Panel über die volle Fläche und sah damit aus wie ein
    Werbebildschirm im Schaufenster. Ein Gerät im Produktlicht ist fast
    schwarz: Das Panel liefert einen Hauch Farbe, die Zeichnung kommt aus
    der Spiegelung darüber.
  */
  float arc = smoothstep(0.62, 0.0, abs(q.x * 0.85 + sin(q.y * 1.05 + t * 0.26) * 0.42));
  float low = smoothstep(0.10, -0.95, q.y);       // nur das untere Drittel
  vec3 c = u_accent * arc * low * 0.30;

  // Zweiter, kühlerer Schleier für Tiefe.
  c += mix(u_accent, vec3(0.55, 0.72, 1.0), 0.55)
     * smoothstep(0.42, 0.0, abs(q.x * 1.15 - sin(q.y * 0.85 - t * 0.19) * 0.5 + 0.34))
     * low * 0.13;

  // Kaum wahrnehmbarer Grundschimmer – das Panel ist an, nicht aus.
  c += u_accent * 0.022 * smoothstep(1.2, -0.4, length(q * vec2(0.58, 0.42)));

  // Ecken bleiben schwarz, wie bei einem echten Panel im Streiflicht.
  c *= 1.0 - 0.55 * smoothstep(0.55, 1.25, length(q * vec2(0.75, 0.95)));
  return c;
}

void main(){
  vec2 frag = (gl_FragCoord.xy - 0.5 * u_res) / max(u_res.y, 1.0);
  float t = u_time * (1.0 - u_reduced);
  float aspect = u_res.x / max(u_res.y, 1.0);

  /*
    Bildaufteilung. Der Körper ist 2,48 Einheiten hoch; bei Brennweite 1,75
    zeigt die Kamera auf Abstand d eine halbe Bildhöhe von d/3,5. Für Rand
    oben und unten braucht es also mindestens 5,6 – näher heran, und das
    Gerät wird oben und unten abgeschnitten.

    Auf breiten Schirmen rückt es zusätzlich nach links aus der Mitte: Dort
    steht rechts der Text, und ein Gerät genau hinter der Schrift wäre beides
    zugleich schlechter. Der Versatz wächst weich mit dem Seitenverhältnis,
    damit es auf schmalen Schirmen mittig bleibt.
  */
  float shift = 0.52 * smoothstep(1.25, 2.0, aspect);
  vec3 ro = vec3(0.0, 0.0, 5.25);
  vec3 rd = normalize(vec3(frag.x + shift, frag.y, -1.75));

  /*
    Schwenk statt Volldrehung. Eine durchlaufende Drehung zeigt zwangsläufig
    auch die beiden unvorteilhaften Momente – frontal und exakt von hinten,
    wo der Körper zur Fläche wird. Ein Pendel von gut vierzig Grad hält
    dagegen immer die Dreiviertelansicht, in der Rahmen, Glas und Kamera
    gleichzeitig zu sehen sind. Der Zeiger überlagert das.
  */
  // Der feste Versatz hält den Körper aus der reinen Frontalen heraus: Von
  // etwa -14 bis +49 Grad ist immer eine Schmalseite zu sehen, und damit die
  // Fase, an der das Titan sein Licht bekommt.
  float spin = 0.30 + sin(t * 0.24) * 0.56 + u_pointer.x * 0.55;
  float tilt = -0.06 + sin(t * 0.17) * 0.07 + u_pointer.y * 0.26;
  mat3 rot = rotX(tilt) * rotY(spin);
  mat3 inv = mat3(
    rot[0][0], rot[1][0], rot[2][0],
    rot[0][1], rot[1][1], rot[2][1],
    rot[0][2], rot[1][2], rot[2][2]
  );
  vec3 rov = inv * ro;
  vec3 rdv = inv * rd;

  /*
    Raymarch. Vierundsechzig Schritte reichen für einen konvexen Körper
    bequem; die Trefferschwelle wächst mit der Entfernung, damit weit
    entfernte Strahlen nicht in kleinsten Schritten heranrobben.
  */
  float dist = 0.0;
  float mat = 0.0;
  bool hit = false;
  /*
    edge merkt sich, wie dicht der Strahl am Körper vorbeigeschrammt ist.
    Daraus entsteht weiter unten die Deckung für die Silhouette – eine
    Kantenglättung, die keinen einzigen zusätzlichen Strahl kostet. Ohne sie
    ist das Profil bei gedeckelter Auflösung sichtbar gestuft.
  */
  float edge = 1.0;
  for(int i = 0; i < 64; i++){
    vec3 p = rov + rdv * dist;
    vec2 h = map(p);
    edge = min(edge, h.x / max(dist, 0.001));
    if(h.x < 0.0008 * dist){ mat = h.y; hit = true; break; }
    dist += h.x;
    if(dist > 7.0) break;
  }

  vec3 col;

  /*
    Bühnengrund – wird sowohl für den Fehlschlag als auch für die
    Kantenglättung gebraucht, deshalb vorab.

    Der Schlagschatten ist bewusst gemalt und nicht geworfen: Ein zweiter
    Marsch auf eine Bodenebene würde die Bildkosten fast verdoppeln, und für
    einen Körper, der über der Mitte pendelt, ist eine gestauchte Ellipse
    unter ihm von einem gerechneten Schatten nicht zu unterscheiden.
  */
  vec2 sp0 = frag + vec2(shift, 0.0);
  vec3 stage;
  {
    float pool = smoothstep(0.95, 0.0, length(sp0 * vec2(0.78, 1.20)));
    stage = mix(vec3(0.014, 0.016, 0.020), vec3(0.052, 0.056, 0.066), pool);
    stage += vec3(0.50, 0.54, 0.62) * 0.085
           * smoothstep(0.52, 0.0, length(sp0 * vec2(1.15, 0.72)));
    stage += u_accent * 0.14
           * smoothstep(0.70, 0.0, length((sp0 - vec2(0.0, -0.12)) * vec2(1.35, 0.95)));

    // Kontaktschatten: dicht und dunkel unter dem Gerät, schnell auslaufend.
    float sx = sp0.x * 1.15;
    float sy = (sp0.y + 0.90) * 3.6;
    stage *= 1.0 - 0.82 * smoothstep(1.0, 0.0, length(vec2(sx, sy)));
    // Zweiter, weiter Schatten für den weichen Übergang zum Grund.
    stage *= 1.0 - 0.30 * smoothstep(1.0, 0.0, length(vec2(sp0.x * 0.75, (sp0.y + 0.85) * 1.5)));
  }

  if(!hit){
    /*
      Bühne statt Hintergrund. Sie ist in beiden Themes dunkel – dieselbe
      Entscheidung wie beim Kennzahlen-Abschnitt weiter unten, und sie ist
      hier nicht Geschmack, sondern Physik: Ein heller Grund hinter einem
      dunklen Glaskörper frisst genau die Kanten auf, die den Körper
      plastisch machen.
    */
    col = stage;
  } else {
    vec3 p = rov + rdv * dist;
    vec3 n = calcNormal(p);
    vec3 v = -rdv;
    float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 5.0);

    vec3 key = normalize(vec3(-0.55, 0.80, 0.62));
    float sh = softShadow(p + n * 0.012, key);
    float diff = clamp(dot(n, key), 0.0, 1.0);
    vec3 refl = reflect(rdv, n);

    bool front = n.z > 0.72 && mat < 1.5;
    bool back  = n.z < -0.72 && mat < 1.5;

    if(front){
      /*
        Frontglas. Der Aufbau folgt dem echten Gerät: eine durchgehende
        Glasscheibe über dem Körper, darunter das Panel, das ringsum einen
        schmalen schwarzen Rand frei lässt. Genau dieser Rand fehlte vorher –
        ohne ihn wirkt die Fläche wie bedrucktes Plastik statt wie Glas über
        einem Display.
      */
      // Achtung: half ist in GLSL ein reserviertes Wort - der Name kostete
      // beim Bauen einen stillen Kompilierfehler und damit das ganze Gerät.
      const float BEZEL = 0.052;
      vec2 panelHalf = vec2(BODY.x - BEZEL, BODY.y - BEZEL);
      vec2 uv = (p.xy + panelHalf) / (2.0 * panelHalf);

      // Abgerundetes Panel, an den Radius des Gehäuses angelehnt.
      vec2 d2 = abs(p.xy) - (panelHalf - vec2(0.055));
      float panel = length(max(d2, 0.0)) + min(max(d2.x, d2.y), 0.0) - 0.055;
      float inPanel = smoothstep(0.006, -0.004, panel);

      vec3 screen = vec3(0.0);
      if(inPanel > 0.001) screen = screenContent(clamp(uv, 0.0, 1.0), t) * inPanel;

      // Glas: sehr dunkel, die Umgebung übernimmt zu den Rändern hin.
      vec3 glass = mix(vec3(0.012, 0.013, 0.017), env(refl), fres * 0.80 + 0.035);
      col = glass + screen;

      // Zwei Spiegelungen: ein harter Kern und ein weicher Hof darum.
      float sb = clamp(dot(refl, normalize(vec3(-0.42, 0.88, 0.32))), 0.0, 1.0);
      col += vec3(1.0) * pow(sb, 320.0) * 1.5;
      col += vec3(0.85, 0.90, 1.0) * pow(sb, 28.0) * 0.10;

      // Lichtkante, wo das Glas auf den Rahmen trifft.
      col += vec3(1.0) * smoothstep(0.030, 0.0, abs(panel) - 0.026) * 0.045;
    } else if(mat > 2.5){
      /* Linsenglas: tief, mit blauem Vergütungsschimmer. */
      col = mix(vec3(0.010, 0.012, 0.020), vec3(0.10, 0.16, 0.30), fres);
      col += vec3(0.55, 0.70, 1.0) * pow(fres, 2.0) * 0.55;
      col += vec3(1.0) * pow(clamp(dot(refl, key), 0.0, 1.0), 90.0) * 0.9;
    } else if(back || mat > 1.5){
      /* Rückglas bzw. Kameramodul: mattes Glas über dunklem Grund. */
      vec3 base = u_dark > 0.5 ? vec3(0.055, 0.058, 0.068) : vec3(0.140, 0.147, 0.163);
      col = base * (0.35 + 0.65 * diff * sh);
      col = mix(col, env(refl) * 0.55, fres * 0.5 + 0.06);
      col += vec3(1.0) * pow(clamp(dot(refl, key), 0.0, 1.0), 46.0) * 0.30 * sh;
    } else {
      /*
        Titanrahmen.

        Metall entsteht im Auge durch **schmale, harte** Lichtstreifen, nicht
        durch gleichmäßige Helligkeit. Deshalb hier ein dunkler Grundton und
        darüber drei eng gezogene Glanzlichter aus unterschiedlichen
        Richtungen – so bekommt die Kante beim Schwenken das Wandern, das
        gebürstetes Titan ausmacht.
      */
      vec3 tint = u_dark > 0.5 ? vec3(0.44, 0.45, 0.48) : vec3(0.54, 0.55, 0.585);
      vec3 e = env(refl);
      col = e * tint * (0.42 + 0.58 * sh);

      float g1 = clamp(dot(refl, key), 0.0, 1.0);
      float g2 = clamp(dot(refl, normalize(vec3(0.72, 0.42, 0.55))), 0.0, 1.0);
      float g3 = clamp(dot(refl, normalize(vec3(0.30, -0.25, -0.92))), 0.0, 1.0);
      col += vec3(1.0, 0.99, 0.97) * pow(g1, 260.0) * 2.4 * sh;
      col += vec3(0.93, 0.96, 1.0) * pow(g2, 180.0) * 1.4;
      col += u_accent                * pow(g3, 120.0) * 1.1;

      // Polierte Fase an der Silhouette – der helle Grat, der das Profil zeichnet.
      col += vec3(1.0) * pow(fres, 2.4) * 0.85;
    }

    // Umgebungsverdeckung aus der Marschtiefe – hält die Kanten sauber.
    col *= mix(1.0, 0.86, clamp((dist - 2.4) * 0.6, 0.0, 1.0));
  }

  /*
    Silhouette weichzeichnen. edge ist der kleinste Abstand, den ein Strahl
    zum Körper hatte, auf die Entfernung normiert. Streifende Strahlen
    bekommen dadurch eine Teildeckung – aus einer Treppe wird eine Kante.
  */
  if(!hit){
    float cover = 1.0 - smoothstep(0.0, 0.0016, edge);
    if(cover > 0.001){
      // Der Rand nimmt den Ton des Rahmens an, nicht den des Hintergrunds.
      vec3 rim = mix(stage, vec3(0.38, 0.40, 0.44), 0.75);
      col = mix(col, rim, cover * 0.85);
    }
  }

  /* Filmischer Abschluss: Tonwertkurve, Korn, Vignette. */
  col = col / (col + vec3(0.72));            // Reinhard, weich
  col = pow(col, vec3(0.4545));              // Gamma

  float grain = fract(sin(dot(gl_FragCoord.xy + t, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * (u_dark > 0.5 ? 0.022 : 0.014);

  float vig = smoothstep(1.45, 0.30, length(frag));
  col *= mix(0.90, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Übersetzt einen Shader – und sagt es laut, wenn es schiefgeht.
 *
 * Ein Tippfehler im GLSL scheitert sonst völlig lautlos: Die Übersetzung
 * schlägt fehl, die Komponente fällt auf den CSS-Verlauf zurück, und weil der
 * gut aussieht, fällt tagelang niemandem auf, dass das Gerät fehlt. Genau das
 * ist beim Bauen passiert – ein als Variablenname verwendetes reserviertes
 * Wort. Der Übersetzungsbericht steht jetzt in der Konsole.
 */
function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(
      `[DeviceStage] Shader nicht übersetzbar:\n${gl.getShaderInfoLog(sh) ?? "(kein Bericht)"}`,
    );
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/** `--accent` aus den CSS-Tokens lesen, damit das Displaylicht die Marke trägt. */
function accentRgb(): [number, number, number] {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();
  const m = raw.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return [0.14, 0.34, 0.90];
  const n = parseInt(m[1], 16);
  // Linearisieren, damit die Farbe im Shader nicht ausbleicht.
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return [srgb[0], srgb[1], srgb[2]];
}

export function DeviceStage({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      (canvas.getContext("webgl", { antialias: false, alpha: false, depth: false }) as
        | WebGLRenderingContext
        | null) ??
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) {
      canvas.parentElement?.setAttribute("data-stage", "unsupported");
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      canvas.parentElement?.setAttribute("data-stage", "unsupported");
      return;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.parentElement?.setAttribute("data-stage", "unsupported");
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uPointer = gl.getUniformLocation(prog, "u_pointer");
    const uDark = gl.getUniformLocation(prog, "u_dark");
    const uReduced = gl.getUniformLocation(prog, "u_reduced");
    const uAccent = gl.getUniformLocation(prog, "u_accent");

    const nav = navigator as Navigator & { deviceMemory?: number };
    const weakDevice =
      (navigator.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches || weakDevice;

    gl.uniform1f(uReduced, reduced ? 1 : 0);
    gl.uniform1f(uDark, currentTheme() === "dark" ? 1 : 0);
    gl.uniform3fv(uAccent, accentRgb());

    /*
      Raymarching kostet pro Bildpunkt bis zu achtzig Auswertungen der
      Distanzfunktion. Deshalb rechnet diese Bühne bewusst unterhalb der
      Gerätedichte: ein Körper mit weichen Kanten verträgt das, ein Text
      nicht. Auf schwachen Geräten fällt die Auflösung weiter.
    */
    const maxDpr = reduced ? 0.75 : 1.15;

    const resize = () => {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.tx = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      pointer.ty = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const onTheme = () => {
      gl.uniform1f(uDark, currentTheme() === "dark" ? 1 : 0);
      gl.uniform3fv(uAccent, accentRgb());
      if (reduced) render(performance.now());
    };
    window.addEventListener("op-themechange", onTheme);

    let raf = 0;
    let visible = false;
    let running = document.visibilityState === "visible";
    const start = performance.now();
    const MIN_FRAME_MS = 1000 / 36;
    let lastDraw = 0;

    const render = (now: number) => {
      const t = (now - start) / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.045;
      pointer.y += (pointer.ty - pointer.y) * 0.045;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = () => {
      cancelAnimationFrame(raf);
      const tick = (now: number) => {
        if (!visible || !running || reduced) return;
        if (now - lastDraw >= MIN_FRAME_MS) {
          lastDraw = now;
          render(now);
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) {
          cancelAnimationFrame(raf);
          return;
        }
        if (reduced) render(performance.now());
        else if (running) loop();
      },
      { threshold: 0.01 },
    );
    io.observe(canvas);

    const onVisibility = () => {
      running = document.visibilityState === "visible";
      if (running && visible && !reduced) loop();
      else cancelAnimationFrame(raf);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("op-themechange", onTheme);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    // Bewusst ohne eigene Positionierung: `relative` hier und `absolute` von
    // außen sind beides Position-Utilities aus derselben Tailwind-Ebene – wer
    // gewinnt, entscheidet dann die Reihenfolge im Stylesheet, nicht die im
    // Klassenstring. Die Platzierung gehört der aufrufenden Seite.
    <div className={`device-stage overflow-hidden ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
