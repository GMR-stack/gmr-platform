// Public digital-card lookup for the Cardlogue app's "share by link" feature
// (/cardlogue/card/:id). Uses the Cardlogue Supabase project's service role
// key to bypass `my_cards`' RLS (which otherwise only lets the owning user
// read their own row) — safe here because the id is an unguessable UUID and
// the caller only ever gets back the one row they already asked for by id,
// with account-identifying columns (user_id) stripped before it ever leaves
// this function.

import { getCardlogueSupabase } from "./portone";

// Mirrors Cardlogue's types/mycard.ts MyCard, minus `user_id` — this is a
// public, unauthenticated response, so nothing that identifies the owning
// account goes out (the card's own `email` field is fine — that's a
// display value the card owner chose to put on the card, not their login).
export interface PublicMyCard {
  id: string;
  name: string;
  company: string;
  title: string;
  phone: string;
  company_phone: string;
  fax: string;
  email: string;
  address: string;
  profile_image_url: string | null;
  logo_image_url: string | null;
  bg_image_url: string | null;
  back_bg_image_url: string | null;
  template_id: number;
  bg_color: string;
  accent_color: string;
  font_color: string;
  font_type: string;
  font_size: number;
  orientation: "landscape" | "portrait";
  visible_fields: string[];
  logo_size: number;
  profile_size: number;
  qr_size: number;
  back_name: string;
  back_company: string;
  back_title: string;
  back_phone: string;
  back_company_phone: string;
  back_fax: string;
  back_email: string;
  back_address: string;
  back_template_id: number;
  back_fields: string[];
  back_bg_color: string;
  back_accent_color: string;
  back_font_color: string;
  back_font_type: string;
  back_font_size: number;
  back_orientation: "landscape" | "portrait";
  qr_code_url: string | null;
}

const PUBLIC_COLUMNS =
  "id, name, company, title, phone, company_phone, fax, email, address, " +
  "profile_image_url, logo_image_url, bg_image_url, back_bg_image_url, " +
  "template_id, bg_color, accent_color, font_color, font_type, font_size, " +
  "orientation, visible_fields, logo_size, profile_size, qr_size, " +
  "back_name, back_company, back_title, back_phone, back_company_phone, back_fax, " +
  "back_email, back_address, back_template_id, back_fields, back_bg_color, " +
  "back_accent_color, back_font_color, back_font_type, back_font_size, back_orientation, " +
  "qr_code_url";

export async function getPublicMyCard(id: string): Promise<PublicMyCard | null> {
  const supabase = getCardlogueSupabase();
  const { data, error } = await supabase.from("my_cards").select(PUBLIC_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as PublicMyCard) ?? null;
}

// Served as a real file over HTTP (not a client-side blob: URL) so "save
// contact" works the same everywhere — iOS Safari opens its native
// add-contact sheet straight off a text/vcard response, and Android/other
// browsers download it as a normal file instead of silently no-op'ing the
// way blob: downloads do inside some in-app browsers.
export function buildVCard(card: PublicMyCard): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${card.name}`,
    card.company ? `ORG:${card.company}` : "",
    card.title ? `TITLE:${card.title}` : "",
    card.phone ? `TEL;TYPE=CELL:${card.phone}` : "",
    card.company_phone ? `TEL;TYPE=WORK:${card.company_phone}` : "",
    card.fax ? `TEL;TYPE=FAX:${card.fax}` : "",
    card.email ? `EMAIL:${card.email}` : "",
    card.address ? `ADR;TYPE=WORK:;;${card.address};;;;` : "",
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\r\n");
}
