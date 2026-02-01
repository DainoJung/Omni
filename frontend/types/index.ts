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

// === Section (v5.2 HTML Template) ===
export type SectionType =
  | "hero_banner"
  | "feature_badges"
  | "description"
  | "feature_point";

export interface RenderedSection {
  section_id: string;
  section_type: SectionType;
  order: number;
  template_id: string;
  html_template: string;
  css: string;
  data: Record<string, string>;
  style_overrides?: Record<string, Record<string, string>>;
}

// === Project ===
export type ProjectStatus =
  | "draft"
  | "generating"
  | "completed"
  | "failed";

export interface Project {
  id: string;
  status: ProjectStatus;
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
}

export interface ProjectCreate {
  products: ProductInput[];
  theme: string;
  selected_sections?: SectionType[];
}

export interface ProjectUpdate {
  status?: ProjectStatus;
  rendered_sections?: RenderedSection[];
  generated_data?: Record<string, unknown>;
}

// === Product ===
export interface ProductInput {
  name: string;
  price: string;
  image_id?: string;
  image_url?: string;
}

// === Generate ===
export interface GenerateRequest {
  project_id: string;
  products: ProductInput[];
  theme: string;
}

export interface GenerateResponse {
  project_id: string;
  template_used: string;
  theme: string;
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
