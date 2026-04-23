import Cookies from 'js-cookie';

const SESSION_COOKIE_OPTIONS = {
  expires: 7,
  sameSite: 'lax' as const,
};

export function setSessionTokens(accessToken: string, refreshToken?: string) {
  Cookies.set('token', accessToken, SESSION_COOKIE_OPTIONS);
  Cookies.set('auth_token', accessToken, SESSION_COOKIE_OPTIONS);
  if (refreshToken) {
    Cookies.set('refresh_token', refreshToken, SESSION_COOKIE_OPTIONS);
  }
}

export function clearSessionTokens() {
  Cookies.remove('token');
  Cookies.remove('auth_token');
  Cookies.remove('refresh_token');
}

export function getSessionSnapshot() {
  const token = Cookies.get('token') || null;
  const authToken = Cookies.get('auth_token') || null;
  const refreshToken = Cookies.get('refresh_token') || null;
  return {
    token,
    authToken,
    refreshToken,
    hasAnyToken: Boolean(token || authToken || refreshToken),
    accessTokensInSync: Boolean(token && authToken && token === authToken),
  };
}
