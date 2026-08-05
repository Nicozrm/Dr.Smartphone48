"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const Bootloader = dynamic(() => import("./Bootloader").then((mod) => mod.Bootloader), {
  ssr: false,
});
const CommandPalette = dynamic(
  () => import("./CommandPalette").then((mod) => mod.CommandPalette),
  { ssr: false },
);
const CursorGlass = dynamic(() => import("./CursorGlass").then((mod) => mod.CursorGlass), {
  ssr: false,
});
const MagneticField = dynamic(() => import("./MagneticField").then((mod) => mod.MagneticField), {
  ssr: false,
});
const Ripple = dynamic(() => import("./Ripple").then((mod) => mod.Ripple), {
  ssr: false,
});
const ScrollProgress = dynamic(
  () => import("./ScrollProgress").then((mod) => mod.ScrollProgress),
  { ssr: false },
);
const ServiceWorkerRegister = dynamic(
  () => import("@/components/pwa/ServiceWorkerRegister").then((mod) => mod.ServiceWorkerRegister),
  { ssr: false },
);

function useAfterFirstIdle() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;

    const win = window as Window & {
      requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (win.requestIdleCallback) {
      const id = win.requestIdleCallback(() => setReady(true), { timeout: 1800 });
      return () => win.cancelIdleCallback?.(id);
    }

    const id = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(id);
  }, [ready]);

  return ready;
}

/**
 * Nicht-kritische Browser-Effekte werden aus dem Root-Layout ausgelagert und
 * erst nach der ersten Idle-Phase geladen. Der erste Seitenaufbau muss damit
 * nicht Cursor, Ripple, Palette, Boot-Sequenz und Service-Worker-Code im
 * kritischen Hauptbundle ausführen. Speed Insights bleibt sofort aktiv, damit
 * Messpunkte zuverlässig erfasst werden.
 */
export function ClientEffects() {
  const ready = useAfterFirstIdle();

  return (
    <>
      <SpeedInsights />
      {ready ? (
        <>
          <ScrollProgress />
          <CommandPalette />
          <MagneticField />
          <CursorGlass />
          <Ripple />
          <Bootloader />
          <ServiceWorkerRegister />
        </>
      ) : null}
    </>
  );
}
