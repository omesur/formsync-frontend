    // src/services/apiService.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, saveAccessToken, saveRefreshToken, removeTokens } from './tokenService';

// Define la URL base de tu API backend
const API_BASE_URL = 'http://localhost:3001'; // La URL donde corre tu backend NestJS

// Crea una instancia de Axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir el token JWT a todas las peticiones salientes (si existe)
apiClient.interceptors.request.use(
    (config) => {
      const token = getAccessToken();
      if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

let isRefreshing = false; // Flag para evitar múltiples refrescos simultáneos
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: any) => void; }[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    failedQueue = [];
  };

  apiClient.interceptors.response.use(
    (response) => {
      // Si la respuesta es exitosa, simplemente la retornamos
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }; // Añadir _retry
  
      // Si el error NO es 401, o la petición original ya era un reintento, rechazarla
      if (error.response?.status !== 401 || originalRequest._retry) {
        // Si es 401 y era reintento, probablemente el refresh falló o también expiró. Desloguear.
        if (error.response?.status === 401 && originalRequest._retry) {
           console.error("Refresh token inválido o expirado. Deslogueando.");
           removeTokens();
           // Redirigir a login (mejor hacerlo desde un componente/context global)
           window.location.href = '/login';
        }
        return Promise.reject(error);
      }
  
      // --- Inicio del Flujo de Refresco ---
      if (isRefreshing) {
        // Si ya se está refrescando, añadir la petición fallida a la cola
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
           if (originalRequest.headers) {
               originalRequest.headers['Authorization'] = 'Bearer ' + token;
           }
           return apiClient(originalRequest); // Reintentar con el nuevo token obtenido
        }).catch(err => {
           return Promise.reject(err); // Si el refresco falló, rechazar esta también
        });
      }
  
      // Marcar que estamos refrescando y marcar la petición original para evitar bucles
      originalRequest._retry = true;
      isRefreshing = true;
  
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        console.error("No hay refresh token disponible. Deslogueando.");
        removeTokens();
        window.location.href = '/login'; // Redirigir
        isRefreshing = false;
        processQueue(new Error("No refresh token"), null); // Rechazar peticiones en cola
        return Promise.reject(error);
      }
  
      try {
        // Llamar al endpoint /auth/refresh
        const refreshResponse = await axios.post<{ accessToken: string; refreshToken: string }>(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken: refreshToken } // Enviar refresh token en el body
        );
  
        const newAccessToken = refreshResponse.data.accessToken;
        const newRefreshToken = refreshResponse.data.refreshToken; // Si el backend rota refresh tokens
  
        // Guardar los nuevos tokens
        saveAccessToken(newAccessToken);
        saveRefreshToken(newRefreshToken); // Guardar el nuevo refresh token
  
        // Actualizar el header de la instancia de Axios para futuras peticiones
        if (apiClient.defaults.headers.common) {
           apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        }
  
        // Actualizar el header de la petición original fallida
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }
  
        // Procesar la cola de peticiones fallidas con el nuevo token
        processQueue(null, newAccessToken);
  
        // Reintentar la petición original con el nuevo token
        return apiClient(originalRequest);
  
      } catch (refreshError: any) {
        console.error("Error al refrescar token:", refreshError);
        // Si el refresco falla (ej: refresh token inválido/expirado - backend devuelve 403/401)
        removeTokens(); // Limpiar tokens
        window.location.href = '/login'; // Redirigir a login
        processQueue(refreshError, null); // Rechazar peticiones en cola
        return Promise.reject(refreshError); // Rechazar la promesa original
      } finally {
        isRefreshing = false; // Marcar que ya no estamos refrescando
      }
    }
  );

export default apiClient;