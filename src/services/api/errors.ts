export type AppErrorCode =
  | 'CONFIG_MISSING'
  | 'INVALID_CREDENTIALS'
  | 'NOT_AUTHORIZED_ADMIN'
  | 'SESSION_EXPIRED'
  | 'DUPLICATE_REGISTRATION'
  | 'REGISTRATION_CLOSED'
  | 'CAPACITY_REACHED'
  | 'RATE_LIMITED'
  | 'BOT_DETECTED'
  | 'SPECIALIZATION_UNAVAILABLE'
  | 'SPECIALIZATION_IN_USE'
  | 'SPECIALIZATION_DUPLICATE'
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export class AppServiceError extends Error {
  readonly code: AppErrorCode;
  readonly status?: number;

  constructor(code: AppErrorCode, message?: string, status?: number) {
    super(message ?? code);
    this.name = 'AppServiceError';
    this.code = code;
    this.status = status;
  }
}

export function isAppServiceError(error: unknown): error is AppServiceError {
  return error instanceof AppServiceError;
}
