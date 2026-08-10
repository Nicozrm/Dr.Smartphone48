-- ---------------------------------------------------------------------------
-- Reparaturvorgänge: Schema, Indizes, Historie
--
-- Diese Migration legt den Bestand an, auf dem die Statusseite und das
-- Werkstatt-Dashboard arbeiten. Sie ist die zweite Hälfte einer Zusage, deren
-- erste Hälfte in `lib/tickets/status.ts` steht: Dort ist die Reihenfolge der
-- acht Zustände in TypeScript beschrieben, hier als Postgres-Enum. Laufen die
-- beiden auseinander, meldet die Website einen Zustand, den die Datenbank
-- ablehnt. `npm run verify:status` bricht deshalb ab, wenn sich die Listen
-- unterscheiden.
--
-- Grundhaltung wie im Rest des Projekts: so wenig personenbezogene Daten wie
-- möglich, und jede Spalte, die es doch gibt, hat einen benennbaren Zweck.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Vorprüfung: läuft diese Migration in die richtige Datenbank?
--
-- Der Anlass ist ein realer Fund. Im einzigen erreichbaren Projekt lag bereits
-- ein `public.ticket_status` – mit den Werten 'offen', 'in_arbeit', 'fertig' –
-- und eine `public.repair_tickets` mit anderen Spaltennamen, aus einem fremden
-- Vorläufer. Alles darunter arbeitet mit `if not exists`, und das ist beim
-- zweiten Lauf derselben Migration genau richtig. Trifft es aber auf ein
-- fremdes Schema, wird aus der Wiederholbarkeit eine Falle: Der Typ wird
-- übersprungen, die Tabelle wird übersprungen, und die Migration baut den Rest
-- des Hauses auf ein Fundament, das ihr nicht gehört.
--
-- Sie liefe dabei nicht einmal sauber durch, sondern bräche später an einer
-- Stelle ab, die nichts erklärt („column estimate_reference does not exist“) –
-- nach zwei angelegten Erweiterungen und einem angelegten Typ. Ein halb
-- angewandtes Schema ist schlimmer als ein gar nicht angewandtes, denn beim
-- nächsten Versuch sieht es aus wie ein begonnener eigener Stand.
--
-- Deshalb steht die Frage vorn und wird laut beantwortet, bevor irgendetwas
-- entsteht. Sie prüft nicht auf eine leere Datenbank – neben dieser Anwendung
-- darf beliebig viel anderes liegen. Sie prüft genau die beiden Namen, die wir
-- beanspruchen.
-- ---------------------------------------------------------------------------

do $$
declare
  -- Dieselbe Liste wie in `lib/tickets/status.ts`. Damit steht sie im Projekt
  -- ein drittes Mal – `npm run verify:status` vergleicht deshalb auch diese
  -- hier gegen TypeScript, nicht nur die des `create type` weiter unten.
  v_erwartet text[] := array[
    'open',
    'device_received',
    'diagnosis',
    'waiting_for_parts',
    'repairing',
    'quality_check',
    'ready_for_pickup',
    'completed'
  ];
  v_vorhanden text[];
  v_fehlend text;
begin
  select array_agg(e.enumlabel order by e.enumsortorder)
    into v_vorhanden
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'public' and t.typname = 'ticket_status';

  if v_vorhanden is not null and v_vorhanden is distinct from v_erwartet then
    raise exception
      'In dieser Datenbank liegt bereits ein Typ public.ticket_status mit anderen Werten (%).',
      array_to_string(v_vorhanden, ', ')
      using
        errcode = 'invalid_table_definition',
        hint = 'Diese Migrationen brauchen eine Datenbank, in der die Namen ticket_status und repair_tickets frei sind. Entweder ein eigenes Supabase-Projekt anlegen oder den fremden Vorläufer vorher verwerfen – niemals blind darüberschreiben.';
  end if;

  -- Die Tabelle darf schon dastehen (zweiter Lauf), aber dann muss es unsere
  -- sein. Geprüft werden vier Spalten, die es nur bei uns gibt; die erste
  -- Fassung des Vorläufers hatte an ihrer Stelle `customer_name`, `device_brand`
  -- und `status_note`.
  if to_regclass('public.repair_tickets') is not null then
    select string_agg(erwartet.spalte, ', ' order by erwartet.spalte)
      into v_fehlend
    from (values ('customer'), ('consent_at'), ('contact_channel'), ('total_price'))
      as erwartet(spalte)
    where not exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'repair_tickets'
        and c.column_name = erwartet.spalte
    );

    if v_fehlend is not null then
      raise exception
        'In dieser Datenbank liegt bereits eine Tabelle public.repair_tickets, der folgende Spalten fehlen: %.',
        v_fehlend
        using
          errcode = 'invalid_table_definition',
          hint = 'Das ist nicht die Tabelle dieser Anwendung. Ein eigenes Supabase-Projekt anlegen oder den fremden Vorläufer vorher verwerfen.';
    end if;
  end if;
