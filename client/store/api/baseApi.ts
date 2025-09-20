import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { logout } from "../slices/authSlice";
import { createRobustFetch, logFetchDebugInfo } from "../../utils/fetchDebug";

// Preserve original fetch before any third-party libraries can override it
if (
  typeof globalThis !== "undefined" &&
  globalThis.fetch &&
  !(globalThis as any).__originalFetch
) {
  (globalThis as any).__originalFetch = globalThis.fetch;
}
if (
  typeof window !== "undefined" &&
  window.fetch &&
  !(globalThis as any).__originalFetch
) {
  (globalThis as any).__originalFetch = window.fetch;
}

// Log fetch environment info for debugging
if (process.env.NODE_ENV === "development") {
  logFetchDebugInfo();
}

// Note: Using completely custom fetch implementation below to avoid RTK Query response body conflicts

// Completely custom base query to avoid all RTK Query response body conflicts
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Build URL and options
  const url = typeof args === "string" ? args : args.url;

  let body: string | FormData | undefined = undefined;
  let contentType = "application/json";

  // Handle different body types with comprehensive logic
  if (
    typeof args !== "string" &&
    args.body !== undefined &&
    args.body !== null
  ) {
    // Check for FormData first (most specific)
    if (args.body instanceof FormData) {
      body = args.body;
      contentType = ""; // Let browser set multipart/form-data boundary
    }
    // Check if it's already a JSON string
    else if (typeof args.body === "string") {
      // Check if it looks like JSON or if it's already serialized
      if (
        args.body.startsWith("{") ||
        args.body.startsWith("[") ||
        args.body === "null"
      ) {
        body = args.body; // Already JSON
      } else {
        // Non-JSON string, wrap it
        body = JSON.stringify(args.body);
      }
    }
    // Handle all object types (including arrays, dates, etc.)
    else if (typeof args.body === "object") {
      // Safety check for circular references and ensure it's serializable
      try {
        // Deep clone to avoid any reference issues and ensure clean serialization
        const cleanBody = JSON.parse(JSON.stringify(args.body));
        body = JSON.stringify(cleanBody);
      } catch (error) {
        // Fallback for objects that can't be serialized
        console.warn("Failed to serialize request body:", error);
        body = JSON.stringify({ error: "Failed to serialize request data" });
      }
    }
    // Handle primitives (numbers, booleans)
    else {
      body = JSON.stringify(args.body);
    }
  }

  // Build request options carefully with timeout
  const baseOptions: RequestInit = {
    method: typeof args === "string" ? "GET" : args.method || "GET",
    headers: typeof args === "string" ? {} : args.headers || {},
    signal: AbortSignal.timeout(15000), // 15 second timeout
  };

  // Only add body for methods that support it
  const methodsWithBody = ["POST", "PUT", "PATCH", "DELETE"];
  if (
    body !== undefined &&
    methodsWithBody.includes(baseOptions.method!.toUpperCase())
  ) {
    baseOptions.body = body;
  }

  const options: RequestInit = baseOptions;

  // Set headers: always set content-type for JSON; add authorization if token exists
  try {
    const state = api.getState() as any;
    const token = state?.auth?.token || localStorage.getItem("token");

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only add content-type for JSON requests (not FormData)
    if (contentType && !("content-type" in headers)) {
      headers["content-type"] = contentType;
    }

    if (token) {
      headers["authorization"] = `Bearer ${token}`;
    }

    options.headers = headers;
  } catch (error) {
    const token = localStorage.getItem("token");

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only add content-type for JSON requests (not FormData)
    if (contentType && !("content-type" in headers)) {
      headers["content-type"] = contentType;
    }

    if (token) {
      headers["authorization"] = `Bearer ${token}`;
    }

    options.headers = headers;
  }

  try {
    // Use robust fetch that handles third-party overrides
    const robustFetch = createRobustFetch();

    const response = await robustFetch(
      `/api${url.startsWith("/") ? "" : "/"}${url}`,
      options,
    );

    // Handle 401 errors before parsing response
    if (response.status === 401) {
      const isAuthEndpoint =
        url.includes("auth/login") || url.includes("auth/register");
      if (!isAuthEndpoint) {
        localStorage.removeItem("token");
        setTimeout(() => {
          try {
            api.dispatch(logout());
          } catch (err) {
            console.warn("Error dispatching logout:", err);
          }
        }, 0);
      }
    }

    // Parse response only once
    let data;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch (parseError) {
      data = null;
    }

    if (response.ok) {
      return { data };
    } else {
      return {
        error: {
          status: response.status,
          data: data,
        } as FetchBaseQueryError,
      };
    }
  } catch (error) {
    // Enhanced error detection for network issues and third-party overrides
    const errorMessage = String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    let errorType = "FETCH_ERROR";
    let userMessage =
      "Network connection failed. Please check your internet connection.";

    // Check for specific third-party library interference
    const isFullStoryError =
      errorStack?.includes("fs.js") || errorStack?.includes("fullstory");
    const isThirdPartyFetchOverride =
      errorMessage.includes("window.fetch") || isFullStoryError;

    if (error instanceof DOMException && error.name === "AbortError") {
      errorType = "TIMEOUT_ERROR";
      userMessage = "Request timed out. Please try again.";
    } else if (errorMessage.includes("Failed to fetch")) {
      errorType = "NETWORK_ERROR";
      if (isThirdPartyFetchOverride) {
        userMessage =
          "Network request intercepted by tracking library. Retrying...";
      } else {
        userMessage =
          "Cannot connect to the server. Please check your internet connection and try again.";
      }
    } else if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("TIMEOUT")
    ) {
      errorType = "TIMEOUT_ERROR";
      userMessage = "Request timed out. Please try again.";
    } else if (errorMessage.includes("ERR_NETWORK")) {
      errorType = "CONNECTION_ERROR";
      userMessage =
        "Network connection error. Please check your connection and try again.";
    } else if (isThirdPartyFetchOverride) {
      errorType = "THIRD_PARTY_INTERFERENCE";
      userMessage =
        "Request intercepted by tracking service. Please try again.";
    }

    console.error("Fetch error in baseApi:", {
      url: `/api${url.startsWith("/") ? "" : "/"}${url}`,
      method: typeof args === "string" ? "GET" : args.method || "GET",
      error: errorMessage,
      errorType,
      originalError: error,
      errorStack,
      isFullStoryError,
      isThirdPartyFetchOverride,
      options: options,
    });

    // The robust fetch function already handles retries and fallbacks
    // No need for additional retry logic here

    return {
      error: {
        status: errorType,
        error: errorMessage,
        data: { message: userMessage },
      } as FetchBaseQueryError,
    };
  }
};

