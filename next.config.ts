import type { NextConfig } from "next";

/**
 * Drei Ziele, eine Konfiguration:
 *
 * - **Cloudflare Workers / Vercel (Standard):** voller Next.js-Server. Nur so
 *   ist das Kontaktformular serverseitig (Route Handler /api/kontakt).
 *   Cloudflare-Build: `npm run cf:build`, Deploy: `npm run cf:deploy`.
 * - **Cloudflare Pages (statisch):** `STATIC_EXPORT=true npm run build`
 *   erzeugt ./out ohne basePath. Dort gibt es keine Serverfunktion – das
 *   Formular erkennt das zur Laufzeit und weicht auf E-Mail aus.
 * - **GitHub Pages:** `GITHUB_PAGES=true` erzeugt denselben Export, zusätzlich
 *   unter dem Unterpfad der Projektseite (Repository-Name).
 */
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const isStaticExport = isGitHubPages || process.env.STATIC_EXPORT === "true";

/*
  Eigentümer und Repository bestimmen die Adresse der Projektseite. Beide
  stehen in der Action als GITHUB_REPOSITORY ("Eigentümer/Repo"); lokal
  gelten die Angaben dahinter.

  Warum nicht fest verdrahtet: Genau das ist der Seite einmal zum Verhängnis
  geworden. Das Repository wurde von „Koko" in „Dr.Smartphone48" umbenannt –
  ein Klick in den Einstellungen, der die Adresse der Projektseite ändert.
  Der Deploy lief weiter durch und meldete Erfolg, aber im Export stand
  überall noch /Koko: Stilvorlagen, Skripte, Schriften, jeder interne Link,
  Canonical und Vorschaubild. Wer die Seite aufrief, bekam nacktes HTML, in
  dem kein Klick funktionierte.

  Der Name kommt deshalb von dort, wo er ohnehin stimmt.
*/
const [repoOwner, repoNameFromEnv] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
/** Repository-Name = Unterpfad der GitHub-Projektseite. */
const repoName = repoNameFromEnv || "Dr.Smartphone48";
/** Im Hostnamen steht der Eigentümer klein, im Pfad das Repo wie benannt. */
const ownerHost = (repoOwner || "Nicozrm").toLowerCase();
const basePath = isGitHubPages ? `/${repoName}` : "";
/** Öffentliche Adresse der Projektseite. */
const gitHubPagesUrl = `https://${ownerHost}.github.io${basePath}`;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  ...(isStaticExport ? { output: "export" as const } : {}),
  basePath,
  // Das Projekt nutzt kein next/image; unoptimized hält den Build auf jeder
  // Plattform gleich – auch auf Workern ohne Bild-Optimizer.
  images: { unoptimized: true },
  env: {
    // Für Referenzen auf public/-Assets (Service Worker, Manifest-Icons),
    // die Next.js nicht automatisch mit dem basePath präfixt.
    NEXT_PUBLIC_BASE_PATH: basePath,
    // Der Client muss wissen, ob es überhaupt einen Server gibt.
    NEXT_PUBLIC_STATIC_EXPORT: isStaticExport ? "true" : "",
    // Auf der Projektseite liegt die Site unter github.io – Canonical,
    // Sitemap, robots.txt und JSON-LD müssen dorthin zeigen, nicht auf die
    // (noch nicht aufgeschaltete) Wunschdomain.
    ...(isGitHubPages ? { NEXT_PUBLIC_SITE_URL: gitHubPagesUrl } : {}),
  },
  // Im Export gibt es keinen Server, der Header setzen könnte – die Option
  // entfällt dort komplett, sonst warnt der Build bei jedem Lauf.
  ...(isStaticExport
    ? {}
    : {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "X-Frame-Options", value: "SAMEORIGIN" },
                {
                  key: "Permissions-Policy",
                  // Kamera/Mikrofon/Sensoren braucht der Geräte-Check auf eigener Origin.
                  value: "geolocation=(), payment=(), usb=()",
                },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
