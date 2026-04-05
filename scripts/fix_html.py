"""Replaces the main section of docs/manual/index.html with clean v2.0 content."""
import re, pathlib

html_path = pathlib.Path(__file__).parent.parent / "docs" / "manual" / "index.html"
content = html_path.read_text(encoding="utf-8")

# Find <main> opening and the closing </div> that wraps layout
main_start = content.find("  <main>")
# The layout closes with </div>\n\n</body>
layout_close = content.rfind("</div>\n\n</body>")

assert main_start != -1, "<main> not found"
assert layout_close != -1, "layout closing not found"

new_main = """\
  <main>
    <div class="cover">
      <div class="doc-type">Produkthandbuch &middot; WAMOCON</div>
      <h1>Away</h1>
      <div class="cover-sub">Professionelle Urlaubsplanung f&uuml;r Teams &ndash; Lite &amp; Pro</div>
      <div class="cover-meta">
        <div><div class="meta-label">Version</div><div class="meta-value">2.0.0</div></div>
        <div><div class="meta-label">Status</div><div class="meta-value"><span class="badge badge-success">Produktiv</span></div></div>
        <div><div class="meta-label">Pl&auml;ne</div><div class="meta-value">Lite &middot; Pro</div></div>
        <div><div class="meta-label">Trial</div><div class="meta-value">30 Tage kostenlos</div></div>
      </div>
    </div>

    <section id="uebersicht">
      <h2><span class="num">01</span> &Uuml;bersicht</h2>
      <p>Away ist eine webbasierte SaaS-L&ouml;sung f&uuml;r die digitale Urlaubsplanung in Teams und Organisationen. Sie automatisiert den gesamten Workflow von der Antragstellung &uuml;ber die Genehmigung bis zur Dokumentation.</p>
      <div class="card">
        <strong>Was Away l&ouml;st:</strong> Papierbasierte oder Excel-gest&uuml;tzte Prozesse abschaffen, Echtzeit-Kalender f&uuml;r Teams, DSGVO-konforme Dokumentation, Zugriff von jedem Endger&auml;t.
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Rolle</th><th>Beschreibung</th></tr></thead>
          <tbody>
            <tr><td>Mitarbeiter</td><td>Antr&auml;ge stellen, Antragshistorie, Kalender einsehen</td></tr>
            <tr><td>Genehmiger</td><td>Antr&auml;ge anderer genehmigen oder ablehnen</td></tr>
            <tr><td>Administrator</td><td>Organisation verwalten, Nutzer einladen, Rollen zuweisen</td></tr>
            <tr><td>Super-Admin</td><td>Plattform-&uuml;bergreifende Subscription-Verwaltung (WAMOCON intern)</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="business-model">
      <h2><span class="num">02</span> Business Model: Lite &amp; Pro</h2>
      <p>Away ist in zwei Pl&auml;nen verf&uuml;gbar. Beide k&ouml;nnen <strong>30 Tage kostenlos getestet</strong> werden.</p>

      <h3 id="planuebersicht">2.1 Plan&uuml;bersicht</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Feature</th><th>Lite</th><th>Pro</th></tr></thead>
          <tbody>
            <tr><td>Urlaubsantr&auml;ge stellen &amp; genehmigen</td><td>&#10003;</td><td>&#10003;</td></tr>
            <tr><td>In-App Kalender</td><td>&#10003;</td><td>&#10003;</td></tr>
            <tr><td>Rollen: Mitarbeiter, Genehmiger, Admin</td><td>&#10003;</td><td>&#10003;</td></tr>
            <tr><td>Benutzereinstellungen &amp; Urlaubsquote</td><td>&#10003;</td><td>&#10003;</td></tr>
            <tr><td>DSGVO-Consent &amp; Rechtliches</td><td>&#10003;</td><td>&#10003;</td></tr>
            <tr><td><strong>Max. Benutzer</strong></td><td><strong>50</strong></td><td><strong>Unbegrenzt</strong></td></tr>
            <tr><td><strong>Organisationen</strong></td><td><strong>1 (fest)</strong></td><td><strong>Unbegrenzt</strong></td></tr>
            <tr><td>Externer Kalender-Sync (Outlook / Google)</td><td>&#10007;</td><td>&#10003;</td></tr>
            <tr><td>E-Mail-Integration &amp; Versand</td><td>&#10007;</td><td>&#10003;</td></tr>
            <tr><td>Dokumentvorlagen (PDF / DOCX)</td><td>&#10007;</td><td>&#10003;</td></tr>
            <tr><td>Reports &amp; Analytics</td><td>&#10007;</td><td>&#10003;</td></tr>
            <tr><td>Multi-Organisations-Verwaltung</td><td>&#10007;</td><td>&#10003;</td></tr>
            <tr><td>DSGVO-Admin-Panel</td><td>&#10007;</td><td>&#10003;</td></tr>
            <tr><td>Kalender-Einladungen (Outlook)</td><td>&#10007;</td><td>&#10003;</td></tr>
          </tbody>
        </table>
      </div>

      <h3 id="trial-system">2.2 Trial-System</h3>
      <p>Jede Registrierung startet automatisch einen 30-Tage-Trial f&uuml;r den gew&auml;hlten Plan.</p>
      <div class="info-box">
        <div class="info-box-title">Lebenszyklus</div>
        <p>Registrierung &rarr; Trial (30 Tage) &rarr; Ablauf &rarr; Grace Period (30 Tage) &rarr; Datenlöschung<br>
        Bei Bestellung w&auml;hrend Trial oder Grace Period: &rarr; Aktiv (unbegrenzt)</p>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Status</th><th>Bedeutung</th><th>Zugang</th></tr></thead>
          <tbody>
            <tr><td><code>trial</code></td><td>Testzeitraum l&auml;uft</td><td>&#10003; Voll</td></tr>
            <tr><td><code>active</code></td><td>Bezahltes Abo aktiv</td><td>&#10003; Voll</td></tr>
            <tr><td><code>pending_order</code></td><td>Upgrade beantragt, Trial l&auml;uft noch</td><td>&#10003; Bis Trial-Ende</td></tr>
            <tr><td><code>grace</code></td><td>Nachfrist l&auml;uft (30 Tage)</td><td>&#10007; Gesperrt</td></tr>
            <tr><td><code>expired</code></td><td>Abgelaufen</td><td>&#10007; Gesperrt</td></tr>
          </tbody>
        </table>
      </div>

      <h3 id="upgrade">2.3 Upgrade-Prozess</h3>
      <ol>
        <li>Klick auf <strong>&bdquo;Auf Pro upgraden&ldquo;</strong> in <code>/settings/subscription</code></li>
        <li>Status wird auf <code>pending_order</code> gesetzt</li>
        <li>Mit E-Mail-Provider: automatische Benachrichtigung an WAMOCON</li>
        <li>Ohne Provider: System-Mail-Client &ouml;ffnet sich mit vorausgef&uuml;llter E-Mail</li>
        <li>Super-Admin schaltet Plan manuell im <code>/admin/subscriptions</code>-Panel frei</li>
      </ol>
    </section>

    <section id="tutorials">
      <h2><span class="num">03</span> Tutorials &ndash; Erste Schritte</h2>

      <h3 id="tut-antrag">3.1 Mitarbeiter: Ersten Antrag stellen</h3>
      <ol>
        <li>Einladungslink in der E-Mail anklicken</li>
        <li>Passwort vergeben (min. 8 Zeichen)</li>
        <li>AGB, Datenschutzerkl&auml;rung und DSGVO akzeptieren</li>
        <li>Dashboard &ouml;ffnet sich &rarr; <strong>&bdquo;Neuer Antrag&ldquo;</strong> klicken</li>
        <li>Start- und Enddatum w&auml;hlen</li>
        <li>Grund optional eintragen</li>
        <li><strong>&bdquo;Absenden&ldquo;</strong> &ndash; Genehmiger wird informiert</li>
        <li>Status unter <strong>Meine Antr&auml;ge</strong> verfolgen</li>
      </ol>

      <h3 id="tut-register">3.2 Administrator: Neue Organisation registrieren</h3>
      <ol>
        <li><code>/auth/register</code> &ouml;ffnen</li>
        <li>Plan w&auml;hlen: Lite oder Pro</li>
        <li>Organisations-Name, E-Mail und Passwort eingeben</li>
        <li>Alle rechtlichen Bedingungen akzeptieren</li>
        <li><strong>&bdquo;30 Tage kostenlos starten&ldquo;</strong> klicken</li>
      </ol>

      <h3 id="tut-invite">3.3 Admin: Ersten Genehmiger einladen</h3>
      <ol>
        <li>Zu <code>/admin/settings</code> navigieren</li>
        <li><strong>&bdquo;Benutzer einladen&ldquo;</strong> klicken</li>
        <li>E-Mail eingeben, Rolle <em>Genehmiger</em> w&auml;hlen</li>
        <li><strong>&bdquo;Einladung senden&ldquo;</strong></li>
      </ol>
    </section>

    <section id="howto">
      <h2><span class="num">04</span> How-to Guides</h2>

      <h3 id="ht-email">4.1 Urlaubsantrag per E-Mail einreichen (ohne Provider)</h3>
      <ol>
        <li>Antrag im Wizard stellen</li>
        <li><strong>&bdquo;Per E-Mail einreichen&ldquo;</strong> klicken</li>
        <li>System-Mail-Client &ouml;ffnet sich: Empf&auml;nger = Genehmiger, Betreff + Text vorausgef&uuml;llt</li>
        <li>E-Mail pr&uuml;fen und senden</li>
      </ol>

      <h3 id="ht-approve">4.2 Genehmiger: Antrag genehmigen oder ablehnen</h3>
      <ol>
        <li><strong>&bdquo;Genehmigungen&ldquo;</strong> in der Navigation klicken</li>
        <li>Antrag anklicken &rarr; Detailansicht</li>
        <li><strong>&bdquo;Genehmigen&ldquo;</strong> oder <strong>&bdquo;Ablehnen&ldquo;</strong> klicken</li>
        <li>Optional: Kommentar hinterlassen</li>
      </ol>

      <h3 id="ht-upgrade">4.3 Administrator: Probeabo upgraden</h3>
      <ol>
        <li><code>/settings/subscription</code> &ouml;ffnen</li>
        <li><strong>&bdquo;Auf Pro upgraden&ldquo;</strong> klicken</li>
        <li>Mit E-Mail-Provider: automatisch versandt; ohne Provider: Mail-Client &ouml;ffnet sich</li>
        <li>WAMOCON schaltet Plan frei</li>
      </ol>

      <h3 id="ht-calsync">4.4 Pro: Kalender-Sync konfigurieren</h3>
      <ol>
        <li><code>/settings</code> &rarr; Tab <em>OAuth / Kalender</em> &ouml;ffnen</li>
        <li>Anbieter w&auml;hlen (Outlook oder Google)</li>
        <li>E-Mail und Token eingeben &rarr; <strong>Speichern</strong></li>
        <li>Externe Termine erscheinen im Kalender</li>
      </ol>

      <h3 id="ht-superadmin">4.5 Super-Admin: Plan manuell freischalten</h3>
      <ol>
        <li><code>/admin/subscriptions</code> &ouml;ffnen</li>
        <li>Organisation in der Liste suchen</li>
        <li><strong>&bdquo;Lite aktiv&ldquo;</strong> oder <strong>&bdquo;Pro aktiv&ldquo;</strong> klicken &rarr; sofortige Freischaltung</li>
        <li><strong>&bdquo;+30d Trial&ldquo;</strong> verl&auml;ngert den Testzeitraum um 30 Tage</li>
        <li><strong>&bdquo;Sperren&ldquo;</strong> setzt Status auf <code>expired</code></li>
      </ol>
    </section>

    <section id="referenz">
      <h2><span class="num">05</span> Funktionsreferenz</h2>

      <h3 id="routen">5.1 Routen-&Uuml;bersicht</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Route</th><th>Beschreibung</th><th>Zugriff</th></tr></thead>
          <tbody>
            <tr><td><code>/auth/login</code></td><td>Anmeldung</td><td>Alle</td></tr>
            <tr><td><code>/auth/register</code></td><td>Trial-Registrierung</td><td>&Ouml;ffentlich</td></tr>
            <tr><td><code>/auth/accept-invite</code></td><td>Einladung annehmen</td><td>Eingeladene</td></tr>
            <tr><td><code>/dashboard</code></td><td>Startseite</td><td>Alle</td></tr>
            <tr><td><code>/dashboard/requests</code></td><td>Meine Antr&auml;ge</td><td>Alle</td></tr>
            <tr><td><code>/dashboard/admin-requests</code></td><td>Genehmigungsuebersicht</td><td>Genehmiger+</td></tr>
            <tr><td><code>/dashboard/calendar</code></td><td>Teamkalender</td><td>Alle</td></tr>
            <tr><td><code>/dashboard/organizations</code></td><td>Organisations-Verwaltung</td><td>Admin [Pro]</td></tr>
            <tr><td><code>/dashboard/reports</code></td><td>Reports &amp; Analytics</td><td>Genehmiger+ [Pro]</td></tr>
            <tr><td><code>/settings/subscription</code></td><td>Abonnement &amp; Plan</td><td>Alle</td></tr>
            <tr><td><code>/admin/settings</code></td><td>Organisations-Admin</td><td>Admin, CIO</td></tr>
            <tr><td><code>/admin/consents</code></td><td>DSGVO-Audit-Panel</td><td>Admin [Pro]</td></tr>
            <tr><td><code>/admin/subscriptions</code></td><td>Subscription-Verwaltung</td><td>Super-Admin only</td></tr>
          </tbody>
        </table>
      </div>

      <h3 id="rollen">5.2 Rollen &amp; Berechtigungen</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Berechtigung</th><th>Employee</th><th>Approver</th><th>Admin</th><th>CIO</th></tr></thead>
          <tbody>
            <tr><td>Eigene Antr&auml;ge stellen</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
            <tr><td>Antr&auml;ge genehmigen</td><td>&#10007;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
            <tr><td>Nutzer einladen</td><td>&#10007;</td><td>&#10007;</td><td>&#10003;</td><td>&#10003;</td></tr>
            <tr><td>Admin-Einstellungen</td><td>&#10007;</td><td>&#10007;</td><td>&#10003;</td><td>&#10003;</td></tr>
            <tr><td>Reports [Pro]</td><td>&#10007;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
            <tr><td>DSGVO-Panel [Pro]</td><td>&#10007;</td><td>&#10007;</td><td>&#10003;</td><td>&#10003;</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="tech">
      <h2><span class="num">06</span> Technische Architektur</h2>
      <p>Away baut auf einem modernen, serverlosen Stack auf, der auf Performance, Skalierbarkeit und Datensicherheit ausgelegt ist.</p>

      <h3>6.1 Stack</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Schicht</th><th>Technologie</th><th>Aufgabe</th></tr></thead>
          <tbody>
            <tr><td>Frontend</td><td>Next.js 15 (App Router)</td><td>SSR/SSG, Routing, Server Actions</td></tr>
            <tr><td>Auth</td><td>Supabase Auth</td><td>E-Mail-Login, Invite-Flow, JWT</td></tr>
            <tr><td>Datenbank</td><td>Supabase PostgreSQL</td><td>Multi-Schema (dev/test/prod), RLS</td></tr>
            <tr><td>Styling</td><td>Tailwind CSS</td><td>Utility-first, Dark Mode</td></tr>
            <tr><td>Hosting</td><td>Vercel</td><td>Edge Functions, Cron Jobs, CDN</td></tr>
            <tr><td>Docs</td><td>GitHub Pages</td><td>Statisches HTML-Handbuch</td></tr>
          </tbody>
        </table>
      </div>

      <h3>6.2 Subscription-Middleware</h3>
      <p>Die Middleware pr&uuml;ft bei jedem Request:</p>
      <ol>
        <li>Ist der Nutzer authentifiziert?</li>
        <li>Hat seine Organisation ein aktives Abo (<code>active</code> oder laufender <code>trial</code>)?</li>
        <li>Hat der Plan Zugriff auf die angefragte Route (Lite vs. Pro-only)?</li>
      </ol>
      <div class="info-box">
        <div class="info-box-title">Fail-Open</div>
        <p>Bei Datenbankfehler w&auml;hrend der Subscription-Pr&uuml;fung wird der Zugang gew&auml;hrt (fail-open), um Ausf&auml;lle nicht auf Nutzer abzuw&auml;lzen.</p>
      </div>

      <h3>6.3 Cron Job: Automatischer Ablauf</h3>
      <p>Vercel f&uuml;hrt t&auml;glich um 02:00 UTC den Endpunkt <code>/api/cron/check-subscriptions</code> aus:</p>
      <ul>
        <li>Abgelaufene Trials (<code>trial_end &lt; now()</code>) werden auf <code>expired</code> gesetzt</li>
        <li>Expired-Orgs erhalten eine Grace Period von 30 Tagen (<code>grace_end</code>)</li>
        <li>Nach Grace-Ablauf: Urlaubsantr&auml;ge, Rollen und Einstellungen werden gel&ouml;scht; Org wird soft-deleted</li>
      </ul>
    </section>

    <section id="compliance">
      <h2><span class="num">07</span> Compliance &amp; DSGVO</h2>

      <h3>7.1 Einwilligungsverwaltung</h3>
      <p>Jeder Nutzer muss beim Eintritt in eine Organisation explizit AGB, Datenschutzerkl&auml;rung und DSGVO-Einwilligung akzeptieren. Die Zustimmungen werden versioniert in der Datenbank gespeichert.</p>

      <h3>7.2 Audit-Trail</h3>
      <p>Administratoren k&ouml;nnen im DSGVO-Panel (<code>/admin/consents</code>, Pro-Feature) einsehen:</p>
      <ul>
        <li>Wer hat wann welche Version akzeptiert?</li>
        <li>Gibt es Accounts ohne vollst&auml;ndige Zustimmung (Legacy)?</li>
        <li>Zeitstempel aller Einwilligungen</li>
      </ul>

      <h3>7.3 Row Level Security (RLS)</h3>
      <p>Alle Tabellen sind durch PostgreSQL-RLS gesch&uuml;tzt. Nutzer k&ouml;nnen ausschlie&szlig;lich Daten ihrer eigenen Organisation lesen und schreiben. Schema-Isolation (dev/test/prod) verhindert Datenlecks zwischen Umgebungen.</p>

      <h3>7.4 Datenlöschung (Recht auf Vergessenwerden)</h3>
      <p>Nach Ablauf der Grace Period werden automatisch gel&ouml;scht:</p>
      <ul>
        <li>Alle Urlaubsantr&auml;ge der Organisation</li>
        <li>Alle Benutzerrollen und -einstellungen</li>
        <li>Die Organisation wird soft-deleted (Name: <code>[DELETED] {id}</code>)</li>
      </ul>
      <div class="info-box">
        <div class="info-box-title">Hinweis</div>
        <p>Auth-User-Accounts bleiben bestehen (Supabase Auth). Nur organisationsbezogene Daten werden entfernt.</p>
      </div>
    </section>

    <section id="glossar">
      <h2><span class="num">08</span> Glossar</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Begriff</th><th>Erkl&auml;rung</th></tr></thead>
          <tbody>
            <tr><td>Trial</td><td>30-t&auml;gige kostenlose Testphase nach Registrierung</td></tr>
            <tr><td>Grace Period</td><td>30-t&auml;gige Nachfrist nach Trial-/Abo-Ablauf; kein Zugang, aber keine sofortige L&ouml;schung</td></tr>
            <tr><td>PlanGate</td><td>React-Komponente, die Inhalte nur bei gen&uuml;gender Plan-Berechtigung anzeigt</td></tr>
            <tr><td>Super-Admin</td><td>WAMOCON-interner Account, der Subscriptions plattformweit verwalten kann</td></tr>
            <tr><td>Subscription</td><td>Datenbankzeile, die Plan, Status und Laufzeit einer Organisation speichert</td></tr>
            <tr><td>pending_order</td><td>Status nach Upgrade-Anfrage; Trial l&auml;uft weiter bis zum Ende</td></tr>
            <tr><td>RLS</td><td>Row Level Security &ndash; PostgreSQL-Mechanismus zur Zeilensicherheit</td></tr>
            <tr><td>Cron Job</td><td>Automatisch ausgef&uuml;hrte Aufgabe (hier: t&auml;glich Subscription-Ablauf pr&uuml;fen)</td></tr>
            <tr><td>Mailto-Fallback</td><td>&Ouml;ffnet nativen Mail-Client, wenn kein OAuth-Provider konfiguriert ist</td></tr>
            <tr><td>Soft-Delete</td><td>Organisation wird nicht gel&ouml;scht, sondern als [DELETED] markiert</td></tr>
            <tr><td>fail-open</td><td>Bei Systemfehler wird Zugang gew&auml;hrt statt gesperrt (keine Betriebsunterbrechung)</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
"""

new_content = content[:main_start] + new_main + "\n</div>\n\n</body>\n</html>\n"
html_path.write_text(new_content, encoding="utf-8")
print(f"Done. Sections: {len(__import__('re').findall(r'<section id=', new_content))}, Length: {len(new_content)}")
