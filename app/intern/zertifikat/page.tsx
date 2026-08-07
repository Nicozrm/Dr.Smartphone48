import type { Metadata } from "next";
import { CertificateIssuer } from "@/components/cert/CertificateIssuer";
import { pageMeta } from "@/lib/seo";

/*
  Internes Werkzeug wie /intern/rechnung: nicht verlinkt, nicht in der
  Sitemap, `Disallow: /intern/` in robots.ts.

  Kein Server, keine Anmeldung – und anders als beim Dashboard ist das hier
  kein Verzicht, sondern der Kern der Sache: Der private Signaturschlüssel
  darf nirgendwo anders liegen als auf dem Rechner, der unterschreibt. Ein
  Schlüssel auf einem Server ist ein Schlüssel, den der Hoster hat.
*/

export const metadata: Metadata = {
  ...pageMeta({
    path: "/intern/zertifikat",
    title: "Reparaturzertifikat ausstellen",
    description: "Internes Werkzeug zum Unterschreiben von Prüfprotokollen.",
    noindex: true,
  }),
  robots: { index: false, follow: false, nocache: true },
};

export default function ZertifikatPage() {
  return (
    <div className="pt-28">
      <CertificateIssuer />
    </div>
  );
}
