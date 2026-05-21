import { createContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { clearAuthSession, getStoredUser, getToken, setAuthSession } from '../utils/authStorage';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    const cached = getStoredUser();
    if (cached) setUser(cached);

    api.get('/api/auth/settings/me')
      .then((res) => {
        if (res.data.success) {
          setUser(res.data.data);
          setAuthSession(token, res.data.data);
        } else {
          clearAuthSession();
          setUser(null);
        }
      })
      .catch(() => {
        clearAuthSession();
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = (newToken, userData) => {
    setAuthSession(newToken, userData);
    setUser(userData);
  };

  const logout = () => {
    api.post('/api/auth/logout').finally(() => {
      clearAuthSession();
      setUser(null);
      window.location.href = '/login';
    });
  };

  const value = {
    user,
    token: getToken(),
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