end $$;

create extension if not exists "pgcrypto";
-- Für die Suche in der Werkstattliste (Name, Gerät, Vorgangscode).
--
-- Ausdrücklich **nicht** im Schema `public`: Dort liegt die von PostgREST
-- veröffentlichte API, und jede Funktion einer Erweiterung stünde damit als
-- Endpunkt bereit. Supabases Sicherheitsprüfung mahnt das zu Recht an
-- („Extension in Public").
create extension if not exists "pg_trgm" with schema extensions;

-- ---------------------------------------------------------------------------
-- Der Ablauf als Typ
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type public.ticket_status as enum (
      'open',
      'device_received',
      'diagnosis',
      'waiting_for_parts',
      'repairing',
      'quality_check',
      'ready_for_pickup',
      'completed'
    );
  end if;
end $$;

-- Wie der Kunde über den Fortschritt informiert werden möchte.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'contact_channel') then
    create type public.contact_channel as enum ('none', 'email', 'whatsapp', 'sms');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Vorgänge
-- ---------------------------------------------------------------------------

create table if not exists public.repair_tickets (
  id uuid primary key default gen_random_uuid(),

  -- Der Schlüssel, den der Kunde in der Hand hält: acht Zeichen aus einem
  -- Alphabet ohne I, O, 0 und 1, gezogen in `lib/tickets/code.ts`. Die
  -- Prüfung hier ist die letzte Instanz – ein Code in anderer Form käme aus
  -- keinem Formular dieser Website.
  ticket_code text not null unique
    check (ticket_code ~ '^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$'),

  -- Die deterministische Vorgangsnummer des Voranschlags und seine
  -- kanonischen Parameter. Damit lässt sich das Ticket jederzeit wieder
  -- aufbauen, ohne die Preisliste von damals zu kennen.
  estimate_reference text,
  estimate_query text,

  customer text not null check (length(btrim(customer)) between 2 and 120),
  phone text check (phone is null or length(phone) <= 40),
  email text check (email is null or length(email) <= 160),

  device text not null check (length(btrim(device)) between 1 and 160),
  device_brand_id text,
  device_model_id text,

  -- Nur Ziffern. Die IMEI ist freiwillig; ohne sie funktioniert alles außer
  -- der eindeutigen Zuordnung am Tresen.
  imei text check (imei is null or imei ~ '^[0-9]{15}$'),

  -- Die Positionen als Kopie zum Zeitpunkt der Anmeldung. Ändert sich später
  -- eine Preisliste, bleibt der zugesagte Festpreis stehen.
  repair_items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(repair_items) = 'array'),
  total_price integer not null default 0 check (total_price >= 0),
  estimated_minutes integer not null default 0 check (estimated_minutes >= 0),

  -- Zusage der Werkstatt. Bleibt leer, solange niemand sie gegeben hat –
  -- eine gerechnete Fertigstellung wäre eine erfundene Zahl.
  estimated_ready_at timestamptz,

  status public.ticket_status not null default 'open',

  -- Vermerke unter Kollegen. Verlassen den Server nur Richtung Werkstatt.
  internal_notes text,
  -- Was der Kunde bei der Anmeldung geschrieben hat.
  customer_note text,

  contact_channel public.contact_channel not null default 'none',

  -- Nachweis der Einwilligung. Ohne sie entsteht kein Datensatz; die Spalte
  -- ist deshalb not null und wird nie nachträglich gesetzt.
  consent_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status_changed_at timestamptz not null default now(),

  -- Ein Weg für die Fertigmeldung muss existieren, sobald der Kunde einen
  -- Kanal gewählt hat. Die API prüft dasselbe; hier steht es, damit auch ein
  -- direkter Import es nicht unterlaufen kann.
  constraint repair_tickets_channel_reachable check (
    contact_channel = 'none'
    or (contact_channel = 'email' and email is not null)
    or (contact_channel in ('whatsapp', 'sms') and phone is not null)
  )
);

