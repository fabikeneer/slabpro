import { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión con el servidor (la cookie HTTP-Only viaja automáticamente)
    api.get('/api/auth/settings/me')
      .then(res => {
        if (res.data.success) {
          setUser(res.data.data);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = (newToken, userData) => {
    // El servidor ya asignó la cookie, solo actualizamos estado
    setUser(userData);
  };

  const logout = () => {
    api.post('/api/auth/logout').finally(() => {
      setUser(null);
      window.location.href = '/login';
    });
  };

  const value = {
    user,
    token: 'cookie', // Por compatibilidad
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
