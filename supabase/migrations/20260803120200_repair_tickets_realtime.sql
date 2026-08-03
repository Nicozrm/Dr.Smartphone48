-- ---------------------------------------------------------------------------
-- Realtime: der Statuswechsel als Rundruf
--
-- Warum Broadcast und nicht `postgres_changes`: `postgres_changes` schickt die
-- **ganze Zeile** an jeden berechtigten Zuhörer. In dieser Zeile stehen Name,
-- Telefonnummer und IMEI. Für die Statusseite eines Kunden wäre das ein
-- Datenleck mit Ansage, und für das Dashboard eine Last, die mit jeder Zeile
-- wächst.
--
-- Hier entscheidet stattdessen die Datenbank, was rausgeht – und zwar je
-- Kanal etwas anderes:
--
--   vorgang:<CODE>        Zustand und zwei Zeitstempel. Wer den Code hat,
--                         kennt ihn bereits; er steht im Themennamen.
--   werkstatt:vorgaenge   nur ein Zeitstempel. Kein Code, kein Zustand,
--                         nichts. Ein „irgendetwas hat sich bewegt“.
--
-- ---------------------------------------------------------------------------
-- Warum die Kanäle öffentlich sind
--
-- Private Kanäle prüfen ihre Zuhörer über Policies auf `realtime.messages`.
-- Diese Tabelle gehört `supabase_realtime_admin`; die Rolle `postgres`, mit
-- der Migrationen laufen, ist nicht ihr Eigentümer und darf dort keine Policy
-- anlegen („must be owner of table messages"). Ohne Policy lässt ein privater
-- Kanal niemanden zu – die Statusseite bliebe für immer stumm.
--
-- Statt die Sicherheit an eine Berechtigung zu hängen, die es hier nicht gibt,
-- steckt sie in der Nutzlast:
--
-- – **Themennamen kann man nicht durchsuchen.** Realtime kennt keine Muster-
--   Abonnements; wer `vorgang:K7M2-B94X` hören will, muss den Code kennen.
--   Damit gilt genau dasselbe Modell wie für die Statusseite selbst: Der Code
--   ist der Schlüssel.
-- – **Der Werkstattkanal trägt kein Geheimnis.** Sein Name steht im
--   JavaScript und ist damit öffentlich bekannt. Also enthält seine Nutzlast
--   nichts als einen Zeitstempel. Das Dashboard lädt ohnehin über die
--   angemeldete API nach – es braucht nur den Anstoß.
--
-- Was ein Fremder daraus erfahren kann: dass irgendwann etwas passiert ist.
-- Nicht was, nicht bei wem, nicht an welchem Gerät.
--
-- Sollte das Projekt eines Tages Zugriff auf `realtime.messages` haben
-- (eigener Postgres, angehobene Rechte), sind es zwei Zeilen: `true` als
-- vierter Parameter von `realtime.send` und die beiden Policies, die in der
-- Fassung dieser Datei vom 3. August 2026 in der Versionsgeschichte stehen.
-- ---------------------------------------------------------------------------

create or replace function public.broadcast_ticket_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Nur Zustandswechsel und Neuanlagen sind ein Rundruf wert. Ein geänderter
  -- interner Vermerk geht niemanden an, der zuhört.
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  -- Ein Aussetzer im Rundruf darf nie einen Statuswechsel verhindern. Die
  -- Seite aktualisiert sich dann beim nächsten Aufruf – ärgerlich, aber
  -- folgenlos. Ein fehlgeschlagenes `update` wäre das Gegenteil.
  begin
    -- An den einen Kunden, der den Code hat.
    perform realtime.send(
      jsonb_build_object(
        'ticketCode', new.ticket_code,
        'status', new.status,
        'statusChangedAt', new.status_changed_at,
        'updatedAt', new.updated_at
      ),
      'status',
      'vorgang:' || new.ticket_code,
      false
    );

    -- An die Werkstatt: nur der Anstoß, ohne jeden Inhalt.
    perform realtime.send(
      jsonb_build_object('changedAt', new.updated_at),
      'status',
      'werkstatt:vorgaenge',
      false
    );
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

-- Ein Auslöser ist kein Endpunkt. Warum das ausdrücklich dasteht, erklärt der
-- gleichlautende Abschnitt in der vorigen Migration.
revoke all on function public.broadcast_ticket_change() from public, anon, authenticated;

-- Gesendet wird ausschließlich aus diesem Trigger. Ein Client kann auf diesen
-- Themen nichts veröffentlichen, was jemand anderes glauben würde: Die
-- Statusseite übernimmt aus dem Rundruf nur den Zustand und lädt die
-- Zeitleiste danach über die API nach, wo der Server die Wahrheit kennt.
