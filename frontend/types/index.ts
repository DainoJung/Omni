// === Theme ===
export interface Theme {
  id: string;
  name: string;
  icon?: string;
  accent_color?: string;
  background_prompt: string;
  copy_keywords?: string[];
  is_active?: boolean;
}

// === Page Type ===
export interface PageType {
  id: string;
  name: string;
  icon: string;
  description: string;
  min_products?: number;
  max_products?: number;
  min_restaurants?: number;
  max_restaurants?: number;
  foods_per_restaurant?: number;
  requires_price: boolean;
  requires_brand?: boolean;
  accent_color: string;
  catalog_bg_color: string;
  background_prompt: string;
  copy_keywords: string[];
}

// === Section (v5.2 HTML Template) ===
export type SectionType =
  | "hero_banner"
  | "feature_badges"
  | "description"
  | "feature_point"
  | "promo_hero"
  | "product_card"
  | "fit_hero"
  | "fit_event_info"
  | "fit_product_trio"
  | "vip_special_hero"
  | "vip_private_hero"
  | "gourmet_hero"
  | "gourmet_restaurant"
  | "gourmet_wine_intro"
  | "gourmet_wine"
  | "shinsegae_hero";

export interface RenderedSection {
  section_id: string;
  section_type: SectionType;
  order: number;
  template_id: string;
  html_template: string;
  css: string;
  data: Record<string, string | null>;
  style_overrides?: Record<string, Record<string, string>>;
}

// === Project ===
export interface Project {
  id: string;
  brand_name?: string;
  theme_id?: string;
  template_used?: string;
  products?: ProductInput[];
  selected_sections?: SectionType[];
  rendered_sections?: RenderedSection[];
  generated_data?: GeneratedData;
  input_data?: Record<string, unknown>;
  pipeline_result?: Record<string, unknown>;
  output_url?: string;
  background_config?: BackgroundConfig;
  restaurants?: RestaurantInput[];
  created_at: string;
  updated_at: string;
}

export interface GeneratedData {
  section_texts?: Record<string, string>;
  section_image_urls?: Record<string, string>;
  image_prompts?: Record<string, string>;
  hero_background_url?: string;
  theme: Theme;
  template_used?: string;
  generated_at: string;
  user_input_points?: string;
  selling_points?: string;
  target_audience?: string;
  style?: string;
  tone?: string;
}

export interface ProjectCreate {
  products: ProductInput[];
  page_type: string;
  selected_sections?: string[];
  background?: BackgroundConfig;
  restaurants?: RestaurantInput[];
  include_wine?: boolean;
  wines?: WineInput[];
}

export interface ProjectUpdate {
  rendered_sections?: RenderedSection[];
  generated_data?: Record<string, unknown>;
  restaurants?: RestaurantInput[];
  background_config?: BackgroundConfig;
}

// === Product ===
export interface ProductInput {
  name: string;
  price?: string;
  brand_name?: string;
  image_id?: string;
  image_url?: string;
}

// === Background ===
export interface BackgroundConfig {
  mode: "solid" | "ai";
  hex_color: string;
  ai_prompt?: string;
}

// === Gourmet ===
export interface FoodInput {
  name: string;
  image_id?: string;
}

export interface RestaurantInput {
  name: string;
  food1: FoodInput;
  food2: FoodInput;
}

export interface WineInput {
  name: string;
  image_id?: string;
  image_url?: string;
}

// === Generate ===
export interface GenerateRequest {
  project_id: string;
  products: ProductInput[];
  page_type: string;
  background?: BackgroundConfig;
  restaurants?: RestaurantInput[];
  include_wine?: boolean;
  wines?: WineInput[];
}

export interface GenerateResponse {
  project_id: string;
  template_used: string;
  page_type: string;
  rendered_sections: RenderedSection[];
  generated_at: string;
}

// === Edit ===
export interface EditHistoryEntry {
  timestamp: string;
  type: "text_edit" | "image_replace" | "ai_regenerate";
  field: string;
  old_value: string;
  new_value: string;
}

// === Upload ===
export interface UploadResult {
  file_id: string;
  storage_path: string;
  public_url: string;
  original_filename: string;
  file_size_bytes: number;
  content_type: string;
}

// === API ===
export interface ListResponse<T> {
  items: T[];
  total: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  detail?: string;
}
