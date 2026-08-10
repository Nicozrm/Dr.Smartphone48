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
