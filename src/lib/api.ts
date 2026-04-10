import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/config';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/** Page de connexion = accueil localisé (`/[locale]`), pas `/auth/login-user` (souvent 404 hors `[locale]`). */
function getBrowserLoginHomeUrl(): string {
  if (typeof window === 'undefined') return `/${defaultLocale}`;
  const c = Cookies.get('NEXT_LOCALE');
  const loc: Locale = c && locales.includes(c as Locale) ? (c as Locale) : defaultLocale;
  return `/${loc}`;
}

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

class ApiClient {
  private client: AxiosInstance;
  private readonly refreshClient: AxiosInstance;
  private refreshAccessPromise: Promise<string | null> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.refreshClient = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use((config) => {
      const token = Cookies.get('token') || Cookies.get('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as RetryConfig | undefined;
        const status = error.response?.status;

        if (status !== 401 || !originalRequest) {
          return Promise.reject(error);
        }

        const url = originalRequest.url ?? '';
        if (
          url.includes('/auth/login') ||
          url.includes('/auth/login-user') ||
          url.includes('/auth/refresh')
        ) {
          this.clearAuthCookies();
          if (typeof window !== 'undefined') {
            window.location.href = getBrowserLoginHomeUrl();
          }
          return Promise.reject(error);
        }

        if (originalRequest._retry) {
          this.clearAuthCookies();
          if (typeof window !== 'undefined') {
            window.location.href = getBrowserLoginHomeUrl();
          }
          return Promise.reject(error);
        }

        originalRequest._retry = true;
        const newAccess = await this.tryRefreshAccessToken();
        if (!newAccess) {
          this.clearAuthCookies();
          if (typeof window !== 'undefined') {
            window.location.href = getBrowserLoginHomeUrl();
          }
          return Promise.reject(error);
        }

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return this.client.request(originalRequest);
      },
    );
  }

  private clearAuthCookies() {
    Cookies.remove('token');
    Cookies.remove('auth_token');
    Cookies.remove('refresh_token');
  }

  /** Une seule requête refresh si plusieurs 401 simultanés */
  /** Exposé pour clients alternatifs (ex. ky) : tente un refresh, met à jour les cookies. */
  async refreshSession(): Promise<boolean> {
    const token = await this.tryRefreshAccessToken();
    return token !== null;
  }

  private tryRefreshAccessToken(): Promise<string | null> {
    if (!this.refreshAccessPromise) {
      this.refreshAccessPromise = (async () => {
        try {
          const refresh = Cookies.get('refresh_token');
          if (!refresh) return null;
          const { data } = await this.refreshClient.post<{
            accessToken: string;
          }>('/auth/refresh', { refreshToken: refresh });
          const at = data?.accessToken;
          if (!at) return null;
          Cookies.set('token', at, { expires: 7 });
          Cookies.set('auth_token', at, { expires: 7 });
          return at;
        } catch {
          return null;
        }
      })().finally(() => {
        this.refreshAccessPromise = null;
      });
    }
    return this.refreshAccessPromise;
  }

  async logout() {
    const token = Cookies.get('token') || Cookies.get('auth_token');
    const refresh = Cookies.get('refresh_token');
    try {
      if (token) {
        await this.client.post(
          '/auth/logout',
          refresh ? { refreshToken: refresh } : {},
        );
      }
    } catch {
      /* ignore */
    }
    this.clearAuthCookies();
  }

  // ---- ADMIN DASHBOARD ----

  listDashboardPresences(params?: { from?: string; to?: string }) {
    return this.client.get("/admin/dashboard/presences", { params });
  }

  listDashboardInscriptions(params?: { year?: number }) {
    return this.client.get("/admin/dashboard/inscriptions", { params });
  }

  listDashboardUpcomingEvents(params?: { from?: string; to?: string }) {
    return this.client.get("/admin/dashboard/upcoming-events", { params });
  }

  listDashboardTeacherAttendanceStatus(params?: { from?: string; to?: string }) {
    return this.client.get("/admin/dashboard/teacher-attendance-status", { params });
  }

  // ---- EVENTS (Admin) ----

  listAdminEvents(params?: { page?: number; pageSize?: number; status?: string; classeId?: string }) {
    return this.client.get('/admin/events', { params });
  }

  createAdminEvent(data: {
    titre: string;
    description?: string | null;
    startAt: string;
    endAt?: string | null;
    classeId?: string | null;
    status?: string;
  }) {
    return this.client.post('/admin/events', data);
  }

