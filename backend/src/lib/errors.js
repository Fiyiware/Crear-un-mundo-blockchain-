export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code, message, details) => new AppError(400, code, message, details);
export const unauthorized = (message = 'No autenticado') => new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (code, message) => new AppError(403, code, message);
export const notFound = (what = 'Recurso') => new AppError(404, 'NOT_FOUND', `${what} no encontrado`);
export const conflict = (code, message) => new AppError(409, code, message);
export const unprocessable = (code, message, details) => new AppError(422, code, message, details);
