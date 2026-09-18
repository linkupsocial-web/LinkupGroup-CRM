'use client';

import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { adminFetch } from '@/lib/adminApi';
import { HiOutlineUserGroup, HiOutlinePlus, HiOutlineShieldCheck, HiOutlineMail, HiOutlineX, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  createdAt: string;
}

export default function UsersAdminPage() {
  const { user } = useAdminAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin'
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/auth/users');
      if (res.success && Array.isArray(res.data)) {
        setUsers(res.data);
      }
    } catch {
      setUsers([
        {
          _id: 'u1',
          name: user?.name || 'Super Admin',
          email: user?.email || '—',
          role: 'admin',
          isSuperAdmin: true,
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      setShowPassword(false);
      setFormData({ name: '', email: '', password: '', role: 'admin' });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Registration failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <HiOutlineUserGroup className="w-7 h-7 text-cyan-600" />
            <span>Admin Users & Roles</span>
          </h1>
          <p className="text-base text-slate-600 mt-1">Manage system administrators and CMS permission levels</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-base flex items-center gap-2.5 shadow-md cursor-pointer transition-all"
        >
          <HiOutlinePlus className="w-5 h-5" />
          <span>Add Admin User</span>
        </button>
      </div>

      <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[560px]">
          <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-extrabold border-b-2 border-slate-200 text-xs">
            <tr>
              <th className="p-4">User Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4 text-center">Super Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500 text-base font-medium">Loading admin users...</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-extrabold text-slate-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center font-bold text-cyan-700">
                      {u.name[0]}
                    </div>
                    <span>{u.name}</span>
                  </td>
                  <td className="p-4 text-slate-700 font-mono text-xs font-semibold flex items-center gap-1.5">
                    <HiOutlineMail className="w-4 h-4 text-slate-400" />
                    <span>{u.email}</span>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-cyan-50 text-cyan-800 border border-cyan-200">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {u.isSuperAdmin ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <HiOutlineShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Yes</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">No</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto pt-6 pb-12">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-md w-full flex flex-col shadow-2xl my-auto max-h-[88vh] overflow-hidden relative">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-30 shadow-sm">
              <h3 className="font-extrabold text-2xl text-slate-900 tracking-tight">Register New Administrator</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close Form"
              >
                <HiOutlineX className="w-8 h-8 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="p-6 space-y-5 overflow-y-auto max-h-[calc(88vh-80px)]">
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                />
              </div>
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                />
              </div>
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 pr-12 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-base font-bold rounded-xl border border-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-7 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-base rounded-xl cursor-pointer shadow-md transition-all"
                >
                  {saving ? 'Creating...' : 'Create Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