  updateAdminEvent(
    id: string,
    data: {
      titre?: string;
      description?: string | null;
      startAt?: string;
      endAt?: string | null;
      classeId?: string | null;
      status?: string;
    },
  ) {
    return this.client.patch(`/admin/events/${id}`, data);
  }

  deleteAdminEvent(id: string) {
    return this.client.delete(`/admin/events/${id}`);
  }

  // ---- EVENTS (Parent) ----

  listParentEvents(params?: { page?: number; pageSize?: number; dateFrom?: string }) {
    return this.client.get('/parent/events', { params });
  }

    // ---- MENUS ----

  listMenus(page = 1, pageSize = 50, statut?: "Brouillon" | "Publie") {
    return this.client.get("/menus", {
      params: { page, pageSize, statut },
    });
  }

  createMenu(data: {
    date: string;
    collationMatin?: string;
    repas?: string;
    gouter?: string;
    allergenes?: string[];
  }) {
    return this.client.post("/menus", data);
  }

  updateMenu(
    id: string,
    data: {
      collationMatin?: string;
      repas?: string;
      gouter?: string;
      allergenes?: string[];
      statut?: "Brouillon" | "Publie";
    }
  ) {
    return this.client.patch(`/menus/${id}`, data);
  }




  publishMenu(id: string) {
    return this.client.post(`/menus/${id}/publish`, {});
  }

  unpublishMenu(id: string) {
    return this.client.post(`/menus/${id}/unpublish`, {});
  }

  deleteMenu(id: string) {
    return this.client.delete(`/menus/${id}`);
  }

  // ---- DELEGATIONS (Admin) ----
  addDelegation(enfantId: string, data: { nom: string; telephone: string; cin: string; relation: string }) {
    return this.client.post(`/admin/enfants/${enfantId}/delegations`, data);
  }

  updateDelegation(enfantId: string, delegationId: string, data: Partial<{ nom: string; telephone: string; cin: string; relation: string }>) {
    return this.client.patch(`/admin/enfants/${enfantId}/delegations/${delegationId}`, data);
  }

  deleteDelegation(enfantId: string, delegationId: string) {
    return this.client.delete(`/admin/enfants/${enfantId}/delegations/${delegationId}`);
  }

  // Auth
  loginAdmin(email: string, password: string) {
    return this.client.post('/auth/login', { email, password });
  }

  loginUser(email: string, password: string) {
    return this.client.post('/auth/login-user', { email, password });
  }

  // Users (Admin)
  createUser(data: any) {
    return this.client.post('/admin/users', data);
  }

  listUsers(params?: { role?: string; statut?: string; q?: string; page?: number; limit?: number }) {
    return this.client.get('/admin/users', { params });
  }

  getAdminUser(id: string) {
    return this.client.get(`/admin/users/${id}`);
  }

  updateUserStatus(id: string, statut: 'INVITED' | 'ACTIVE' | 'DISABLED') {
    return this.client.patch(`/admin/users/${id}/status`, { statut });
  }

  updateUserProfile(id: string, data: { prenom?: string; nom?: string; telephone?: string; fonction?: string; specialite?: string }) {
    return this.client.patch(`/admin/users/${id}`, data);
  }

  deleteUser(id: string) {
    return this.client.delete(`/admin/users/${id}`);
  }

  // ---- ÉTABLISSEMENT ----
  getEtablissement() {
    return this.client.get('/admin/users/etablissement');
  }
  updateEtablissement(data: {
    nom?: string; adresse?: string; telephone?: string; email?: string;
    siteWeb?: string; description?: string; horaires?: string; capacite?: number;
  }) {
    return this.client.put('/admin/users/etablissement', data);
  }

  // ---- CLASSES (Admin) ----
  listClasses() {
    return this.client.get('/admin/classes');
  }

  // ---- CLASSES (Public) ----
  listPublicClasses() {
    const publicClient = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return publicClient.get('/public/classes');
  }

  createClass(data: {
    nom: string;
    capacite?: number | null;
    trancheAge?: string | null;
    active?: boolean;
  }) {
    return this.client.post('/admin/classes', data);
  }

  updateClass(
    id: string,
    data: {
      nom?: string;
      capacite?: number | null;
      trancheAge?: string | null;
      active?: boolean;
    }
  ) {
    return this.client.patch(`/admin/classes/${id}`, data);
  }

  deleteClass(id: string) {
    return this.client.delete(`/admin/classes/${id}`);
  }

  getClassWithChildren(classeId: string) {
    return this.client.get(`/admin/classes/${classeId}/enfants`);
  }

