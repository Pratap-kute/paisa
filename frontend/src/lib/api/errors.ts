export class ApiError extends Error {
  status: number;
  code?: string;
  data?: unknown;

  constructor(status: number, message: string, code?: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export interface AppApiError {
  status?: number;
  code?: string;
  message: string;
  isAbort?: boolean;
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof Error && (err.name === "AbortError" || err.message?.includes("aborted"))) return true;
  if (typeof err === "object" && "name" in err && (err as { name?: string }).name === "AbortError") return true;
  return false;
}

export function normalizeApiError(err: unknown): AppApiError {
  if (isAbortError(err)) {
    return {
      message: "Request cancelled",
      isAbort: true,
    };
  }

  if (isApiError(err)) {
    return {
      status: err.status,
      code: err.code,
      message: err.message,
    };
  }

  if (err instanceof Error) {
    return {
      message: err.message,
    };
  }

  if (typeof err === "object" && err !== null) {
    const errorObj = err as Record<string, unknown>;
    const message = (typeof errorObj.error === "string" ? errorObj.error : undefined) ||
      (typeof errorObj.message === "string" ? errorObj.message : undefined) ||
      "An unexpected error occurred";
    const status = typeof errorObj.status === "number" ? errorObj.status : undefined;
    const code = typeof errorObj.code === "string" ? errorObj.code : undefined;
    return { status, code, message };
  }

  if (typeof err === "string") {
    return {
      message: err,
    };
  }

  return {
    message: "An unexpected error occurred",
  };
}

export function extractErrorMessage(err: unknown): string {
  return normalizeApiError(err).message;
}
