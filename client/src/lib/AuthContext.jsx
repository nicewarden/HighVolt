import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(null); // null = loading
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const status = await api.get('/auth/status');
      setAuthenticated(status.authenticated);
    } catch {
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (pin) => {
    setError(null);
    try {
      await api.post('/auth/login', { pin });
      setAuthenticated(true);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  const logout = async () => {
    await api.post('/auth/logout', {});
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ authenticated, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
