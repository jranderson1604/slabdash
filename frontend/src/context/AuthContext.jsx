import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('slabdash_token');
    if (token) {
      auth.me()
        .then((res) => {
          setUser(res.data.user);
          setCompany(res.data.company);
        })
        .catch(() => {
          localStorage.removeItem('slabdash_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await auth.login(email, password);
    localStorage.setItem('slabdash_token', res.data.token);
    setUser(res.data.user);
    setCompany(res.data.company);
    return res.data;
  };

  const register = async (data) => {
    const res = await auth.register(data);
    localStorage.setItem('slabdash_token', res.data.token);
    setUser(res.data.user);
    setCompany(res.data.company);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('slabdash_token');
    setUser(null);
    setCompany(null);
  };

  const refreshUser = async () => {
    // Add cache-busting timestamp to force fresh data
    const res = await auth.me();
    setUser(res.data.user);
    // Force new object reference so React detects the change
    setCompany({ ...res.data.company });
  };

  return (
    <AuthContext.Provider value={{ user, company, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
