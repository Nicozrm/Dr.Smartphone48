/*
  Die Datenbank als Typ.

  Von Hand geschrieben statt generiert – aus demselben Grund, aus dem hier
  kein QR-Generator aus dem Paketregister liegt: Es sind hundert Zeilen, sie
  ändern sich selten, und ein Typ, den man selbst geschrieben hat, erklärt
  auch, warum eine Spalte da ist.

  Wer die Migrationen ändert, ändert diese Datei mit. `npm run verify:status`
  vergleicht wenigstens die Zustandsliste automatisch – für die Spalten ist
  der TypeScript-Compiler zuständig, sobald jemand ein Feld anfasst.
*/

import type { TicketStatus } from "@/lib/tickets/status";
import type { ContactChannel, TicketRepairItem } from "@/lib/tickets/types";

/** Die Zeile, wie sie aus Postgres kommt (snake_case). */
export type RepairTicketRow = {
  id: string;
  ticket_code: string;
  estimate_reference: string | null;
  estimate_query: string | null;
  customer: string;
  phone: string | null;
  email: string | null;
  device: string;
  device_brand_id: string | null;
  device_model_id: string | null;
  imei: string | null;
  repair_items: TicketRepairItem[];
  total_price: number;
  estimated_minutes: number;
  estimated_ready_at: string | null;
  status: TicketStatus;
  internal_notes: string | null;
  customer_note: string | null;
  contact_channel: ContactChannel;
  consent_at: string;
  created_at: string;
  updated_at: string;
  status_changed_at: string;
};

/** Was beim Anlegen geschrieben wird – alles andere setzt die Datenbank. */
export type RepairTicketInsert = Pick<
  RepairTicketRow,
  | "ticket_code"
  | "estimate_reference"
  | "estimate_query"
  | "customer"
  | "phone"
  | "email"
  | "device"
  | "device_brand_id"
  | "device_model_id"
  | "imei"
  | "repair_items"
  | "total_price"
  | "estimated_minutes"
  | "contact_channel"
  | "customer_note"
>;

/** Was die Werkstatt ändern darf – ohne `status`, der geht über die Funktion. */
export type RepairTicketUpdate = {
  internal_notes?: string | null;
  estimated_ready_at?: string | null;
};

export type TicketHistoryRow = {
  id: string;
  ticket_id: string;
  old_status: TicketStatus | null;
  new_status: TicketStatus;
  note: string | null;
  created_at: string;
  changed_by: string | null;
};

export type WorkshopStaffRow = {
  user_id: string;
  display_name: string | null;
  created_at: string;
};

/**
 * Schema für `supabase-js`. Nur die Tabellen und die zwei Funktionen, die
 * dieses Projekt anfasst – nicht das halbe Postgres.
 *
 * Bewusst ein `type` und kein `interface`: PostgREST prüft das Schema gegen
 * `Record<string, …>`, und diese Zuweisung gelingt nur bei Typaliasen
 * (Interfaces bekommen keine implizite Indexsignatur). Mit einem `interface`
 * fällt die Ableitung still auf `never` zurück, und jede Abfrage im ganzen
 * Projekt verliert ihre Typen – ohne dass irgendwo ein Fehler stünde.
 */
export type Database = {
  public: {
    Tables: {
      repair_tickets: {
        Row: RepairTicketRow;
        Insert: RepairTicketInsert;
        Update: RepairTicketUpdate;
        Relationships: [];
      };
      ticket_history: {
        Row: TicketHistoryRow;
        Insert: Omit<TicketHistoryRow, "id" | "created_at">;
        // Historie wird geschrieben und gelesen, nie geändert – siehe die
        // fehlende Update-Policy in der Migration.
        Update: Record<string, never>;
        Relationships: [];
      };
      workshop_staff: {
        Row: WorkshopStaffRow;
        Insert: Omit<WorkshopStaffRow, "created_at">;
        Update: Partial<Omit<WorkshopStaffRow, "user_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      apply_ticket_status: {
        Args: {
          p_ticket_id: string;
          p_new_status: TicketStatus;
          p_note?: string | null;
          p_changed_by?: string | null;
        };
        Returns: RepairTicketRow;
      };
      is_workshop_staff: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      ticket_status: TicketStatus;
      contact_channel: ContactChannel;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
