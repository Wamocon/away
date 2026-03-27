# Away – Urlaubsplaner Setup & Konfiguration

Diese Anleitung beschreibt alle notwendigen Schritte, um die erweiterten Funktionen der Away-Urlaubsplaner-App in Produktion zu nehmen.

## 1. Datenbank-Migration (Rollen, Kalender, Templates)

Falls nicht bereits geschehen, musst du die neuen Tabellen und das erweiterte Rollenkonzept in Supabase ausrollen.
- Gehe in Supabase zu **SQL Editor**.
- Erstelle eine neue Query und kopiere den Inhalt der Datei `supabase/migrations/20240327000001_final_schema_update.sql`.
- Klicke auf **Run**.
- **WICHTIG:** Dies aktualisiert das Rollenkonzept auf (`admin`, `approver`, `employee`) und erstellt die Tabelle `calendar_events`.

## 2. E-Mail Benachrichtigungen (Edge Functions)

Für den E-Mail-Versand (z. B. "Neuer Urlaubsantrag") verwendet Away eine Supabase Edge Function namens `send-vacation-mail`.

### Bereitstellung der Edge Function

1. **Supabase CLI installieren:**
   ```bash
   npm install -g supabase
   ```
2. **Login bei Supabase:**
   ```bash
   supabase login
   ```
3. **Projekt verknüpfen:**
   ```bash
   supabase link --project-ref deinesupabaseprojektid
   ```
4. **Resend API Key hinterlegen:**
   Wir verwenden Resend für den E-Mail-Versand.
   ```bash
   supabase secrets set RESEND_API_KEY="re_123456789"
   ```
5. **Funktion erstellen und deployen:**
   ```bash
   supabase functions new send-vacation-mail
   # (Kopiere den Code für die Funktion in ./supabase/functions/send-vacation-mail/index.ts)
   supabase functions deploy send-vacation-mail
   ```

### Code für `send-vacation-mail`
Falls die Funktion noch nicht existiert, erstelle `supabase/functions/send-vacation-mail/index.ts` mit diesem Inhalt:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const resendApiKey = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const { to, from, subject, requestId, appUrl, fromDate, toDate, reason } = await req.json()

  const html = `
    <h2>Neuer Urlaubsantrag von ${from}</h2>
    <p>Zeitraum: <strong>${fromDate}</strong> bis <strong>${toDate}</strong></p>
    <p>Grund: ${reason || 'Kein Grund angegeben'}</p>
    <br/>
    <a href="${appUrl}/dashboard/requests/${requestId}" style="padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px;">
      Antrag in Away prüfen
    </a>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`
    },
    body: JSON.stringify({
      from: 'Away Urlaubsplaner <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: html,
    })
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } })
})
```

## 3. Microsoft- & Google-Login (OAuth in Supabase)

Damit du dich in der Login-Maske über Microsoft (Office) und Google anmelden kannst, müssen die Provider in Supabase aktiviert werden.

### Microsoft (Azure AD)
1. Gehe in Supabase zu **Authentication** -> **Providers** -> **Microsoft**.
2. Erstelle eine App Registrierung in **Microsoft Azure Entra ID (Active Directory)**.
3. Trage als Redirect-URI `https://<deine-supabase-id>.supabase.co/auth/v1/callback` ein.
4. Kopiere die `Client ID` und den `Client Secret` von Azure zu Supabase.
5. Aktiviere "Microsoft".

### Google
1. Gehe in Supabase zu **Authentication** -> **Providers** -> **Google**.
2. Erstelle ein Projekt in der **Google Cloud Console**.
3. Richte OAuth-Zustimmungsbildschirm ein und erstelle Anmeldedaten (Webanwendung).
4. Trage die Redirect-URI `https://<deine-supabase-id>.supabase.co/auth/v1/callback` ein.
5. Kopiere `Client ID` und `Client Secret` in Supabase.
6. Aktiviere "Google".

## 4. Kalender-Synchronisation (Outlook/Google)

Die App unterstützt den Import von Terminen. Damit dies reibungslos funktioniert:
1. **Azure/Google App Registration**: Registriere eine App wie in Punkt 3 beschrieben, aber füge die Scopes `Calendars.Read` (Microsoft) bzw. `https://www.googleapis.com/auth/calendar.readonly` (Google) hinzu.
2. **User Setup**: Nutzer können in der App über den "Sync"-Button ihren Kalender verbinden. Die Web-UI speichert die Tokens in `user_settings`.
3. **Background Sync**: Die Logik in `src/lib/calendarSync.ts` bereitet den Abruf vor. Für eine vollautomatische Synchronisation im Hintergrund kannst du eine Edge Function erstellen, die regelmäßig die `importCalendarEvents` Logik ausführt.

## 5. Rollen in der Praxis (Einladungen versenden)

- Login als Administrator.
- Gehe zum **Dashboard** → **Administration**.
- Trage unter "Benutzer einladen" die E-Mail ein und wähle die Rolle (Admin, Genehmiger, Mitarbeiter).
- Der Workflow ruft Supabase `admin.inviteUserByEmail` auf. Der Benutzer erhält einen Magic-Link zur Passworterstellung / Login.

---
Viel Erfolg beim Einsatz der finalen Away-Version!
