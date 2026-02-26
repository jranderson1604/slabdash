import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth } from '../api/client';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const heartbeatRef = useRef(null);

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

  // Send heartbeat while logged in so the owner dashboard can show live user count
  useEffect(() => {
    if (!user) {
      clearInterval(heartbeatRef.current);
      return;
    }
    const ping = () => api.post('/auth/heartbeat').catch(() => {});
    ping(); // immediate ping on login
    heartbeatRef.current = setInterval(ping, 30_000);
    return () => clearInterval(heartbeatRef.current);
  }, [user?.id]);

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

  const logout = async () => {
    try {
      await auth.logout();
    } catch {
      // Best-effort — clear local state regardless
    }
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
