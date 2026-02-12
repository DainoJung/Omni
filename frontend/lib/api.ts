import type {
  Project,
  ProjectCreate,
  ProjectUpdate,
  GenerateRequest,
  GenerateResponse,
  Theme,
  PageType,
  ListResponse,
  ErrorResponse,
  BackgroundConfig,
  RestaurantInput,
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
  generate: (data: GenerateRequest) =>
    request<GenerateResponse>("/api/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// === Themes ===
export const themesApi = {
  list: () => request<Theme[]>("/api/themes"),
};

// === Page Types ===
export const pageTypesApi = {
  list: () => request<PageType[]>("/api/page-types"),
};

// === Sections ===
export const sectionsApi = {
  updateData: (
    projectId: string,
    sectionId: string,
    data: Record<string, string>,
    styleOverrides?: Record<string, Record<string, string>>
  ) =>
    request<Project>(
      `/api/projects/${projectId}/sections/${sectionId}/data`,
      {
        method: "PUT",
        body: JSON.stringify({
          data,
          ...(styleOverrides !== undefined && { style_overrides: styleOverrides }),
        }),
      }
    ),

  regenerateImage: (projectId: string, sectionId: string, prompt: string) =>
    request<Project>(
      `/api/projects/${projectId}/sections/${sectionId}/regenerate-image`,
      {
        method: "POST",
        body: JSON.stringify({ prompt }),
      }
    ),
};

// === Background ===
export const backgroundApi = {
  generate: (projectId: string, prompt: string, sectionType?: string, width?: number, height?: number) =>
    request<{ image_url: string }>(`/api/projects/${projectId}/generate-background`, {
      method: "POST",
      body: JSON.stringify({ prompt, section_type: sectionType, width, height }),
    }),
};

// === Auth ===
export const authApi = {
  login: async (id: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password }),
    });
    return response.json() as Promise<{
      success: boolean;
      token?: string;
      message?: string;
    }>;
  },

  verify: async (token: string) => {
    const response = await fetch(`${API_URL}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    return response.json() as Promise<{ valid: boolean }>;
  },

  logout: async (token: string) => {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  },
};

// === Images ===
export const imagesApi = {
  removeBackground: async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("file", file);

    const response = await fetch(`${API_URL}/api/images/remove-bg`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: "BG_REMOVE_ERROR",
        message: "배경 제거에 실패했습니다.",
      }));
      throw new ApiError(response.status, errorData);
    }

    return response.json() as Promise<{ url: string }>;
  },

  listProjectImages: async (projectId: string, imageType?: string) => {
    const params = imageType ? `?image_type=${imageType}` : "";
    return request<{
      images: Array<{
        id: string;
        url: string;
        image_type: string;
        created_at: string;
      }>;
    }>(`/api/images/project/${projectId}${params}`);
  },
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
