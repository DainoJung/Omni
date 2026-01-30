// === Project ===
export type ProjectStatus =
  | "draft"
  | "generating"
  | "completed"
  | "failed";

export interface Project {
  id: string;
  status: ProjectStatus;
  brand_name: string;
  description?: string;
  category?: string;
  products?: ProductInput[];
  input_data?: Record<string, unknown>;
  pipeline_result?: PipelineResult;
  output_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  brand_name: string;
  description?: string;
  category?: string;
  products?: ProductInput[];
}

export interface ProjectUpdate {
  pipeline_result?: PipelineResult;
  status?: ProjectStatus;
  brand_name?: string;
  description?: string;
}

// === Product ===
export interface ProductInput {
  name: string;
  price: string;
  description?: string;
  image_id?: string;
  image_url?: string;
}

// === Layout & Text Areas ===
export interface TextAreaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextArea {
  id: string;
  position: number;
  bounds: TextAreaBounds;
  background_brightness?: string;
  recommended_font_color: string;
  max_font_size?: number;
  suitable_for: "headline" | "subtext" | "label" | "description";
}

// === Multi-Section Types ===
export interface SectionPlan {
  section_key: string;
  title: string;
  description: string;
  product_indices: number[];
  order: number;
}

export interface SectionResult {
  section_key: string;
  order: number;
  layout_image_url: string;
  text_areas: TextArea[];
  aspect_ratio: string;
}

export interface PipelineResult {
  sections: SectionResult[];
  page_plan: SectionPlan[];
  generated_at: string;
}

export interface LayoutGenerateResponse {
  project_id: string;
  sections: SectionResult[];
  page_plan: SectionPlan[];
  products: ProductInput[];
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
