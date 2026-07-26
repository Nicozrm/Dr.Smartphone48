"use client";

import { useEffect, useRef } from "react";
import { currentTheme } from "@/lib/theme";

/**
 * ShaderField – ein handgeschriebener WebGL-Hintergrund für den Hero.
 *
 * Kein Effekt um des Effekts willen: domänenverzerrtes fBm-Rauschen erzeugt
 * langsam driftende Tonbänder in der Markenfarbwelt – Graphit auf Off-White,
 * ein Hauch Blau. Der Zeiger setzt ein leises Licht, das der Bewegung folgt.
 *
 * Diszipliniert gebaut: DPR gedeckelt, pausiert offscreen und bei verborgenem
 * Tab, respektiert prefers-reduced-motion (ein einziger Frame), räumt sauber
 * auf und weicht bei fehlendem WebGL lautlos auf einen CSS-Verlauf aus.
 */

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_pointer;   // 0..1, geglättet
uniform float u_dark;      // 0 hell, 1 dunkel
uniform float u_reduced;   // 1 = keine Zeitanimation

// Hash + Value-Noise
float hash(vec2 p){ p = fract(p*vec2(123.34, 345.45)); p += dot(p, p+34.345); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i+vec2(1.0,0.0));
  float c = hash(i+vec2(0.0,1.0));
  float d = hash(i+vec2(1.0,1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = uv; p.x *= aspect;

  float t = u_time * (1.0 - u_reduced);

  // Domänen-Verzerrung: zwei fBm-Felder verschieben das dritte.
  vec2 q = vec2(fbm(p*1.3 + vec2(0.0, t*0.03)),
                fbm(p*1.3 + vec2(4.2, -t*0.024)));
  vec2 r = vec2(fbm(p*1.6 + 1.7*q + vec2(1.7, 9.2)),
                fbm(p*1.6 + 1.7*q + vec2(8.3, 2.8) + t*0.02));
  float f = fbm(p*1.7 + 2.2*r);

  // Zeigerlicht – weich, tonal, nie grell.
  vec2 pc = u_pointer; pc.x *= aspect;
  float d = distance(p, pc);
  float glow = smoothstep(0.85, 0.0, d);

  // Palette je Theme. Sehr geringer Kontrast: es soll flüstern.
  vec3 col;
  if(u_dark > 0.5){
    vec3 base = vec3(0.043, 0.047, 0.055);
    vec3 mid  = vec3(0.094, 0.102, 0.118);
    vec3 blue = vec3(0.145, 0.204, 0.40);
    col = mix(base, mid, smoothstep(0.25, 0.85, f));
    col = mix(col, blue, glow*0.16 + smoothstep(0.7, 1.0, f)*0.05);
  } else {
    vec3 base = vec3(0.968, 0.968, 0.960);
    vec3 mid  = vec3(0.918, 0.925, 0.933);
    vec3 blue = vec3(0.847, 0.882, 0.988);
    col = mix(base, mid, smoothstep(0.25, 0.85, f));
    col = mix(col, blue, glow*0.22 + smoothstep(0.72, 1.0, f)*0.06);
  }

  // Feines Korn gegen Banding.
  float grain = (hash(gl_FragCoord.xy + t) - 0.5) * (u_dark > 0.5 ? 0.02 : 0.012);
  col += grain;

  // Vignette – lenkt den Blick zur Mitte.
  float vig = smoothstep(1.25, 0.35, distance(uv, vec2(0.5)));
  col *= mix(0.965, 1.0, vig);

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

export function ShaderField({ className = "" }: { className?: string }) {
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
      // Fallback: schlichter CSS-Verlauf, gesetzt am Elternknoten.
      canvas.parentElement?.setAttribute("data-shader", "unsupported");
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      canvas.parentElement?.setAttribute("data-shader", "unsupported");
      return;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.parentElement?.setAttribute("data-shader", "unsupported");
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uPointer = gl.getUniformLocation(prog, "u_pointer");
    const uDark = gl.getUniformLocation(prog, "u_dark");
    const uReduced = gl.getUniformLocation(prog, "u_reduced");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gl.uniform1f(uReduced, reduced ? 1 : 0);
    gl.uniform1f(uDark, currentTheme() === "dark" ? 1 : 0);

    const pointer = { x: 0.5, y: 0.62, tx: 0.5, ty: 0.62 };
    let dpr = Math.min(window.devicePixelRatio || 1, 1.6);

    const resize = () => {
      const w = canvas.clientWidth || canvas.offsetWidth || 1;
      const h = canvas.clientHeight || canvas.offsetHeight || 1;
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.tx = (e.clientX - rect.left) / Math.max(rect.width, 1);
      pointer.ty = 1 - (e.clientY - rect.top) / Math.max(rect.height, 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const onTheme = () => gl.uniform1f(uDark, currentTheme() === "dark" ? 1 : 0);
    window.addEventListener("op-themechange", onTheme);

    let raf = 0;
    let visible = true;
    let running = true;
    const start = performance.now();

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && running && !reduced) loop();
      },
      { threshold: 0.01 },
    );
    io.observe(canvas);

    const onVisibility = () => {
      running = document.visibilityState === "visible";
      if (running && visible && !reduced) loop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const render = (now: number) => {
      const t = (now - start) / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = () => {
      cancelAnimationFrame(raf);
      const tick = (now: number) => {
        if (!visible || !running || reduced) return;
        render(now);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    if (reduced) {
      render(start); // ein statischer Frame
    } else {
      loop();
    }

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
    <div
      className={`shader-field pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
