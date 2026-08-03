-- ---------------------------------------------------------------------------
-- Zugriff: Row Level Security, Schreibpfad, Zeitstempel
--
-- Die Regel in einem Satz: **Niemand liest diese Tabellen direkt, außer dem
-- angemeldeten Werkstattpersonal.**
--
-- Für Kunden gibt es keine Policy. Kein `anon`, kein `authenticated`, nichts.
-- Die Statusseite bekommt ihre Daten ausschließlich über den Server
-- (`app/api/status/[ticketCode]`), der mit der Service-Role liest und vorher
-- redigiert (`lib/tickets/public-view.ts`). Der Grund ist einfach: In diesen
-- Zeilen stehen Name, Telefonnummer und IMEI. Eine Lese-Policy für `anon`
-- wäre eine Lese-Policy für jeden, der acht Zeichen durchprobiert.
--
-- Die Service-Role umgeht RLS über ihr Rollenattribut `bypassrls`. Ihr
-- Schlüssel liegt deshalb ausschließlich serverseitig
-- (`SUPABASE_SERVICE_ROLE_KEY`) und darf nie in ein `NEXT_PUBLIC_`-Feld
-- geraten.
--
-- Kein `force row level security`: Es hebt nur die Ausnahme für den
-- Tabelleneigentümer auf – und genau als Eigentümer laufen die
-- `security definer`-Funktionen weiter unten, die die Historie schreiben.
-- Mit `force` stünde die Werkstatt vor einer Zeile, die sie ändern darf,
-- deren Protokoll aber niemand mehr schreiben kann. Keine Anwendung dieses
-- Projekts verbindet sich als Eigentümer; die Ausnahme greift also nie.
-- ---------------------------------------------------------------------------

alter table public.repair_tickets enable row level security;
alter table public.ticket_history enable row level security;
alter table public.workshop_staff enable row level security;

-- ---------------------------------------------------------------------------
-- Wer gehört zur Werkstatt?
--
-- `security definer` ist hier nötig, nicht bequem: Die Funktion liest
-- `workshop_staff`, und auf derselben Tabelle liegt eine Policy, die
-- ihrerseits diese Funktion aufrufen könnte. `search_path` steht fest, damit
-- niemand über ein untergeschobenes Schema eine eigene `workshop_staff`
-- einschmuggelt.
-- ---------------------------------------------------------------------------

create or replace function public.is_workshop_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.workshop_staff s
    where s.user_id = auth.uid()
  );
$$;

revoke all on function public.is_workshop_staff() from public;
grant execute on function public.is_workshop_staff() to authenticated, service_role;

/** Läuft der Aufruf mit dem Service-Role-Schlüssel, also serverseitig? */
create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

drop policy if exists "Werkstatt liest Vorgaenge" on public.repair_tickets;
create policy "Werkstatt liest Vorgaenge"
  on public.repair_tickets for select
  to authenticated
  using (public.is_workshop_staff());

drop policy if exists "Werkstatt legt Vorgaenge an" on public.repair_tickets;
create policy "Werkstatt legt Vorgaenge an"
  on public.repair_tickets for insert
  to authenticated
  with check (public.is_workshop_staff());

drop policy if exists "Werkstatt pflegt Vorgaenge" on public.repair_tickets;
create policy "Werkstatt pflegt Vorgaenge"
  on public.repair_tickets for update
  to authenticated
  using (public.is_workshop_staff())
  with check (public.is_workshop_staff());

-- Bewusst keine Delete-Policy: Ein Vorgang wird abgeschlossen, nicht
-- gelöscht. Das Aufräumen nach Ablauf der Aufbewahrungsfrist ist ein
-- Wartungsvorgang mit Service-Role, kein Knopf im Dashboard.

drop policy if exists "Werkstatt liest Historie" on public.ticket_history;
create policy "Werkstatt liest Historie"
  on public.ticket_history for select
  to authenticated
  using (public.is_workshop_staff());

-- Kein Insert für `authenticated`: Historie entsteht ausschließlich in
-- `public.apply_ticket_status`. Eine Protokollzeile, die jeder von Hand
-- schreiben kann, ist kein Protokoll.

drop policy if exists "Mitarbeitende sehen ihren Eintrag" on public.workshop_staff;
create policy "Mitarbeitende sehen ihren Eintrag"
  on public.workshop_staff for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Zeitstempel
