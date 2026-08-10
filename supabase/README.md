# Supabase – Reparaturvorgänge

Der Backend-Teil dieser Website ist **optional**. Ohne die drei Umgebungs­variablen
läuft alles wie vorher: Der Sofortpreis-Rechner rechnet, das Ticket entsteht aus
der Adresse, das Übergabeprotokoll bleibt im Browser. Die Anmeldung eines
Vorgangs und die Statusverfolgung erscheinen erst, wenn ein Projekt hinterlegt
ist.

## Einrichten

**Das Projekt gehört dieser Anwendung allein.** Die Migrationen beanspruchen
die Namen `ticket_status` und `repair_tickets` im Schema `public`. Liegt dort
schon etwas anderes unter diesen Namen, ist das keine Kleinigkeit, sondern das
Ende der Einrichtung – die Migration bricht dann mit einer Erklärung ab, statt
darüberzuschreiben (siehe „Die Vorprüfung“ unten). Neben der Anwendung darf
beliebig viel anderes im Projekt liegen; nur diese beiden Namen müssen frei
sein.

1. Projekt anlegen (Region EU, wegen der Anschriften im Bestand).
2. Migrationen in der Reihenfolge ihres Dateinamens ausführen – entweder
   `supabase db push` oder im SQL-Editor nacheinander einfügen:

   | Datei | Inhalt |
   | --- | --- |
   | `20260803120000_repair_tickets.sql` | Typen, Tabellen, Indizes |
   | `20260803120100_repair_tickets_rls.sql` | RLS, Schreibpfad, Zeitstempel |
   | `20260803120200_repair_tickets_realtime.sql` | Rundruf und Zuhör-Policies |
   | `20260810120000_repair_tickets_drift.sql` | Abgleich: entfernt fremde Policies, entzieht `anon` das Tabellenrecht |

   **Alle vier, und in dieser Reihenfolge.** Wer nur die erste einspielt,
   bekommt Tabellen ohne Policies, ohne `workshop_staff` und ohne
   `apply_ticket_status` – ein Zustand, in dem das Dashboard nicht läuft und
   in dem sich leicht „mal eben" eine Policy von Hand einfügen lässt. Genau so
   ist der Befund vom 10.8.2026 entstanden.

3. Umgebungsvariablen setzen (siehe `.env.example`):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<projekt>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable / anon key>
   SUPABASE_SERVICE_ROLE_KEY=<secret – niemals NEXT_PUBLIC_>
   ```

   Auf Cloudflare Workers gehört der dritte Wert in ein Secret:
   `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`.

4. Prüfen, dass TypeScript und Datenbank denselben Ablauf kennen:

   ```bash
   npm run verify:status
   ```

## Die Vorprüfung

Am Kopf der ersten Migration steht ein `do`-Block, der abbricht, wenn in der
Zieldatenbank bereits ein fremder `public.ticket_status` oder eine fremde
`public.repair_tickets` liegt. Er nennt dabei, was er vorgefunden hat.

Der Anlass war ein realer Fund: Im einzigen vorhandenen Projekt lag ein
Vorläufer mit den Zuständen `offen`, `in_arbeit`, `fertig` und den Spalten
`customer_name`, `device_brand`, `status_note` – dazu Lese- und
Schreib-Policies für `anon`, also das Gegenteil der Zusage aus
`20260803120100_repair_tickets_rls.sql`.

Alles unterhalb der Vorprüfung arbeitet mit `if not exists`. Beim zweiten Lauf
derselben Migration ist das richtig; auf einem fremden Schema wird daraus eine
Falle. Typ und Tabelle würden übersprungen, und der Rest baute auf ein
Fundament, das ihm nicht gehört. Sauber durchgelaufen wäre das nicht einmal –
es bräche später an `column estimate_reference does not exist` ab, nach zwei
angelegten Erweiterungen und einem angelegten Typ. Ein halb angewandtes Schema
ist schlimmer als ein gar nicht angewandtes: Beim nächsten Versuch sieht es aus
wie ein begonnener eigener Stand.

Die erwartete Zustandsliste steht damit ein drittes Mal im Projekt – in
TypeScript, im `create type` und in der Vorprüfung. `npm run verify:status`
vergleicht deshalb auch sie. Ohne diesen Vergleich wiese ein veralteter
Wächter eines Tages eine Datenbank ab, die in Ordnung ist.

Nachgemessen statt behauptet: Die Vorprüfung wurde gegen das oben genannte
fremde Schema laufen gelassen. Sie schlägt bei fremdem Typ an, sie schlägt bei
fremder Tabelle an (und benennt die vier fehlenden Spalten), und auf einer
Datenbank ohne beide Namen schweigt sie.

## Der Kassensturz nach jedem Push

`npm run verify:status` liest **Dateien**, nicht die Datenbank. Am 10.8.2026
war genau das der blinde Fleck: Die Migrationen stimmten, angewandt war nur
die erste, und auf den Vorgangstabellen standen fünf von Hand angelegte
Policies `using (true)` ohne `to`-Klausel – also für jede Rolle, `anon`
eingeschlossen. Alle Prüfskripte liefen grün.

Diese Abfrage gehört deshalb nach jedem `supabase db push` in den SQL-Editor.
Sie soll **nichts** zurückgeben:

```sql
-- 1. Policies, die keine Migration kennt, oder die für anon/public gelten
select tablename, policyname, roles::text, cmd, 'unerwartete Policy' as befund
from pg_policies
where schemaname = 'public'
  and tablename in ('repair_tickets', 'ticket_history', 'workshop_staff')
  and (
    roles::text[] && array['anon', 'public']
    or policyname not in (
      'Werkstatt liest Vorgaenge', 'Werkstatt legt Vorgaenge an',
      'Werkstatt pflegt Vorgaenge', 'Werkstatt liest Historie',
      'Mitarbeitende sehen ihren Eintrag'
    )
  )
