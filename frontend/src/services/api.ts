import axios from "axios";
import type { ScanJob, Shipment, User, Operator, Manager } from "@/types";

// Use same-origin /api/v1 so Vite proxy (dev) or nginx (prod) forwards to backend. Avoids CORS and "connection refused" in browser.
const API_URL = "/api/v1";

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
      console.error("❌ Cannot connect to backend. Is it running on http://localhost:8000?");
      error.message = "Cannot connect to server. Please ensure the backend is running on http://localhost:8000";
    }

    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      console.warn("401 Unauthorized - Token expired or invalid");
      const token = localStorage.getItem("token");
      if (token) {
        console.log("Removing expired token and redirecting to login");
        localStorage.removeItem("token");
        // Redirect to login page
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
      error.message = "Your session has expired. Please login again.";
    }

    // Log 404 with URL so we can see which endpoint is missing
    if (error.response?.status === 404) {
      const url = error.config?.url != null ? `${error.config.baseURL ?? ""}${error.config.url}` : "unknown";
      console.error("404 Not found:", error.config?.method?.toUpperCase(), url);
      const isLogin = typeof url === "string" && url.includes("login/access-token");
      error.message = isLogin
        ? "Login endpoint not reachable. Start the backend from the backend folder: .\\run_backend.bat (must run on port 8000)."
        : (error.response?.data?.detail ?? `Not found: ${url}`);
    }

    // Show backend error detail for 500 so user sees e.g. database or JWT errors
    if (error.response?.status === 500) {
      const detail = error.response?.data?.detail;
      error.message = typeof detail === "string" ? detail : "Server error. Check backend terminal for details.";
    }

    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    const params = new URLSearchParams();
    params.append("username", credentials.email.trim().toLowerCase());
    params.append("password", credentials.password);
    const response = await api.post("/login/access-token", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data;
  },
  me: async (): Promise<User> => {
    const response = await api.get<User>("/login/me");
    return response.data;
  },
  updateProfile: async (data: { full_name?: string; phone?: string }) => {
    const response = await api.patch<User>("/login/me", data);
    return response.data;
  },
  getManagers: async (): Promise<{ id: number; full_name?: string; email: string }[]> => {
    const response = await api.get("/login/managers");
    return response.data;
  },
  signup: async (data: any) => {
    const response = await api.post("/login/signup", data);
    return response.data;
  },
};

export const operatorService = {
  list: async (): Promise<Operator[]> => {
    const response = await api.get<Operator[]>("/login/operators");
    return response.data;
  },
  create: async (data: { full_name: string; email: string; phone?: string; password: string }) => {
    const response = await api.post<Operator>("/login/operators", data);
    return response.data;
  },
  setPassword: async (operatorId: number, newPassword: string) => {
    await api.post(`/login/operators/${operatorId}/set-password`, { new_password: newPassword });
  },
  delete: async (operatorId: number) => {
    await api.delete(`/login/operators/${operatorId}`);
  },
};

export const managerService = {
  list: async (): Promise<Manager[]> => {
    const response = await api.get<Manager[]>("/login/managers/full");
    return response.data;
  },
  create: async (data: { full_name: string; email: string; phone?: string; password: string }) => {
    const response = await api.post<Manager>("/login/managers", data);
    return response.data;
  },
  setPassword: async (managerId: number, newPassword: string) => {
    await api.post(`/login/managers/${managerId}/set-password`, { new_password: newPassword });
  },
  delete: async (managerId: number) => {
    await api.delete(`/login/managers/${managerId}`);
  },
};

export const scanService = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<ScanJob>("/scan/extract", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  getJob: async (jobId: string) => {
    const response = await api.get<ScanJob>(`/scan/jobs/${jobId}`);
    return response.data;
  },
};

// --- helpers (put above shipmentService) ---
function getFilenameFromDisposition(disposition?: string): string | null {
  if (!disposition) return null;

  // RFC 5987: filename*=UTF-8''...
  const rfc5987 = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (rfc5987?.[1]) {
    try {
      return decodeURIComponent(rfc5987[1].trim());
    } catch {
      // ignore
    }
  }

  // filename="..."
  const normal = disposition.match(/filename\s*=\s*("([^"]+)"|([^;]+))/i);
  if (normal) {
    const raw = (normal[2] || normal[3] || "").trim();
    return raw || null;
  }

  return null;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

function ensureExt(name: string, ext: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(ext)) return name;
  // strip any extension and add correct
  return name.replace(/\.[^.]*$/, "") + ext;
}

// Convert blob to File so browser PDF/Excel download doesn't become UUID
function toNamedFile(blob: Blob, filename: string, mime: string): File {
  const typedBlob = blob.type && blob.type !== "" ? blob : new Blob([blob], { type: mime });
  return new File([typedBlob], filename, { type: mime });
}