comment on table public.repair_tickets is
  'Reparaturvorgänge. Der ticket_code ist ein Schlüssel, kein Ausweis: Wer ihn hat, sieht die öffentliche Sicht (siehe lib/tickets/public-view.ts).';

-- Suchtext für die Werkstattliste. Generiert, damit er nicht vergessen werden
-- kann, und über GIN/Trigramm indiziert – so bleibt eine Suche nach einem
-- halben Nachnamen auch bei zehntausend Vorgängen unter einer Millisekunde.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'repair_tickets'
      and column_name = 'search_text'
  ) then
    alter table public.repair_tickets
      add column search_text text
      generated always as (
        lower(
          coalesce(ticket_code, '') || ' ' ||
          coalesce(customer, '') || ' ' ||
          coalesce(device, '') || ' ' ||
          coalesce(phone, '') || ' ' ||
          coalesce(email, '') || ' ' ||
          coalesce(estimate_reference, '')
        )
      ) stored;
  end if;
end $$;

create index if not exists repair_tickets_status_idx
  on public.repair_tickets (status);
create index if not exists repair_tickets_created_at_idx
  on public.repair_tickets (created_at desc);
create index if not exists repair_tickets_status_changed_at_idx
  on public.repair_tickets (status_changed_at desc);
-- Die Standardansicht des Dashboards: offene Vorgänge, neueste zuerst.
create index if not exists repair_tickets_open_idx
  on public.repair_tickets (status, status_changed_at desc)
  where status <> 'completed';
-- Operatorklasse mit Schema, weil die Erweiterung nicht in `public` liegt.
create index if not exists repair_tickets_search_idx
  on public.repair_tickets using gin (search_text extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Historie
--
-- Jeder Statuswechsel hinterlässt eine Zeile. Sie ist die Grundlage der
-- Zeitleiste auf der Statusseite und der einzige Beleg dafür, wann etwas
-- passiert ist – Zeitstempel auf dem Vorgang selbst kennen nur den letzten
-- Stand.
-- ---------------------------------------------------------------------------

create table if not exists public.ticket_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null
    references public.repair_tickets (id) on delete cascade,
  -- Leer beim ersten Eintrag: Davor gab es keinen Zustand.
  old_status public.ticket_status,
  new_status public.ticket_status not null,
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  -- Wer den Wechsel ausgelöst hat. Leer heißt: das System.
  changed_by text check (changed_by is null or length(changed_by) <= 160)
);

comment on table public.ticket_history is
  'Lückenlose Historie der Statuswechsel. Wird ausschließlich über public.apply_ticket_status geschrieben.';

create index if not exists ticket_history_ticket_idx
  on public.ticket_history (ticket_id, created_at desc);
create index if not exists ticket_history_created_at_idx
  on public.ticket_history (created_at desc);

-- ---------------------------------------------------------------------------
-- Werkstattpersonal
--
-- Kein Rollensystem, keine Rechteverwaltung: Wer in dieser Tabelle steht,
-- arbeitet in der Werkstatt und sieht alles. Alle anderen sehen nichts. Der
-- Eintrag entsteht bewusst per SQL und nicht über ein Formular – ein
-- Dashboard, an dem man sich selbst freischalten kann, ist keins.
-- ---------------------------------------------------------------------------

create table if not exists public.workshop_staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

comment on table public.workshop_staff is
  'Freigeschaltete Mitarbeitende. Einträge nur per SQL oder Service-Role anlegen.';
