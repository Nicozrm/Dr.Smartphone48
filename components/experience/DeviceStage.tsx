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
  Displayinhalt – kein Screenshot, ein Lichtfeld.

  Ein nachgebauter Startbildschirm wäre in dieser Auflösung Matsch und würde
  außerdem ein fremdes Betriebssystem zitieren. Stattdessen drei Bänder aus
  der Markenfarbe, die übereinander driften: aus der Entfernung liest sich das
  als eingeschaltetes Gerät, aus der Nähe als Grafik – und beides ist ehrlich.
*/
vec3 screenContent(vec2 uv, float t){
  vec2 q = uv * 2.0 - 1.0;

  // Drei versetzte Bänder mit eigener Geschwindigkeit.
  float b1 = smoothstep(0.62, 0.0, abs(q.x * 0.75 + sin(q.y * 1.7 + t * 0.45) * 0.55));
  float b2 = smoothstep(0.48, 0.0, abs(q.x * 0.90 - sin(q.y * 1.2 - t * 0.31) * 0.70 + 0.35));
  float b3 = smoothstep(0.34, 0.0, abs(q.x * 1.20 + sin(q.y * 2.4 + t * 0.62) * 0.40 - 0.45));

  float fade = smoothstep(1.15, -0.35, abs(q.y));

  vec3 c  = u_accent * b1 * 1.35 * fade;
  c += mix(u_accent, vec3(0.42, 0.62, 1.0), 0.55) * b2 * 0.85 * fade;
  c += mix(u_accent, vec3(0.86, 0.92, 1.0), 0.75) * b3 * 0.55 * fade;

  // Grundschimmer, damit das Glas nie ganz tot wirkt.
  c += u_accent * 0.22 * smoothstep(1.25, -0.2, length(q * vec2(0.70, 0.52)));

  // Heller Saum oben und unten – die Ränder eines randlosen Displays.
  c += vec3(0.88, 0.93, 1.0) * 0.09 * smoothstep(0.80, 1.0, abs(q.y));
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
  float spin = sin(t * 0.24) * 0.72 + u_pointer.x * 0.55;
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
  for(int i = 0; i < 64; i++){
    vec3 p = rov + rdv * dist;
    vec2 h = map(p);
    if(h.x < 0.0008 * dist){ mat = h.y; hit = true; break; }
    dist += h.x;
    if(dist > 7.0) break;
  }

  vec3 col;

  if(!hit){
    /*
      Bühne statt Hintergrund. Sie ist in beiden Themes dunkel – dieselbe
      Entscheidung wie beim Kennzahlen-Abschnitt weiter unten, und sie ist
      hier nicht Geschmack, sondern Physik: Ein heller Grund hinter einem
      dunklen Glaskörper frisst genau die Kanten auf, die den Körper
      plastisch machen.
    */
    vec2 sp = frag + vec2(shift, 0.0);
    /*
      Der Grund bleibt fast schwarz. Jedes Quäntchen Aufhellung hier geht
      direkt vom Kontrast der Titankante ab – und die ist das Einzige, was
      den Körper als Metall ausweist.
    */
    float pool = smoothstep(0.95, 0.0, length(sp * vec2(0.78, 1.20)));
    vec3 bg = mix(vec3(0.014, 0.016, 0.020), vec3(0.052, 0.056, 0.066), pool);

    // Enger Lichtkegel dicht hinter dem Gerät.
    bg += vec3(0.50, 0.54, 0.62) * 0.085 * smoothstep(0.52, 0.0, length(sp * vec2(1.15, 0.72)));
    // Markenfarbe als Abglanz des Displays auf dem Bühnengrund.
    bg += u_accent * 0.14 * smoothstep(0.70, 0.0, length((sp - vec2(0.0, -0.12)) * vec2(1.35, 0.95)));
    col = bg;
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
      /* Frontglas: fast schwarz, aber nie tot – Fresnel plus Displaylicht. */
      vec2 uv = vec2(
        (p.x + BODY.x - 0.045) / (2.0 * (BODY.x - 0.045)),
        (p.y + BODY.y - 0.055) / (2.0 * (BODY.y - 0.055))
      );
      vec3 screen = vec3(0.0);
      if(uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0){
        screen = screenContent(uv, t);
        // Abgerundete Displayecken
        vec2 c2 = abs(uv * 2.0 - 1.0);
        float corner = length(max(c2 - vec2(0.80, 0.90), 0.0));
        screen *= smoothstep(0.22, 0.10, corner);
      }
      vec3 glass = mix(vec3(0.020, 0.022, 0.028), env(refl), fres * 0.85 + 0.05);
      col = glass + screen;
      // Harter Glanzstreifen der Softbox auf dem Glas
      col += vec3(1.0) * pow(clamp(dot(refl, normalize(vec3(-0.4, 0.9, 0.35))), 0.0, 1.0), 220.0) * 0.8;
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
      /* Titanrahmen: gebürstetes Metall, Umgebung dominiert. */
      vec3 tint = u_dark > 0.5 ? vec3(0.62, 0.63, 0.66) : vec3(0.74, 0.75, 0.78);
      vec3 e = env(refl);
      col = e * tint * (0.55 + 0.45 * sh);
      // Feiner Grat an der Kante, wie eine polierte Fase
      col += vec3(1.0) * pow(fres, 3.0) * 0.55;
      col += vec3(1.0) * pow(clamp(dot(refl, key), 0.0, 1.0), 140.0) * 1.1 * sh;
    }

    // Umgebungsverdeckung aus der Marschtiefe – hält die Kanten sauber.
    col *= mix(1.0, 0.86, clamp((dist - 2.4) * 0.6, 0.0, 1.0));
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

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
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