// --- shipmentService ---
export const shipmentService = {
  create: async (data: any) => {
    const response = await api.post<Shipment>("/shipments/", data);
    return response.data;
  },

  getAll: async (params?: { search?: string; my_only?: boolean; limit?: number }) => {
    const response = await api.get<Shipment[]>("/shipments/", { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Shipment>(`/shipments/${id}`);
    return response.data;
  },

  downloadBulkPdf: async (
    ids: string[],
    copy: "all" | "booking" | "pod" | "office" = "all"
  ) => {
    const res = await api.post("/shipments/bulk/pdf", { ids, copy }, { responseType: "blob" });
    const disposition =
      (res.headers?.["content-disposition"] as string) ||
      (res.headers?.["Content-Disposition"] as string) ||
      "";
    const headerName = getFilenameFromDisposition(disposition);
    const finalName = headerName || "lr_bulk.zip";
    const file = toNamedFile(res.data as Blob, finalName, "application/zip");
    return { blob: file, filename: finalName };
  },

  downloadPdf: async (
    id: string,
    copy: "all" | "booking" | "pod" | "office" = "all"
  ) => {
    const res = await api.get(`/shipments/${id}/pdf`, {
      params: { copy },
      responseType: "blob",
    });

    const disposition =
      (res.headers?.["content-disposition"] as string) ||
      (res.headers?.["Content-Disposition"] as string) ||
      "";

    const headerName = getFilenameFromDisposition(disposition);
    const fallbackBase = `shipment_${id}_${copy}`;
    const finalName = ensureExt(sanitizeFilename(headerName || fallbackBase), ".pdf");

    const file = toNamedFile(res.data as Blob, finalName, "application/pdf");

    // Return BOTH: file (for preview url) and blob (for download)
    return { blob: file, filename: finalName };
  },

  /** Send LR PDF directly to the default printer (backend must run on the PC connected to the printer). */
  printDirect: async (
    id: string,
    copy: "all" | "booking" | "pod" | "office" = "all"
  ): Promise<{ ok: boolean; message: string }> => {
    const res = await api.post<{ ok: boolean; message: string }>(
      `/shipments/${id}/print-direct`,
      undefined,
      { params: { copy } }
    );
    return res.data;
  },

  uploadPod: async (id: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const response = await api.post<Shipment>(`/shipments/${id}/pod`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  downloadPod: async (id: string) => {
    const res = await api.get(`/shipments/${id}/pod/download`, {
      responseType: "blob",
    });

    // Get content type from response headers
    const contentType = res.headers?.["content-type"] || res.headers?.["Content-Type"] || "application/pdf";
    console.log("POD Content-Type:", contentType);

    const disposition =
      (res.headers?.["content-disposition"] as string) ||
      (res.headers?.["Content-Disposition"] as string) ||
      "";

    const headerName = getFilenameFromDisposition(disposition);
    const fallbackBase = `pod_${id}`;

    // Determine extension based on content type
    let extension = ".pdf";
    if (contentType.includes("png")) extension = ".png";
    else if (contentType.includes("jpeg") || contentType.includes("jpg")) extension = ".jpg";
    else if (contentType.includes("gif")) extension = ".gif";

    // Use filename from header if available, otherwise use fallback with correct extension
    let finalName = headerName || fallbackBase;
    if (!finalName.toLowerCase().endsWith(extension)) {
      // Remove any existing extension and add correct one
      finalName = finalName.replace(/\.[^.]*$/, "") + extension;
    }

    const file = toNamedFile(res.data as Blob, finalName, contentType);

    return { blob: file, filename: finalName };
  },

  downloadAllPods: async (id: string) => {
    const res = await api.get(`/shipments/${id}/pod/download-all`, {
      responseType: "blob",
    });

    const disposition =
      (res.headers?.["content-disposition"] as string) ||
      (res.headers?.["Content-Disposition"] as string) ||
      "";

    const headerName = getFilenameFromDisposition(disposition);
    const fallbackBase = `pods_${id}`;
    const finalName = ensureExt(sanitizeFilename(headerName || fallbackBase), ".zip");

    const file = toNamedFile(res.data as Blob, finalName, "application/zip");

    return { blob: file, filename: finalName };
  },

  update: async (id: string, data: any) => {
    const response = await api.put<Shipment>(`/shipments/${id}`, data);
    return response.data;
  },

  exportExcel: async (myOnly = false, params?: { period?: string; year?: number; month?: number }) => {
    const query: Record<string, string | number | boolean> = myOnly ? { my_only: true } : {};
    if (params?.period) query.period = params.period;
    if (params?.year != null) query.year = params.year;
    if (params?.month != null) query.month = params.month;
    const res = await api.get("/shipments/export/excel", {
      params: Object.keys(query).length ? query : undefined,
      responseType: "blob",
    });

    const disposition =
      (res.headers?.["content-disposition"] as string) ||
      (res.headers?.["Content-Disposition"] as string) ||
      "";

    const headerName = getFilenameFromDisposition(disposition);
    const fallbackBase = myOnly ? "my_shipments_export" : "shipments_export";
    const finalName = ensureExt(sanitizeFilename(headerName || fallbackBase), ".xlsx");

    const mime =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const file = toNamedFile(res.data as Blob, finalName, mime);

    return { blob: file, filename: finalName };
  },

  exportCsv: async (myOnly = false, params?: { period?: string; year?: number; month?: number }) => {
    const query: Record<string, string | number | boolean> = myOnly ? { my_only: true } : {};
    if (params?.period) query.period = params.period;
    if (params?.year != null) query.year = params.year;
    if (params?.month != null) query.month = params.month;
    const res = await api.get("/shipments/export/csv", {
      params: Object.keys(query).length ? query : undefined,
      responseType: "blob",
    });

    const disposition =
      (res.headers?.["content-disposition"] as string) ||
      (res.headers?.["Content-Disposition"] as string) ||
      "";

    const headerName = getFilenameFromDisposition(disposition);
    const fallbackBase = myOnly ? "my_shipments_export" : "shipments_export";
    const finalName = ensureExt(sanitizeFilename(headerName || fallbackBase), ".csv");

    const file = toNamedFile(res.data as Blob, finalName, "text/csv");

    return { blob: file, filename: finalName };
  },
};
