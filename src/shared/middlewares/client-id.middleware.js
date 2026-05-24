import { HttpError } from '../http-error.js';
export function requireClientId(request, _response, next) {
    const clientId = request.header('X-Client-Id');
    if (!clientId || clientId.trim().length < 8) {
        next(new HttpError(400, 'X-Client-Id es requerido.'));
        return;
    }
    request.clientId = clientId.trim();
    next();
}
