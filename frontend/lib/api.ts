import type {
  Project,
  ProjectCreate,
  ProjectUpdate,
  GenerateRequest,
  GenerateResponse,
  GenerateV2Request,
  GenerateV2Response,
  AnalysisResponse,
  TemplateStyleInfo,
  ListResponse,
  ErrorResponse,
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

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("auth_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options?.headers,
    },
    ...options,
  });

  if (response.status === 401) {
    // Token expired or invalid - clear and redirect
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/login";
    }
    throw new ApiError(401, { error: "UNAUTHORIZED", message: "인증이 만료되었습니다." });
  }

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

  generateV2: (data: GenerateV2Request) =>
    request<GenerateV2Response>("/api/generate/v2", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// === Product Analysis ===
export const productAnalysisApi = {
  searchByName: (name: string, language: string = "ko") =>
    request<AnalysisResponse>("/api/analyze/search", {
      method: "POST",
      body: JSON.stringify({ name, language }),
    }),

  analyzeUrl: (url: string, language: string = "ko") =>
    request<AnalysisResponse>("/api/analyze/url", {
      method: "POST",
      body: JSON.stringify({ url, language }),
    }),

  analyzeManual: (data: {
    name: string;
    description?: string;
    brand?: string;
    price?: string;
    images?: string[];
    language?: string;
  }) =>
    request<AnalysisResponse>("/api/analyze/manual", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// === Template Catalog ===
export const templateCatalogApi = {
  list: () => request<TemplateStyleInfo[]>("/api/templates/catalog"),

  get: (styleId: string) =>
    request<TemplateStyleInfo>(`/api/templates/catalog/${styleId}`),
};

// === Themes (deprecated — SSG-only, kept for backward compat) ===
// export const themesApi = { list: () => request<Theme[]>("/api/themes") };

// === Page Types (deprecated — SSG-only, kept for backward compat) ===
// export const pageTypesApi = { list: () => request<PageType[]>("/api/page-types") };

// === Sections ===
export const sectionsApi = {
  updateData: (
    projectId: string,
    sectionId: string,
    data: Record<string, string | null>,
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

  regenerateImage: (projectId: string, sectionId: string, prompt: string, placeholderId?: string) =>
    request<Project>(
      `/api/projects/${projectId}/sections/${sectionId}/regenerate-image`,
      {
        method: "POST",
        body: JSON.stringify({ prompt, ...(placeholderId && { placeholder_id: placeholderId }) }),
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
      user?: { id: string; username: string; display_name?: string; is_admin: boolean };
    }>;
  },

  verify: async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return { valid: false };
    const response = await fetch(`${API_URL}/api/auth/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return { valid: false };
    return response.json() as Promise<{
      valid: boolean;
      user?: { id: string; username: string; is_admin: boolean };
    }>;
  },

  logout: async () => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    }
  },

  register: async (email: string, username: string, password: string, display_name?: string) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password, display_name }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: "REGISTER_ERROR",
        message: "회원가입에 실패했습니다.",
      }));
      throw new ApiError(response.status, errorData);
    }
    return response.json() as Promise<{
      success: boolean;
      token?: string;
      message?: string;
      user?: { id: string; username: string; display_name?: string; is_admin: boolean; email?: string; plan?: string };
    }>;
  },

  // Admin: user management
  createUser: (data: { username: string; password: string; display_name?: string; is_admin?: boolean }) =>
    request<{ id: string; username: string; display_name?: string; is_admin: boolean; created_at: string }>(
      "/api/auth/users",
      { method: "POST", body: JSON.stringify(data) }
    ),

  listUsers: () =>
    request<Array<{ id: string; username: string; display_name?: string; is_admin: boolean; created_at: string }>>(
      "/api/auth/users"
    ),

  deleteUser: (userId: string) =>
    request<void>(`/api/auth/users/${userId}`, { method: "DELETE" }),
};

// === Users ===
export const usersApi = {
  getProfile: () =>
    request<{
      id: string;
      username: string;
      email?: string;
      display_name?: string;
      is_admin: boolean;
      plan: string;
      credits_remaining: number;
      created_at: string;
    }>("/api/users/me"),

  updateProfile: (data: { display_name?: string; email?: string }) =>
    request<{
      id: string;
      username: string;
      email?: string;
      display_name?: string;
      is_admin: boolean;
      plan: string;
      credits_remaining: number;
      created_at: string;
    }>("/api/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getUsage: () =>
    request<{
      plan: string;
      credits_remaining: number;
      credits_used: number;
      total_projects: number;
    }>("/api/users/me/usage"),
};

// === Images ===
export const imagesApi = {
  removeBackground: async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("file", file);

    const response = await fetch(`${API_URL}/api/images/remove-bg`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
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
    imageType: string = "input",
    sortOrder: number = 0
  ) => {
    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("image_type", imageType);
    formData.append("sort_order", String(sortOrder));
    formData.append("file", file);

    const response = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
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