// Create the base API slice
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Auth",
    "User",
    "Complaint",
    "ComplaintType",
    "Ward",
    "Analytics",
    "Report",
    "Notification",
    "SystemConfig",
    "Material",
    "Photo",
  ],
  endpoints: () => ({}),
});

// Export hooks
export const {
  // Will be populated by individual API slices
} = baseApi;

// Types for enhanced error handling
export interface ApiError {
  status: number;
  message: string;
  field?: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

// Note: transformResponse functions were removed to prevent "Response body is already used" errors
// in RTK Query. The backend now returns ApiResponse<T> format directly.

// Helper for handling optimistic updates
export const optimisticUpdate = <T>(
  items: T[],
  updatedItem: Partial<T> & { id: string },
  idField: keyof T = "id" as keyof T,
): T[] => {
  return items.map((item) =>
    item[idField] === updatedItem.id ? { ...item, ...updatedItem } : item,
  );
};

// Helper for handling pessimistic updates (rollback on error)
export const rollbackUpdate = <T>(
  items: T[],
  originalItem: T,
  idField: keyof T = "id" as keyof T,
): T[] => {
  return items.map((item) =>
    item[idField] === originalItem[idField] ? originalItem : item,
  );
};

// Helper to extract error message from RTK Query error - defensive implementation
export const getApiErrorMessage = (error: any): string => {
  try {
    console.log("getApiErrorMessage received error:", error);

    // First, try to get the actual error message from the response data
    if (error?.data?.message) {
      return error.data.message;
    }

    // Try to get error message from different possible structures
    if (error?.data?.error) {
      return typeof error.data.error === "string"
        ? error.data.error
        : "An error occurred";
    }

    // Handle RTK Query error formats
    if (error?.message) {
      return error.message;
    }

    // Handle serialized error responses
    if (typeof error?.data === "string") {
      try {
        const parsedError = JSON.parse(error.data);
        if (parsedError.message) {
          return parsedError.message;
        }
      } catch {
        // If parsing fails, return the string as is
        return error.data;
      }
    }

    // Handle status-based errors as fallback
    if (error?.status) {
      switch (error.status) {
        case 400:
          return "Bad request - please check your input";
        case 401:
          return "Unauthorized - please login again";
        case 403:
          return "Forbidden - you do not have permission";
        case 404:
          return "Resource not found";
        case 409:
          return "Conflict - resource already exists";
        case 422:
          return "Validation error - please check your input";
        case 429:
          return "Too many requests - please try again later";
        case 500:
          return "Internal server error - please try again later";
        default:
          return `An error occurred (${error.status})`;
      }
    }

    // Handle network errors
    if (
      error?.message?.includes("Failed to fetch") ||
      error?.status === "NETWORK_ERROR"
    ) {
      return "Cannot connect to the server. Please check your internet connection and try again.";
    }

    if (error?.status === "TIMEOUT_ERROR") {
      return "Request timed out. Please try again.";
    }

    if (error?.status === "CONNECTION_ERROR") {
      return "Network connection error. Please check your connection and try again.";
    }

    if (error?.status === "FETCH_ERROR") {
      return "Network request failed. Please try again.";
    }

    // Handle other error types
    if (error?.error) {
      return "Network error - please check your connection";
    }

    return "An unexpected error occurred. Please try again.";
  } catch (err) {
    console.warn("Error in getApiErrorMessage:", err);
    return "An unexpected error occurred. Please try again.";
  }
};
