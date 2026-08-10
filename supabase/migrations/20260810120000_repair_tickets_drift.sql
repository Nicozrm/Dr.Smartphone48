-- ---------------------------------------------------------------------------
-- Abgleich: was in der Datenbank steht, gegen das, was hier steht
--
-- Anlass ist ein realer Befund vom 10.8.2026. Im Supabase-Projekt standen auf
-- den Vorgangstabellen fünf Policies, die in keiner Migration dieses
-- Repositories vorkommen:
--
--   repair_tickets_select_all   for select  to public  using (true)
--   repair_tickets_insert_all   for insert  to public  with check (true)
--   repair_tickets_update_all   for update  to public  using (true)
--   ticket_history_select_all   for select  to public  using (true)
--   ticket_history_insert_all   for insert  to public  with check (true)
--
-- `to public` heißt: jede Rolle, also auch `anon`. Wer den öffentlichen
-- Schlüssel aus dem ausgelieferten JavaScript liest – er steht dort, er muss
-- dort stehen –, konnte damit jeden Vorgang lesen, anlegen und ändern: Name,
-- Telefonnummer, E-Mail, IMEI, interne Vermerke. Genau das, was
-- `20260803120100_repair_tickets_rls.sql` mit dem Satz „Für Kunden gibt es
-- keine Policy" ausschließt.
--
-- Zwei Dinge waren daran schlimmer als der Fehler selbst:
--
-- 1. **Die Migrationen waren richtig.** Angewandt war nur die erste; die
--    beiden folgenden nie. `workshop_staff`, `is_workshop_staff()` und
--    `apply_ticket_status()` gab es in der Datenbank gar nicht. Was dort
--    stattdessen stand, hatte jemand von Hand geschrieben.
-- 2. **`verify:status` schlug nicht an.** Es liest die Dateien, nicht die
--    Datenbank, und die Dateien stimmten. Seine Prüfung auf `anon` suchte
--    zudem wörtlich nach `to … anon` – eine Policy ganz ohne `to` fällt aber
--    auf `public` zurück und ist damit weitreichender, nicht harmloser.
--    Beides ist repariert; die Prüfung kennt jetzt auch diese Form.
--
-- Diese Migration ist deshalb nicht bloß ein `drop policy`, sondern ein
-- Abgleich: Sie entfernt auf den drei Tabellen **jede** Policy, die hier nicht
-- namentlich vorgesehen ist. Ein `supabase db push` holt eine von Hand
-- veränderte Datenbank damit zurück in den Zustand, den dieses Verzeichnis
-- beschreibt – und zwar auch dann, wenn niemand nachsieht.
--
-- Wer eine Policy ergänzt, trägt sie in die Liste unten ein. Vergisst er es,
-- wird sie beim nächsten Push wieder entfernt – deshalb prüft
-- `npm run verify:status`, dass die Liste hier und die tatsächlich angelegten
-- Policies dieselbe Menge sind.
-- ---------------------------------------------------------------------------

do $$
declare
  -- Tabelle → die Policies, die es auf ihr geben darf. Genau die Namen aus
  -- `20260803120100_repair_tickets_rls.sql`.
  vorgesehen constant jsonb := jsonb_build_object(
    'repair_tickets', jsonb_build_array(
      'Werkstatt liest Vorgaenge',
      'Werkstatt legt Vorgaenge an',
      'Werkstatt pflegt Vorgaenge'
    ),
    'ticket_history', jsonb_build_array(
      'Werkstatt liest Historie'
    ),
    'workshop_staff', jsonb_build_array(
      'Mitarbeitende sehen ihren Eintrag'
    )
  );
  tabelle text;
  fremd record;
begin
  for tabelle in select jsonb_object_keys(vorgesehen) loop
    -- Eine noch nicht angelegte Tabelle ist kein Fehler: Diese Migration läuft
    -- auch gegen eine Datenbank, in der die vorigen nie durchliefen.
    if to_regclass(format('public.%I', tabelle)) is null then
      raise notice 'Abgleich: Tabelle public.% gibt es nicht – übersprungen.', tabelle;
      continue;
    end if;

    for fremd in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = tabelle
        and policyname <> all (
          select jsonb_array_elements_text(vorgesehen -> tabelle)
        )
    loop
      raise warning 'Abgleich: entferne unvorhergesehene Policy %.% – sie steht in keiner Migration.',
        tabelle, fremd.policyname;
      execute format('drop policy %I on public.%I', fremd.policyname, tabelle);
    end loop;
  end loop;
end $$;

-- Row Level Security noch einmal ausdrücklich. Ein `drop policy` auf einer
-- Tabelle, auf der RLS versehentlich aus ist, macht sie nicht sicherer,
-- sondern gar nichts – ohne RLS gilt allein das Tabellenrecht.
do $$
declare
  tabelle text;
begin
  foreach tabelle in array array['repair_tickets', 'ticket_history', 'workshop_staff'] loop
    if to_regclass(format('public.%I', tabelle)) is not null then
      execute format('alter table public.%I enable row level security', tabelle);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Das zweite Schloss: `anon` bekommt auf diesen Tabellen gar kein Recht
--
-- Bisher hing der Schutz an einer Abwesenheit – es gab keine Policy für
-- `anon`, also sah `anon` nichts. Das ist richtig und war trotzdem zu wenig:
-- Eine einzige unbedachte Zeile im SQL-Editor kippt es, und genau das ist
-- passiert. Ein Recht, das nie erteilt wurde, lässt sich dagegen nicht durch
-- eine Policy zurückholen – RLS filtert Zeilen, es verleiht keine Rechte.
--
-- `authenticated` behält seine Rechte: Darüber läuft das Werkstatt-Dashboard,
-- und dort entscheiden die Policies. Ein Konto ohne Eintrag in
-- `workshop_staff` sieht weiterhin nichts.
--
-- Die Anwendung verliert dabei nichts. Der öffentliche Schlüssel wird in
-- `lib/supabase/browser.ts` ausschließlich für den Realtime-Kanal benutzt;
-- gelesen und geschrieben wird über die API mit der Service-Role, und die
-- umgeht RLS ohnehin über ihr Rollenattribut.
--
-- Nebenbei verschwinden damit die Meldungen `pg_graphql_anon_table_exposed`
-- aus Supabases Sicherheitsprüfung: Ohne `select` für `anon` taucht die
-- Tabelle im öffentlichen GraphQL-Schema nicht mehr auf.
-- ---------------------------------------------------------------------------

do $$
declare
  tabelle text;
begin
  foreach tabelle in array array['repair_tickets', 'ticket_history', 'workshop_staff'] loop
    if to_regclass(format('public.%I', tabelle)) is not null then
      execute format('revoke all on table public.%I from anon', tabelle);
    end if;
  end loop;
end $$;

-- Bewusst **kein** `alter default privileges … revoke all on tables from anon`.
-- Das wirkte auf jede künftige Tabelle im Schema `public`, nicht nur auf die
-- drei hier – und in diesem Projekt liegen die Tabellen einer zweiten
-- Anwendung. Eine Voreinstellung, die deren nächste Migration lautlos
-- entrechtet, wäre ein zweiter Fehler derselben Art wie der, den diese Datei
-- repariert: eine Wirkung an einer Stelle, an der niemand sie sucht.
