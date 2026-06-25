export type ActionResponse<T = null> = {
  success: boolean;
  message: string;
  data?: T;
  error?: unknown;
};

export function successResponse<T = null>(
  message: string,
  data?: T
): ActionResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

export function errorResponse(
  message: string,
  error?: unknown
): ActionResponse {
  return {
    success: false,
    message,
    error,
  };
}