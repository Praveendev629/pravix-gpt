'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  profilePhoto?: string;
  authProvider: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  chatUsername: string | null;
  login: (token: string, user: User, chatUsername?: string) => void;
  logout: () => void;
  setChatUsername: (name: string) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [chatUsername, setChatUsernameState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('pravix_token');
    const savedUser = localStorage.getItem('pravix_user');
    const savedChatUser = sessionStorage.getItem('pravix_chat_username');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      if (savedChatUser) setChatUsernameState(savedChatUser);
    }
    setLoading(false);
  }, []);

  const login = (t: string, u: User, cu?: string) => {
    localStorage.setItem('pravix_token', t);
    localStorage.setItem('pravix_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    if (cu) {
      sessionStorage.setItem('pravix_chat_username', cu);
      setChatUsernameState(cu);
    } else {
      sessionStorage.setItem('pravix_chat_username', u.name);
      setChatUsernameState(u.name);
    }
  };

  const logout = () => {
    localStorage.removeItem('pravix_token');
    localStorage.removeItem('pravix_user');
    sessionStorage.removeItem('pravix_chat_username');
    setToken(null);
    setUser(null);
    setChatUsernameState(null);
  };

  const setChatUsername = (name: string) => {
    sessionStorage.setItem('pravix_chat_username', name);
    setChatUsernameState(name);
  };

  return (
    <AuthContext.Provider value={{ user, token, chatUsername, login, logout, setChatUsername, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
