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
    try {
      const savedToken = localStorage.getItem('pravix_token');
      const savedUser = localStorage.getItem('pravix_user');
      const savedChatUser = sessionStorage.getItem('pravix_chat_username');

      // Guard against literal "null" or "undefined" strings stored in localStorage
      const isValidToken = savedToken && savedToken !== 'null' && savedToken !== 'undefined';
      const isValidUser = savedUser && savedUser !== 'null' && savedUser !== 'undefined';

      if (isValidToken && isValidUser) {
        const parsedUser = JSON.parse(savedUser);
        // Also ensure parsed user is actually an object (not null)
        if (parsedUser && typeof parsedUser === 'object' && parsedUser.id) {
          setToken(savedToken);
          setUser(parsedUser);
          if (savedChatUser && savedChatUser !== 'null') {
            setChatUsernameState(savedChatUser);
          } else {
            setChatUsernameState(parsedUser.name || null);
          }
        } else {
          // Corrupted data — clear it
          localStorage.removeItem('pravix_token');
          localStorage.removeItem('pravix_user');
          sessionStorage.removeItem('pravix_chat_username');
        }
      }
    } catch (err) {
      // If JSON.parse fails, clear corrupted storage
      console.error('Failed to restore auth state:', err);
      localStorage.removeItem('pravix_token');
      localStorage.removeItem('pravix_user');
      sessionStorage.removeItem('pravix_chat_username');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (t: string, u: User, cu?: string) => {
    // Validate before storing to prevent corrupted state
    if (!t || !u || !u.id) {
      console.error('login() called with invalid data:', { t, u });
      return;
    }
    localStorage.setItem('pravix_token', t);
    localStorage.setItem('pravix_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    const displayName = cu || u.name;
    if (displayName) {
      sessionStorage.setItem('pravix_chat_username', displayName);
      setChatUsernameState(displayName);
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
