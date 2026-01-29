// === Project ===
export type ProjectStatus =
  | "draft"
  | "generating"
  | "editing"
  | "completed"
  | "failed";

export interface Project {
  id: string;
  status: ProjectStatus;
  brand_name: string;
  description: string;
  category?: string;
  event_period_start?: string;
  event_period_end?: string;
  price_info?: string;
  template_id?: string;
  color_preset_id?: string;
  tone_manner?: ToneManner;
  generated_content?: GeneratedContent;
  edit_history?: EditHistoryEntry[];
  output_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  brand_name: string;
  description: string;
  category?: string;
  event_period_start?: string;
  event_period_end?: string;
  price_info?: string;
}

export interface ProjectUpdate {
  template_id?: string;
  color_preset_id?: string;
  tone_manner?: ToneManner;
  generated_content?: GeneratedContent;
  edit_history?: EditHistoryEntry[];
  status?: ProjectStatus;
  brand_name?: string;
  description?: string;
}

// === Template ===
export interface Template {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  thumbnail_url?: string;
  structure: TemplateSection[];
  styles: TemplateStyles;
  is_active: boolean;
}

export interface TemplateSection {
  id: string;
  type: string;
  position: { y: number; height: number };
  elements: TemplateElement[];
  grid?: { columns: number; gap: number; padding: number };
}

export interface TemplateElement {
  type: string;
  id: string;
  editable: boolean;
  position?: { x: number; y: number; w?: number; h?: number };
  value?: string;
}

export interface TemplateStyles {
  background_color: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  divider_color: string;
  font_family_title: string;
  font_family_body: string;
  font_sizes: Record<string, number>;
  letter_spacing?: Record<string, string>;
}

// === Generate ===
export interface GeneratedContent {
  texts: GeneratedTexts;
  images: GeneratedImages;
  generated_at: string;
}

export interface GeneratedTexts {
  main_copy: string;
  sub_copy: string;
  body_texts: string[];
  product_descriptions: ProductDescription[];
  cta_text: string;
  hashtags: string[];
  benefits?: string[];
}

export interface ProductDescription {
  name: string;
  desc: string;
}

export interface GeneratedImages {
  banner?: string;
  background?: string;
  products: string[];
}

export interface GenerateResult {
  project_id: string;
  texts: GeneratedTexts;
  images: GeneratedImages;
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

// === Color Presets ===
export interface ColorPreset {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  category: string;
  created_at: string;
}

// === Tone & Manner ===
export interface ToneManner {
  style: string;
  mood: string;
  description: string;
  keywords: string[];
}

export interface ToneMannerRequest {
  brand_name: string;
  category?: string;
  product_name?: string;
  color_preset_id?: string;
}

export interface ToneMannerResponse {
  recommendations: ToneManner[];
}
