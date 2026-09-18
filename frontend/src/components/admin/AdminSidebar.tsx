'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HiOutlineHome,
  HiOutlineBriefcase,
  HiOutlineFolderOpen,
  HiOutlineChatAlt2,
  HiOutlineQuestionMarkCircle,
  HiOutlineDocumentText,
  HiOutlineBookOpen,
  HiOutlineGlobeAlt,
  HiOutlineUserGroup,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineX
} from 'react-icons/hi';
import { useAdminAuth } from '@/context/AdminAuthContext';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: HiOutlineHome },
  { name: 'Services', href: '/admin/services', icon: HiOutlineBriefcase },
  { name: 'Projects', href: '/admin/projects', icon: HiOutlineFolderOpen },
  { name: 'Testimonials', href: '/admin/testimonials', icon: HiOutlineChatAlt2 },
  { name: 'FAQs', href: '/admin/faqs', icon: HiOutlineQuestionMarkCircle },
  { name: 'Blogs & Insights', href: '/admin/blogs', icon: HiOutlineDocumentText },
  { name: 'Case Studies', href: '/admin/case-studies', icon: HiOutlineBookOpen },
  { name: 'SEO Management', href: '/admin/seo', icon: HiOutlineGlobeAlt },
  { name: 'Users & Roles', href: '/admin/users', icon: HiOutlineUserGroup },
  { name: 'Global Settings', href: '/admin/settings', icon: HiOutlineCog },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAdminAuth();

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer */}
      <aside
        className={[
          'fixed top-0 left-0 h-screen z-50 w-64',
          'lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:w-64',
          'bg-white text-slate-800 flex flex-col border-r border-slate-200 shadow-sm flex-shrink-0',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <Link href="/admin" className="flex items-center gap-3" onClick={onClose}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-black text-white shadow-md text-lg">
              L
            </div>
            <div>
              <h1 className="font-extrabold text-base leading-tight tracking-wide text-slate-900">LINKUP GROUP</h1>
              <p className="text-xs text-cyan-700 font-bold">Central CMS Admin</p>
            </div>
          </Link>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            aria-label="Close sidebar"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase px-3 mb-2">
            CMS Modules
          </div>
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-cyan-50 text-cyan-700 border-l-4 border-cyan-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-cyan-600' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Admin Info */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-xs border border-cyan-200 flex-shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'A'}
              </div>
              <div className="truncate min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Administrator'}</p>
                <p className="text-[11px] text-slate-500 font-medium truncate">{user?.email || '—'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors font-bold text-xs cursor-pointer flex-shrink-0"
            >
              <HiOutlineLogout className="w-4 h-4 stroke-[2]" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </aside>

    </>
  );
}