union all
-- 2. Tabellen ohne RLS oder mit einem Recht für anon
select c.relname, '-', '-', '-',
       case when not c.relrowsecurity then 'RLS ist aus' else 'anon hat ein Tabellenrecht' end
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('repair_tickets', 'ticket_history', 'workshop_staff')
  and (not c.relrowsecurity
       or has_table_privilege('anon', c.oid, 'SELECT')
       or has_table_privilege('anon', c.oid, 'INSERT')
       or has_table_privilege('anon', c.oid, 'UPDATE')
       or has_table_privilege('anon', c.oid, 'DELETE'))
union all
-- 3. Funktionen ohne festen search_path oder mit Ausführungsrecht für anon
select p.proname, '-', '-', '-',
       case when p.proconfig is null then 'kein search_path'
            else 'anon darf ausführen' end
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_workshop_staff', 'is_service_role', 'apply_ticket_status',
                    'touch_repair_ticket', 'log_ticket_created', 'broadcast_ticket_change')
  and (p.proconfig is null or has_function_privilege('anon', p.oid, 'EXECUTE'));
```

Dazu, einmal im Dashboard: **Advisors → Security**. Supabase prüft dort unter
anderem auf Tabellen ohne RLS und auf Funktionen mit beweglichem
`search_path`. Es ist die einzige Prüfung dieses Projekts, die ein Mensch
auslösen muss – die anderen laufen in CI.

## Personal freischalten

Es gibt bewusst keine Registrierung im Dashboard – ein Zugang, den man sich
selbst anlegen kann, ist keiner.

1. In Supabase unter **Authentication → Users** eine Benutzerin anlegen
   (E-Mail + Passwort). „Auto Confirm User" anhaken.

   Nicht per `insert into auth.users`: Ein von Hand geschriebenes Konto meldet
   sich nicht an. GoTrue verlangt leere Zeichenketten statt `NULL` in den
   Token-Spalten und einen passenden Eintrag in `auth.identities` – beides
   legt die Oberfläche automatisch an.
2. Im SQL-Editor freischalten:

   ```sql
   insert into public.workshop_staff (user_id, display_name)
   select id, 'Vorname Nachname' from auth.users where email = 'name@example.de'
   on conflict (user_id) do nothing;
   ```

Entziehen geht genauso: `delete from public.workshop_staff where user_id = …`.
Der Zugang bleibt bestehen, sieht aber nichts mehr.

Empfohlen: **Authentication → Providers → Email** die Selbstregistrierung
(„Enable email signups") abschalten. Ohne Eintrag in `workshop_staff` sieht ein
fremdes Konto ohnehin nichts, aber ein Anmeldeformular, das keine neuen Konten
erzeugt, ist die kleinere Angriffsfläche.

## Aufbewahrung

Vorgänge werden nicht gelöscht, sondern abgeschlossen – dafür gibt es
absichtlich keine Delete-Policy. Das Aufräumen nach Ablauf der
Aufbewahrungsfrist ist ein Wartungsvorgang mit Service-Role, zum Beispiel:

```sql
delete from public.repair_tickets
where status = 'completed'
  and status_changed_at < now() - interval '3 years';
```

Drei Jahre, weil Gewährleistungs- und Garantiefragen bis dahin auftauchen
können; die Historie hängt am Vorgang und geht per `on delete cascade` mit.
Die tatsächliche Frist bestimmt der Betrieb – sie gehört dann auch in
`app/datenschutz`.
