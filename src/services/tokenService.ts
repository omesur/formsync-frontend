// src/services/tokenService.ts
const ACCESS_TOKEN_KEY = 'formsync_auth_token';
const REFRESH_TOKEN_KEY = 'formsync_refresh_token'; // Nueva clave

// --- Access Token ---
export const saveAccessToken = (token: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
};
export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};
export const removeAccessToken = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
};

// --- Refresh Token ---
export const saveRefreshToken = (token: string): void => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token); // Guardar en localStorage (ver nota seguridad)
};
export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};
export const removeRefreshToken = (): void => {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// --- Helper para borrar ambos ---
export const removeTokens = (): void => {
     removeAccessToken();
     removeRefreshToken();
}

/*
NOTA DE SEGURIDAD IMPORTANTE:
Almacenar el Refresh Token en localStorage lo hace vulnerable a ataques XSS.
La solución estándar y más segura para aplicaciones web es usar HttpOnly cookies
para el Refresh Token. Esto requiere configuración adicional en el backend (manejo de cookies)
y en el frontend (manejo de credenciales en las peticiones Axios).
Para este tutorial inicial, usamos localStorage por simplicidad, pero
¡DEBES considerar HttpOnly cookies para producción!
*/