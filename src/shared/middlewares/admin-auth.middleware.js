import { getSessionDtoByClientId } from '../../auth/auth.service.js';
import { HttpError } from '../http-error.js';

export async function requireAuthenticatedUser(request, _response, next) {
    try {
        const clientId = readClientId(request);
        const user = await getSessionDtoByClientId(clientId);
        if (!user) {
            next(new HttpError(401, 'Debes iniciar sesion.'));
            return;
        }
        request.clientId = clientId;
        request.user = user;
        next();
    }
    catch (error) {
        next(error);
    }
}

export async function requireAdminUser(request, _response, next) {
    try {
        const clientId = readClientId(request);
        const user = await getSessionDtoByClientId(clientId);
        if (!user) {
            next(new HttpError(401, 'Debes iniciar sesion.'));
            return;
        }
        if (!user.admin) {
            next(new HttpError(403, 'No tienes permisos para ver admin.'));
            return;
        }
        request.clientId = clientId;
        request.user = user;
        next();
    }
    catch (error) {
        next(error);
    }
}

export const requireAdminToken = requireAdminUser;

function readClientId(request) {
    const clientId = request.header('X-Client-Id');
    const normalizedClientId = typeof clientId === 'string' ? clientId.trim() : '';
    if (normalizedClientId.length < 8) {
        throw new HttpError(400, 'X-Client-Id es requerido.');
    }
    return normalizedClientId;
}
