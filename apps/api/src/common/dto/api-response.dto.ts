export interface ApiResponseDto<T> {
  data: T;
  requestId: string;
}

export interface ApiErrorResponseDto {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
}
