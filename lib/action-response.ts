export type SuccessResponse<T = null> = {
  success: true;
  message: string;
  data?: T;
};

export type ErrorResponse<E = unknown> = {
  success: false;
  message: string;
  error?: E;
};

export type ActionResponse<T = null, E = unknown> =
  | SuccessResponse<T>
  | ErrorResponse<E>;

  export function successResponse<T = null>(
  message: string,
  data?: T
): SuccessResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

export function errorResponse<E = unknown>(
  message: string,
  error?: E
): ErrorResponse<E> {
  return {
    success: false,
    message,
    error,
  };
}