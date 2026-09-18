'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { adminFetch, getAuthToken, removeAuthToken, setAuthToken } from '@/lib/adminApi';

export interface Company {
  _id: string;
  name: string;
  slug: string;
  code: string;
  description?: string;
  isVisible: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  token: string | null;
  companies: Company[];
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  loading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
  refreshCompanies: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getAuthToken();

      // No token → unauthenticated. Never auto-login; send admin pages to /admin/login.
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
          router.replace('/admin/login');
        }
        return;
      }

      try {
        const res = await adminFetch('/auth/me');
        if (res.success && res.user) {
          setUser(res.user);
          setToken(storedToken);
          await fetchCompanies();
          if (pathname === '/admin/login') {
            router.replace('/admin');
          }
        } else {
          removeAuthToken();
          setUser(null);
          setToken(null);
          if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
            router.replace('/admin/login');
          }
        }
      } catch {
        removeAuthToken();
        setUser(null);
        setToken(null);
        if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
          router.replace('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await adminFetch('/companies');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setCompanies(res.data);
        if (!selectedCompany || selectedCompany._id === 'all') {
          setSelectedCompany(res.data[0]); // Default to first company (e.g. Linkup Social)
        }
      }
    } catch {
      // Companies need a valid session — keep empty when unauthenticated / API unreachable
      setCompanies([]);
    }
  };

  const login = (newToken: string, newUser: AdminUser) => {
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
    setLoading(false);
    fetchCompanies();
    router.replace('/admin');
  };

  const logout = () => {
    removeAuthToken();
    setToken(null);
    setUser(null);
    setCompanies([]);
    setSelectedCompany(null);
    router.replace('/admin/login');
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        token,
        companies,
        selectedCompany,
        setSelectedCompany,
        loading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        refreshCompanies: fetchCompanies,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