--
-- Von Hand gesetzt hieße: sich darauf verlassen, dass jeder Schreibpfad daran
-- denkt. Ein Trigger denkt immer daran – auch bei einem Update aus der
-- SQL-Konsole.
-- ---------------------------------------------------------------------------

create or replace function public.touch_repair_ticket()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists repair_tickets_touch on public.repair_tickets;
create trigger repair_tickets_touch
  before update on public.repair_tickets
  for each row execute function public.touch_repair_ticket();

-- ---------------------------------------------------------------------------
-- Der Schreibpfad für Statuswechsel
--
-- Warum eine Funktion und nicht zwei Anweisungen aus der Anwendung: Ein
-- Statuswechsel besteht aus zwei Schreibvorgängen – Vorgang und Historie –
-- und die dürfen nicht auseinanderfallen. Bricht der zweite ab, steht in der
-- Datenbank ein Zustand, den niemand erklärt hat. Hier laufen beide in
-- derselben Transaktion.
--
-- `security definer`, damit die Historie geschrieben werden kann, ohne sie
-- für Handbetrieb zu öffnen. Dafür prüft die Funktion die Berechtigung
-- selbst – eine Definer-Funktion ohne eigene Prüfung ist eine offene Tür.
--
-- `changed_by` kommt bei angemeldeten Aufrufen aus dem Token, nicht aus dem
-- Parameter: Ein Protokoll, in das der Schreibende einen fremden Namen
-- eintragen kann, belegt nichts.
--
-- Die Prüfung der erlaubten Übergänge steht bewusst **nicht** hier, sondern in
-- `lib/tickets/status.ts`. Zwei Implementierungen derselben Regel driften
-- auseinander; die Anwendung ist die Stelle, an der die Regel begründet wird
-- und dem Personal erklärt werden kann. Was die Datenbank garantiert, ist die
-- Unteilbarkeit, nicht die Fachlichkeit.
-- ---------------------------------------------------------------------------

create or replace function public.apply_ticket_status(
  p_ticket_id uuid,
  p_new_status public.ticket_status,
  p_note text default null,
  p_changed_by text default null
)
returns public.repair_tickets
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_service boolean := public.is_service_role();
  v_old public.ticket_status;
  v_actor text;
  v_ticket public.repair_tickets;
begin
  if not (v_service or public.is_workshop_staff()) then
    raise exception 'Kein Zugriff auf diesen Vorgang'
      using errcode = 'insufficient_privilege';
  end if;

  if v_service then
    v_actor := nullif(btrim(coalesce(p_changed_by, '')), '');
  else
    v_actor := coalesce(auth.jwt() ->> 'email', auth.uid()::text);
  end if;

  select status into v_old
  from public.repair_tickets
  where id = p_ticket_id
  for update;

  if not found then
    raise exception 'Vorgang % nicht gefunden', p_ticket_id
      using errcode = 'no_data_found';
  end if;

  update public.repair_tickets
  set status = p_new_status
  where id = p_ticket_id
  returning * into v_ticket;

  insert into public.ticket_history (ticket_id, old_status, new_status, note, changed_by)
  values (
    p_ticket_id,
    v_old,
    p_new_status,
    nullif(btrim(coalesce(p_note, '')), ''),
    v_actor
  );

  return v_ticket;
end;
$$;

revoke all on function public.apply_ticket_status(uuid, public.ticket_status, text, text) from public;
grant execute on function public.apply_ticket_status(uuid, public.ticket_status, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Der erste Eintrag
--
-- Ein Vorgang ohne Historie hätte eine Zeitleiste, die erst beim zweiten
-- Zustand beginnt – der Kunde sähe seine eigene Anmeldung nicht. Der Trigger
-- schreibt sie deshalb beim Anlegen mit.
-- ---------------------------------------------------------------------------

create or replace function public.log_ticket_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.ticket_history (ticket_id, old_status, new_status, note, changed_by)
  values (new.id, null, new.status, null, 'anmeldung');
  return new;
end;
$$;

drop trigger if exists repair_tickets_log_created on public.repair_tickets;
create trigger repair_tickets_log_created
  after insert on public.repair_tickets
  for each row execute function public.log_ticket_created();
