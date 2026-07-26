import type { SVGProps } from "react";

/**
 * Eigenes Icon-Set: 24er-Grid, 1.5px Stroke, runde Kappen.
 * Bewusst reduziert – jedes Icon gehört zur selben Formsprache.
 */

export type IconName =
  | "arrow-right"
  | "arrow-up-right"
  | "battery"
  | "calendar"
  | "camera"
  | "check"
  | "chevron-down"
  | "clock"
  | "close"
  | "cpu"
  | "leaf"
  | "mail"
  | "menu"
  | "moon"
  | "phone"
  | "pin"
  | "search"
  | "shield"
  | "sparkle"
  | "sun"
  | "tool"
  | "touch"
  | "truck"
  | "waveform";

const paths: Record<IconName, React.ReactNode> = {
  "arrow-right": <path d="M4 12h16m0 0-6-6m6 6-6 6" />,
  "arrow-up-right": <path d="M7 17 17 7m0 0H8m9 0v9" />,
  battery: (
    <>
      <rect x="2.5" y="7.5" width="16" height="9" rx="2.5" />
      <path d="M21.5 10.5v3M6 10.5v3m3.5-3v3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4m8-4v4" />
    </>
  ),
  camera: (
    <>
      <path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h1.3l1.2-1.8A1.5 1.5 0 0 1 9.75 3.5h4.5a1.5 1.5 0 0 1 1.25.7L16.7 6H18a2.5 2.5 0 0 1 2.5 2.5V17a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17V8.5Z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.5l3.5 2" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
      <path d="M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 15C5 8.5 10 4.5 19 4.5c0 9-4 14-10.5 14A3.5 3.5 0 0 1 5 15Z" />
      <path d="M5 20c2.5-5.5 6-9 10-11.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m3.5 7.5 8.5 6 8.5-6" />
    </>
  ),
  menu: <path d="M4 8h16M4 16h16" />,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5m0 14v2.5M2.5 12H5m14 0h2.5M5.1 5.1l1.8 1.8m10.2 10.2 1.8 1.8M18.9 5.1l-1.8 1.8M6.9 17.1l-1.8 1.8" />
    </>
  ),
  touch: (
    <>
      <path d="M9 11V5.5a1.75 1.75 0 0 1 3.5 0V11" />
      <path d="M12.5 11V8.75a1.75 1.75 0 0 1 3.5 0V11m0-.5a1.75 1.75 0 0 1 3.5 0V15a5.5 5.5 0 0 1-5.5 5.5h-1.2a5.5 5.5 0 0 1-4.35-2.14L5 15.5a1.8 1.8 0 0 1 2.9-2.1L9 14.5V11" />
    </>
  ),
  waveform: (
    <path d="M3 12h2.5l2-6 3 15 3-19 2.5 10H21" />
  ),
  phone: (
    <path d="M7.6 3.5H6A2.5 2.5 0 0 0 3.5 6c0 8 6.5 14.5 14.5 14.5a2.5 2.5 0 0 0 2.5-2.5v-1.6a1.5 1.5 0 0 0-1.1-1.45l-3.1-.85a1.5 1.5 0 0 0-1.55.5l-.8.95a11.6 11.6 0 0 1-5.4-5.4l.95-.8a1.5 1.5 0 0 0 .5-1.55l-.85-3.1A1.5 1.5 0 0 0 7.6 3.5Z" />
  ),
  pin: (
    <>
      <path d="M12 21s7-5.5 7-11.5A7 7 0 0 0 5 9.5C5 15.5 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.1 7.9 7.5 9.5 4.4-1.6 7.5-4.9 7.5-9.5V6L12 3Z" />
      <path d="m8.75 11.75 2.25 2.25 4.25-4.5" />
    </>
  ),
  sparkle: (
    <path d="M12 3.5 13.8 9a1 1 0 0 0 .64.64L20 11.5l-5.56 1.86a1 1 0 0 0-.64.64L12 19.5l-1.8-5.5a1 1 0 0 0-.64-.64L4 11.5l5.56-1.86A1 1 0 0 0 10.2 9L12 3.5Z" />
  ),
  tool: (
    <path d="M14.5 6.5a4 4 0 0 1 5.03-3.87l-2.8 2.8 1.84 1.84 2.8-2.8A4 4 0 0 1 16.5 9.6L8.1 18a2 2 0 0 1-2.83 0l-.27-.27a2 2 0 0 1 0-2.83l8.4-8.4c.33-.1.7-.16 1.1-.16Z" />
  ),
  truck: (
    <>
      <path d="M2.5 6.5h11.5V17H2.5zM14 9.5h3.7l3.3 3.5v4H14z" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="17.5" cy="17.5" r="1.8" />
    </>
  ),
};

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
