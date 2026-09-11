export type GenerationStatus = "idle" | "loading" | "success" | "error";
export type OutputType = "background" | "poster" | "banner" | "media_pack";
export type AssetFormat = "1:1" | "16:9";

export interface Project {
  id: string;
  name: string;
  description: string;
  last_generation_at?: string;
}

export interface Brandbook {
  project_id: string;
  brand_name: string;
  light_logo_url?: string;
  dark_logo_url?: string;
  light_logo_path?: string;
  dark_logo_path?: string;
  primary_color: string;
  text_color: string;
  overlay_color: string;
  overlay_opacity: number;
  heading_font: string;
  body_font: string;
}

export interface GenerationRequest {
  project_id: string;
  source_type: "text" | "url";
  source: string;
  output_type: OutputType;
  language: string;
  image_style: string;
  additional_instructions?: string;
  campaign_name?: string;
}

export interface GenerationResult {
  id: string;
  project_id: string;
  status: "draft" | "approved" | "failed";
  title: string;
  key_points: string[];
  telegram_post: string;
  instagram_post: string;
  linkedin_post: string;
  background_url?: string;
  poster_square_url?: string;
  banner_wide_url?: string;
  cost: number;
  api_calls: number;
  created_at: string;
}

export interface AssetUpdatePayload {
  asset_id: string;
  title: string;
  additional_text?: string;
  text_color: string;
  font: string;
  font_size: number;
  text_align: "left" | "center" | "right";
  logo_position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  logo_scale: number;
  overlay_opacity: number;
  background_scale: number;
  format: AssetFormat;
}

export interface HistoryItem {
  id: string;
  project_id: string;
  created_at: string;
  source: string;
  output_type: OutputType;
  preview_url?: string;
  cost: number;
  status: "draft" | "approved" | "failed";
}

export interface AuthResponse {
  ok?: boolean;
  access_token?: string;
  token_type?: string;
  confirmationRequired?: boolean;
}
