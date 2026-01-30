import type {
  Project,
  ProjectCreate,
  ProjectUpdate,
  LayoutGenerateResponse,
  ListResponse,
  ErrorResponse,
  ProductInput,
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

// === Generate ===
export const generateApi = {
  generateLayout: (
    projectId: string,
    products: ProductInput[],
    brandName?: string,
    category?: string
  ) =>
    request<LayoutGenerateResponse>("/api/generate/layout", {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        products,
        brand_name: brandName || undefined,
        category: category || undefined,
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