  assignTeacherToClass(teacherId: string, classeId: string) {
    // Utilise le contrôleur Users: /admin/users/teachers/:utilisateurId/assign-class
    return this.client.post(`/admin/users/teachers/${teacherId}/assign-class`, {
      utilisateurId: teacherId,
      classeId,
    });
  }

  removeTeacherFromClass(classeId: string, enseignantId: string) {
    return this.client.delete(`/admin/classes/${classeId}/enseignants/${enseignantId}`);
  }

  // Presences (Teacher)
  recordPresences(data: any) {
    return this.client.post('/presences/class', data);
  }

  getPresences(classeId: string, date?: string, page?: number, pageSize?: number) {
    return this.client.get('/presences', { params: { classeId, date, page, pageSize } });
  }

  listPresences(params?: {
    date?: string;
    dateMin?: string;
    dateMax?: string;
    classeId?: string;
    enfantId?: string;
    enregistreParId?: string;
    statut?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.client.get('/presences', { params });
  }

  // Daily Resumes (Teacher)
  createResume(data: any) {
    return this.client.post('/daily-resumes', data);
  }

  getResumes(classeId: string, date?: string) {
    return this.client.get('/daily-resumes', { params: { classeId, date } });
  }

  updateResume(id: string, data: any) {
    return this.client.patch(`/daily-resumes/${id}`, data);
  }

  // Generic auth password change (teacher + parent via /auth/change-password)
  changeAuthPassword(oldPassword: string, newPassword: string, confirmPassword: string) {
    return this.client.post('/auth/change-password', {
      oldPassword,
      newPassword,
      confirmPassword,
    });
  }

  // Parent Dashboard
  getParentProfile() {
    return this.client.get('/parent/me');
  }

  updateParentMe(data: { telephone?: string; adresse?: string }) {
    return this.client.patch('/parent/me', data);
  }


  getChildPresences(enfantId: string, page = 1, pageSize = 20, dateMin?: string, dateMax?: string) {
    return this.client.get(`/parent/enfants/${enfantId}/presences`, {
      params: { page, pageSize, ...(dateMin ? { dateMin } : {}), ...(dateMax ? { dateMax } : {}) },
    });
  }

  getChildResume(enfantId: string, date?: string) {
    return this.client.get(`/parent/enfants/${enfantId}/resume`, { params: { date } });
  }

  getClassJournal(classeId: string, date?: string) {
    return this.client.get(`/parent/classes/${classeId}/journal/latest`, {
      params: { ...(date ? { date } : {}) },
    });
  }

  getClassMenu(classeId: string, date?: string) {
    return this.client.get(`/parent/classes/${classeId}/menu`, { params: { date } });
  }

  /** Photos d’activités (album de classe) — parent : enfant dans la classe */
  listParentClassActivityPhotos(
    classeId: string,
    params?: { date?: string; dateFrom?: string; dateTo?: string },
  ) {
    return this.client.get(`/parent/classes/${classeId}/activity-photos`, { params });
  }

  /** Enseignant / admin */
  listClassActivityPhotos(params: {
    classeId: string;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    return this.client.get('/class-activity-photos', { params });
  }

  uploadClassActivityPhoto(classeId: string, date: string, file: File, legende?: string) {
    const fd = new FormData();
    fd.append('classeId', classeId);
    fd.append('date', date);
    fd.append('file', file);
    if (legende?.trim()) fd.append('legende', legende.trim());
    return this.client.post('/class-activity-photos', fd);
  }

  deleteClassActivityPhoto(photoId: string) {
    return this.client.delete(`/class-activity-photos/${photoId}`);
  }

  /** Octets image (JWT) — pour affichage après liste (id + mimeType, pas d’URL publique). */
  getClassActivityPhotoFile(photoId: string) {
    return this.client.get<ArrayBuffer>(`/class-activity-photos/${photoId}/file`, {
      responseType: 'arraybuffer',
    });
  }

  changePassword(oldPassword: string, newPassword: string) {
    return this.client.post('/parent/me/change-password', { oldPassword, newPassword });
  }

  // Santé enfant
  getChildSante(enfantId: string) {
    return this.client.get(`/parent/enfants/${enfantId}/sante`);
  }

  upsertChildSante(enfantId: string, data: {
    medecin?: string;
    notes?: string;
    restrictionAlimentaire?: string;
    tags?: string[];
    allergies?: { nom: string; severite?: string; notes?: string }[];
    intolerances?: { nom: string; notes?: string }[];
  }) {
    return this.client.put(`/parent/enfants/${enfantId}/sante`, data);
  }

  deleteChildSante(enfantId: string) {
    return this.client.delete(`/parent/enfants/${enfantId}/sante`);
  }

  // Délégations parent (personnes autorisées)
  addParentDelegation(enfantId: string, data: { nom: string; telephone: string; cin?: string; relation?: string }) {
    return this.client.post(`/parent/enfants/${enfantId}/delegations`, data);
  }

  updateParentDelegation(enfantId: string, delegationId: string, data: { nom?: string; telephone?: string; cin?: string; relation?: string }) {
    return this.client.patch(`/parent/enfants/${enfantId}/delegations/${delegationId}`, data);
  }

  deleteParentDelegation(enfantId: string, delegationId: string) {
    return this.client.delete(`/parent/enfants/${enfantId}/delegations/${delegationId}`);
  }

  // Class daily summaries & statistics (Teacher/Admin)
  getClassSummary(classeId: string, date: string) {
    return this.client.get(`/daily-resumes/class/${classeId}/summary`, {
      params: { date },
    });
  }

  exportClassStatistics(classeId: string, dateMin: string, dateMax: string) {
    return this.client.get(`/daily-resumes/class/${classeId}/export`, {
      params: { dateMin, dateMax },
    });
  }

  // Class Daily Summaries (message de la journée)
  listClassDailySummaries(params?: { classeId?: string; date?: string; dateMin?: string; dateMax?: string; statut?: string; page?: number; pageSize?: number }) {
    return this.client.get('/class-daily-summaries', { params });
  }

  createClassDailySummary(data: {
    classeId: string;
    date: string;
    activites: string;
    apprentissages: string;
    humeurGroupe: string;
    observations?: string | null;
  }) {
    return this.client.post('/class-daily-summaries', data);
  }

  updateClassDailySummary(id: string, data: {
    activites?: string;
    apprentissages?: string;
    humeurGroupe?: string;
    observations?: string | null;
  }) {
    return this.client.patch(`/class-daily-summaries/${id}`, data);
  }

  publishClassDailySummary(id: string) {
    return this.client.post(`/class-daily-summaries/${id}/publish`, {});
  }

  // Children (Admin)
  listChildren(page = 1, pageSize = 50) {
    return this.client.get('/admin/enfants', {
      params: { page, pageSize },
    });
  }

  createChild(data: any) {
    return this.client.post('/admin/enfants', data);
  }

  listChildFamilies() {
    return this.client.get('/admin/enfants/familles');
  }

  getChild(id: string) {
    return this.client.get(`/admin/enfants/${id}`);
  }

  updateChild(id: string, data: any) {
    return this.client.patch(`/admin/enfants/${id}`, data);
  }

  deleteChild(id: string) {
    return this.client.delete(`/admin/enfants/${id}`);
  }

  updateChildStatus(id: string, statut: string) {
    return this.client.patch(`/admin/enfants/${id}/status`, { statut });
  }

  // Admin Inscriptions (protected)
  listAdminInscriptions(params?: { statut?: string; q?: string; page?: number; pageSize?: number }) {
    return this.client.get('/admin/inscriptions', { params });
  }

  getAdminInscription(id: string) {
    return this.client.get(`/admin/inscriptions/${id}`);
  }

  acceptAdminInscription(id: string) {
    return this.client.post(`/admin/inscriptions/${id}/accept`, {});
  }

  rejectAdminInscription(id: string, raison?: string) {
    return this.client.patch(`/admin/inscriptions/${id}/reject`, { raison });
  }

  updateAdminInscriptionStatus(
    id: string,
    statut: 'EN_COURS' | 'ACTIF' | 'REJETEE',
    notes?: string,
  ) {
    return this.client.patch(`/admin/inscriptions/${id}/status`, { statut, notes });
  }

  // Public Inscription (no auth required)
  createPublicInscription(data: any) {
    // Create a separate client instance without auth for public endpoints
    const publicClient = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return publicClient.post('/public/inscriptions', data);
  }

  // Règlement Intérieur (Public)
  getPublicReglement() {
    const publicClient = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });
    return publicClient.get('/public/reglement-interieur');
  }

  // Règlement Intérieur (Admin)
  getAdminReglement() {
    return this.client.get('/admin/reglement-interieur');
  }

  updateAdminReglement(contenu: string) {
    return this.client.put('/admin/reglement-interieur', { contenu });
  }
}

export const apiClient = new ApiClient();
