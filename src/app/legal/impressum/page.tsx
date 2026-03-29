'use client';

import React from 'react';
import { LegalPageShell, LegalSection } from '@/components/legal/LegalPageShell';

export default function ImpressumPage() {
  return (
    <LegalPageShell title="Impressum" updatedAt="März 2026">
      <LegalSection title="WAMOCON GmbH">
        <div className="space-y-1">
          <p className="font-bold">Mergenthalerallee 79 – 81</p>
          <p>65760 Eschborn</p>
          <p>Deutschland</p>
        </div>
      </LegalSection>

      <LegalSection title="Kontakt">
        <div className="space-y-2">
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
        <p>Dipl.-Ing. Waleri Moretz</p>
      </LegalSection>

      <LegalSection title="Registereintrag">
        <div className="space-y-2">
          <p>Sitz der Gesellschaft: Eschborn</p>
          <p>Handelsregister: Eschborn HRB 123666</p>
          <p>Umsatzsteuer-Identifikationsnummer: DE344930486</p>
        </div>
      </LegalSection>

      <LegalSection title="Angaben zum Angebot">
        <p>
          AWAY ist eine webbasierte Software-as-a-Service-Plattform für professionelles Urlaubsmanagement, Abwesenheitsplanung und Teamkoordination. Das Angebot richtet sich primär an Unternehmen, Organisationen und Teams.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
