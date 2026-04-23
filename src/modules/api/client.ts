import ky, { HTTPError } from 'ky';
import { useAuthStore } from '@/modules/auth/store';
import { apiClient } from '@/lib/api';
import { getSessionSnapshot } from '@/lib/auth-session';

/**
 * Instance Ky configurée avec:
 * - baseURL depuis env
 * - Injection du JWT dans les headers
 * - Gestion centralisée des erreurs
 */
export const api = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  hooks: {
    beforeRequest: [
      (request) => {
        const snap = getSessionSnapshot();
        const token = snap.authToken || snap.token || useAuthStore.getState().token;
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401) {
          const opts = options as { _kyRefresh?: boolean };
          if (!opts._kyRefresh) {
            const refreshed = await apiClient.refreshSession();
            if (refreshed) {
              opts._kyRefresh = true;
              const snap = getSessionSnapshot();
              const token = snap.authToken || snap.token || useAuthStore.getState().token;
              if (token) {
                request.headers.set('Authorization', `Bearer ${token}`);
              }
              return ky(request);
            }
          }
          console.error('[Auth/Session] ky_401_logout', {
            hasToken: getSessionSnapshot().hasAnyToken,
          });
          useAuthStore.getState().logout();
          if (typeof window !== 'undefined') {
            const pathname = window.location.pathname || '';
            const isArabic = pathname.startsWith('/ar');
            const targetLocale = isArabic ? 'ar' : 'fr';
            window.location.href = `/${targetLocale}`;
          }
        }

        // Gérer les erreurs 403 (non autorisé)
        if (response.status === 403) {
          throw new Error('Accès refusé');
        }

        // Gérer les erreurs 404
        if (response.status === 404) {
          throw new Error('Ressource non trouvée');
        }

        // Gérer les erreurs 5xx
        if (response.status >= 500) {
          throw new Error('Erreur serveur');
        }
      },
    ],
  },
});

/**
 * Wrapper pour les requêtes GET
 */
export async function apiGet<T>(url: string, options?: any): Promise<T> {
  try {
    return await api.get(url, options).json<T>();
  } catch (error) {
    if (error instanceof HTTPError) {
      const data = await error.response.json();
      throw new Error(data.message || 'Erreur API');
    }
    throw error;
  }
}

/**
 * Wrapper pour les requêtes POST
 */
export async function apiPost<T>(
  url: string,
  body?: any,
  options?: any
): Promise<T> {
  try {
    return await api.post(url, { json: body, ...options }).json<T>();
  } catch (error) {
    if (error instanceof HTTPError) {
      const data = await error.response.json();
      throw new Error(data.message || 'Erreur API');
    }
    throw error;
  }
}

/**
 * Wrapper pour les requêtes PATCH
 */
export async function apiPatch<T>(
  url: string,
  body?: any,
  options?: any
): Promise<T> {
  try {
    return await api.patch(url, { json: body, ...options }).json<T>();
  } catch (error) {
    if (error instanceof HTTPError) {
      const data = await error.response.json();
      throw new Error(data.message || 'Erreur API');
    }
    throw error;
  }
}

/**
 * Wrapper pour les requêtes DELETE
 */
export async function apiDelete<T>(url: string, options?: any): Promise<T> {
  try {
    return await api.delete(url, options).json<T>();
  } catch (error) {
    if (error instanceof HTTPError) {
      const data = await error.response.json();
      throw new Error(data.message || 'Erreur API');
    }
    throw error;
  }
}

