import React from 'react';
import { LegalPageShell, LegalSection } from '@/components/legal/LegalPageShell';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Impressum | Away Urlaubsplanung',
  description: 'Impressum der Away Urlaubsplanungs-App.',
};

export default function Impressum() {
  return (
    <LegalPageShell title="Impressum" updatedAt="März 2026">
      <LegalSection title="Angaben gemäß § 5 TMG">
        <p className="font-bold">WAMOCON GmbH</p>
        <p>Mergenthalerallee 79 – 81</p>
        <p>65760 Eschborn</p>
        <p>Deutschland</p>
      </LegalSection>

      <LegalSection title="Vertreten durch">
        <p>Dipl.-Ing. Waleri Moretz, Geschäftsführer</p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>Telefon: +49 6196 5838311</p>
        <p>E-Mail: info@wamocon.com</p>
        <p>Website: www.wamocon.com</p>
      </LegalSection>

      <LegalSection title="Registereintrag">
        <p>Eintragung im Handelsregister.</p>
        <p>Registergericht: Eschborn HRB 123666</p>
        <p>Registernummer: 123666</p>
      </LegalSection>

      <LegalSection title="Umsatzsteuer-ID">
        <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:</p>
        <p>DE344930486</p>
      </LegalSection>

      <LegalSection title="Hinweise zum Angebot">
        <p>Away ist ein Produkt der WAMOCON GmbH und richtet sich an gewerbliche Nutzer zur internen Teamkoordination und Abwesenheitsplanung.</p>
      </LegalSection>
    </LegalPageShell>
  );
}
