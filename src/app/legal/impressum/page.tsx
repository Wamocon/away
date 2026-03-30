import type { Metadata } from "next";
import React from 'react';
import { LegalPageShell, LegalSection } from '@/components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: "Impressum | AWAY",
  description: "Impressum der AWAY App der WAMOCON GmbH.",
};

export default function ImpressumPage() {
  return (
    <LegalPageShell title="Impressum" updatedAt="März 2026">
      <LegalSection title="Anbieter">
        <h3 className="text-xl font-bold">WAMOCON GmbH</h3>
        <div className="mt-4 space-y-1 text-sm leading-relaxed text-[var(--text-muted)]">
          <p>Mergenthalerallee 79 – 81</p>
          <p>65760 Eschborn</p>
          <p>Deutschland</p>
        </div>
      </LegalSection>

      <LegalSection title="Kontakt">
        <div className="mt-4 space-y-2 text-sm leading-relaxed text-[var(--text-muted)]">
          <p>
            Telefon: <a className="font-medium text-[var(--primary)] hover:underline" href="tel:+4961965838311">+49 6196 5838311</a>
          </p>
          <p>
            E-Mail: <a className="font-medium text-[var(--primary)] hover:underline" href="mailto:info@wamocon.com">info@wamocon.com</a>
          </p>
          <p>
            Projektkontakt AWAY App: <a className="font-medium text-[var(--primary)] hover:underline" href="mailto:info@away-app.com">info@away-app.com</a>
          </p>
        </div>
      </LegalSection>

      <LegalSection title="Vertretungsberechtigter Geschäftsführer">
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)]">Dipl.-Ing. Waleri Moretz</p>
      </LegalSection>

      <LegalSection title="Registereintrag">
        <div className="mt-4 space-y-2 text-sm leading-relaxed text-[var(--text-muted)]">
          <p>Sitz der Gesellschaft: Eschborn</p>
          <p>Handelsregister: Eschborn HRB 123666</p>
          <p>Umsatzsteuer-Identifikationsnummer: DE344930486</p>
        </div>
      </LegalSection>

      <LegalSection title="Angaben zum Angebot">
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)]">
          AWAY ist eine webbasierte Software-as-a-Service-Plattform für professionelles Urlaubsmanagement, Abwesenheitsplanung und Teamkoordination. Das Angebot richtet sich primär an Unternehmen, Organisationen und Teams.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
