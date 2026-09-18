'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/context/AdminAuthContext';
import FaqSection from '@/components/admin/FaqSection';
import { shouldShowPageFaqs } from '@/lib/pageFaqs';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';
  const showFaqSection = shouldShowPageFaqs(pathname ?? '');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { loading, isAuthenticated } = useAdminAuth();

  // Route guard: every /admin page except /admin/login needs a session
  useEffect(() => {
    if (!loading && !isAuthenticated && !isLoginPage) {
      router.replace('/admin/login');
    }
  }, [loading, isAuthenticated, isLoginPage, router]);

  if (isLoginPage) {
    // Login page: clean card only — no FAQ section below the form
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-center gap-6 p-4 [&_input]:text-slate-900 [&_textarea]:text-slate-900 [&_select]:text-slate-900 [&_option]:text-slate-900 [&_option]:bg-white">
        {children}
      </div>
    );
  }

  // While the session is being checked — or when logged out and the
  // redirect above hasn't fired yet — never flash the dashboard.
  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {loading ? 'Checking session...' : 'Redirecting to login...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex text-sm leading-normal [&_input]:text-slate-900 [&_textarea]:text-slate-900 [&_select]:text-slate-900 [&_option]:text-slate-900 [&_option]:bg-white">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {children}
          {showFaqSection && <FaqSection />}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
