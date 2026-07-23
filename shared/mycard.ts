// Mirrors Cardlogue's types/mycard.ts MyCard — the fields returned by
// GET /api/cardlogue/card/:id (server/mycard.ts PublicMyCard, minus the
// account-identifying columns that endpoint already strips). Kept in sync
// by hand since it lives in a different repo.
export interface MyCard {
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
