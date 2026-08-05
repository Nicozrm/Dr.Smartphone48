"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";

const DiagramShowcase = dynamic(
  () => import("@/components/sections/DiagramShowcase").then((mod) => mod.DiagramShowcase),
  { ssr: false },
);
const DeviceStage = dynamic(() => import("./DeviceStage").then((mod) => mod.DeviceStage), {
  ssr: false,
});
const DeviceExploded = dynamic(
  () => import("./DeviceExploded").then((mod) => mod.DeviceExploded),
  { ssr: false },
);
const XRay = dynamic(() => import("./XRay").then((mod) => mod.XRay), { ssr: false });

function WhenVisible({
  children,
  className,
  fallback,
}: {
  children: ReactNode;
  className?: string;
  fallback?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "700px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className={className}>
      {visible ? children : fallback}
    </div>
  );
}

export function LazyDiagramShowcase() {
  return (
    <WhenVisible fallback={<div className="min-h-[24rem] rounded-[var(--radius-l)] border border-line bg-raised" />}>
      <DiagramShowcase />
    </WhenVisible>
  );
}

export function LazyDeviceStage({ className = "" }: { className?: string }) {
  return (
    <WhenVisible className={className}>
      <DeviceStage className="h-full w-full" />
    </WhenVisible>
  );
}

export function LazyDeviceExploded() {
  return (
    <WhenVisible
      fallback={<div className="min-h-[32rem] rounded-[var(--radius-xl)] border border-line bg-raised" />}
    >
      <DeviceExploded />
    </WhenVisible>
  );
}

export function LazyXRay() {
  return (
    <WhenVisible fallback={<div className="min-h-[30rem] rounded-[var(--radius-xl)] border border-line bg-page" />}>
      <XRay />
    </WhenVisible>
  );
}
