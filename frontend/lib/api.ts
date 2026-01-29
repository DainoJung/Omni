import type {
  Project,
  ProjectCreate,
  ProjectUpdate,
  Template,
  GenerateResult,
  ListResponse,
  ErrorResponse,
  ColorPreset,
  ToneMannerRequest,
  ToneMannerResponse,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, data: ErrorResponse) {
    super(data.message || "알 수 없는 오류가 발생했습니다.");
    this.status = status;
    this.code = data.error || "UNKNOWN_ERROR";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: "NETWORK_ERROR",
      message: "서버에 연결할 수 없습니다.",
    }));
    throw new ApiError(response.status, errorData);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// === Projects ===
export const projectsApi = {
  create: (data: ProjectCreate) =>
    request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  list: () => request<ListResponse<Project>>("/api/projects"),

  get: (id: string) => request<Project>(`/api/projects/${id}`),

  update: (id: string, data: ProjectUpdate) =>
    request<Project>(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/projects/${id}`, { method: "DELETE" }),
};

// === Templates ===
export const templatesApi = {
  list: (category?: string) => {
    const query = category ? `?category=${category}` : "";
    return request<ListResponse<Template>>(`/api/templates${query}`);
  },

  get: (id: string) => request<Template>(`/api/templates/${id}`),
};

// === Colors ===
export const colorsApi = {
  list: () => request<ListResponse<ColorPreset>>("/api/colors"),

  get: (id: string) => request<ColorPreset>(`/api/colors/${id}`),
};

// === Tone & Manner ===
export const toneMannerApi = {
  recommend: (data: ToneMannerRequest) =>
    request<ToneMannerResponse>("/api/tone-manner/recommend", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// === Generate ===
export const generateApi = {
  generate: (
    projectId: string,
    templateId: string,
    colorPresetId?: string,
    toneManner?: Record<string, unknown>
  ) =>
    request<GenerateResult>("/api/generate", {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        template_id: templateId,
        color_preset_id: colorPresetId || undefined,
        tone_manner: toneManner || undefined,
      }),
    }),
};

// === Upload ===
export const uploadApi = {
  uploadImage: async (
    projectId: string,
    file: File,
    imageType: string = "input"
  ) => {
    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("image_type", imageType);
    formData.append("file", file);

    const response = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: "UPLOAD_ERROR",
        message: "파일 업로드에 실패했습니다.",
      }));
      throw new ApiError(response.status, errorData);
    }

    return response.json();
  },
};
