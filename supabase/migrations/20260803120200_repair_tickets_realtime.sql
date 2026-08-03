-- ---------------------------------------------------------------------------
-- Realtime: der Statuswechsel als Rundruf
--
-- Warum Broadcast und nicht `postgres_changes`: `postgres_changes` schickt die
-- **ganze Zeile** an jeden berechtigten Zuhörer. In dieser Zeile stehen Name,
-- Telefonnummer und IMEI. Für die Statusseite eines Kunden wäre das ein
-- Datenleck mit Ansage, und für das Dashboard eine Last, die mit jeder Zeile
-- wächst.
--
-- Hier entscheidet stattdessen die Datenbank, was rausgeht: zwei Rundrufe mit
-- genau vier Feldern, keines davon personenbezogen.
--
--   vorgang:<CODE>        → der eine Kunde, der den Code hat
--   werkstatt:vorgaenge   → alle angemeldeten Arbeitsplätze
--
-- Beide Kanäle sind privat; die Berechtigung entscheidet sich an den Policies
-- auf `realtime.messages` weiter unten. Der Rundruf ist ein Signal, keine
-- Datenquelle: Wer mehr braucht als den neuen Zustand, holt es sich über die
-- API, wo redigiert wird.
-- ---------------------------------------------------------------------------

create or replace function public.broadcast_ticket_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payload jsonb;
begin
  -- Nur Zustandswechsel und Neuanlagen sind ein Rundruf wert. Ein geänderter
  -- interner Vermerk geht niemanden an, der zuhört.
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  v_payload := jsonb_build_object(
    'ticketCode', new.ticket_code,
    'status', new.status,
    'statusChangedAt', new.status_changed_at,
    'updatedAt', new.updated_at
  );

  -- Ein Aussetzer im Rundruf darf nie einen Statuswechsel verhindern. Die
  -- Seite aktualisiert sich dann beim nächsten Aufruf – ärgerlich, aber
  -- folgenlos. Ein fehlgeschlagenes `update` wäre das Gegenteil.
  begin
    perform realtime.send(v_payload, 'status', 'vorgang:' || new.ticket_code, true);
    perform realtime.send(v_payload, 'status', 'werkstatt:vorgaenge', true);
  exception
    when others then
      raise warning 'Rundruf für Vorgang % fehlgeschlagen: %', new.ticket_code, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists repair_tickets_broadcast on public.repair_tickets;
create trigger repair_tickets_broadcast
  after insert or update on public.repair_tickets
  for each row execute function public.broadcast_ticket_change();

-- ---------------------------------------------------------------------------
-- Wer darf zuhören?
--
-- Der Kundenkanal steht `anon` offen – aber nur, wer den Themennamen kennt,
-- bekommt etwas, und der Themenname enthält den Vorgangscode. Der Code ist
-- damit dasselbe wie überall in diesem System: ein Schlüssel. Deshalb steht
-- im Rundruf auch nichts, was über den Zustand hinausgeht.
--
-- Der Werkstattkanal verlangt eine Anmeldung und einen Eintrag in
-- `workshop_staff`.
-- ---------------------------------------------------------------------------

alter table realtime.messages enable row level security;

drop policy if exists "Kunde hoert seinen Vorgang" on realtime.messages;
create policy "Kunde hoert seinen Vorgang"
  on realtime.messages for select
  to anon, authenticated
  using (
    extension = 'broadcast'
    and realtime.topic() like 'vorgang:%'
  );

drop policy if exists "Werkstatt hoert alle Vorgaenge" on realtime.messages;
create policy "Werkstatt hoert alle Vorgaenge"
  on realtime.messages for select
  to authenticated
  using (
    extension = 'broadcast'
    and realtime.topic() = 'werkstatt:vorgaenge'
    and public.is_workshop_staff()
  );

-- Niemand sendet von außen. Alles, was auf diesen Kanälen läuft, kommt aus
-- dem Trigger oben – es gibt bewusst keine Insert-Policy.
