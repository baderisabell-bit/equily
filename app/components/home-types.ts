export type HomePerson = {
  id: number;
  vorname: string;
  nachname: string;
  role: string;
  verifiziert?: boolean;
  display_name?: string | null;
  ort?: string | null;
  nearby_reason?: string | null;
  rating_avg?: number;
  rating_count?: number;
  homepage_promoted?: boolean;
};

export type WeeklyAdItem = {
  id: number;
  vorname: string;
  nachname: string;
  verifiziert?: boolean;
  display_name?: string | null;
  ort?: string | null;
  label?: string | null;
  teaser?: string | null;
  ends_at?: string | null;
};

export type ManagedAdItem = {
  id: number;
  title: string;
  description?: string | null;
  media_url: string;
  target_url?: string | null;
  placement_slot: 'none' | 'startseite_top' | 'startseite_sidebar';
  placement_order: number;
  visible_from?: string | null;
  visible_until?: string | null;
  vorname: string;
  nachname: string;
  verifiziert?: boolean;
  display_name?: string | null;
};

export type WelfareCase = {
  id: number;
  accused_user_id: number;
  title: string;
  description: string;
  video_url: string | null;
  accused_statement: string | null;
  status: 'voting' | 'suspended' | 'cleared';
  vote_end_at: string;
  public_note: string | null;
  accused_vorname: string;
  accused_nachname: string;
  yes_count: number;
  no_count: number;
  voted_by_viewer: boolean;
};
