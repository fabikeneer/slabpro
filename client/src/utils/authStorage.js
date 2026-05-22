const TOKEN_KEY = 'slabpro_token';
const USER_KEY = 'slabpro_user';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    return null;
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function setAuthSession(token, user) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.warn('Error accesando localStorage', error);
  }
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.warn('Error accesando localStorage', error);
  }
}
