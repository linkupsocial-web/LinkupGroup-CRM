'use client';

import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { adminFetch } from '@/lib/adminApi';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineX
} from 'react-icons/hi';

interface FAQItem {
  _id?: string;
  companyId: string;
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
  isVisible: boolean;
}

export default function FaqsAdminPage() {
  const { selectedCompany } = useAdminAuth();
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);

  const [formData, setFormData] = useState<FAQItem>({
    companyId: '',
    question: '',
    answer: '',
    category: 'General',
    displayOrder: 0,
    isVisible: true
  });

  const fetchFaqs = async () => {
    if (!selectedCompany?._id) return;
    setLoading(true);
    try {
      const res = await adminFetch(`/faqs?companyId=${selectedCompany._id}&includeHidden=true`);
      if (res.success && Array.isArray(res.data)) {
        setFaqs(res.data);
      }
    } catch {
      setFaqs([
        {
          _id: 'fq1',
          companyId: selectedCompany._id,
          question: 'What timelines can we expect for project delivery?',
          answer: 'Typical projects take between 2 to 6 weeks depending on scope.',
          category: 'General',
          displayOrder: 1,
          isVisible: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, [selectedCompany]);

  const handleOpenModal = (item?: FAQItem) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        companyId: selectedCompany?._id || '',
        question: '',
        answer: '',
        category: 'General',
        displayOrder: faqs.length + 1,
        isVisible: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        // Keep an existing FAQ in its company; selectedCompany is only the default for a new FAQ.
        companyId: editingItem?.companyId || formData.companyId || selectedCompany?._id || ''
      };
      if (editingItem?._id) {
        await adminFetch(`/faqs/${editingItem._id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await adminFetch('/faqs', { method: 'POST', body: JSON.stringify(payload) });
      }
      setIsModalOpen(false);
      fetchFaqs();
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Soft-delete this FAQ?')) return;
    try {
      await adminFetch(`/faqs/${id}`, { method: 'DELETE' });
      setFaqs(faqs.filter(f => f._id !== id));
    } catch {
      setFaqs(faqs.filter(f => f._id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">FAQ Management</h1>
          <p className="text-base text-slate-600 mt-1">
            Frequently Asked Questions for <span className="text-cyan-700 font-bold text-lg">{selectedCompany?.name}</span>
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-base flex items-center gap-2.5 shadow-md cursor-pointer transition-all"
        >
          <HiOutlinePlus className="w-5 h-5" />
          <span>Add New FAQ</span>
        </button>
      </div>

      <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-lg font-medium">Loading FAQs...</div>
        ) : faqs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-lg font-medium">No FAQs created for this company yet.</div>
        ) : (
          faqs.map((faq) => (
            <div key={faq._id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="space-y-1.5 max-w-3xl min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded text-xs font-extrabold uppercase tracking-wider bg-cyan-50 text-cyan-800 border border-cyan-200 shrink-0">
                    {faq.category}
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 break-words">{faq.question}</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed break-words">{faq.answer}</p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${faq.isVisible ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                  {faq.isVisible ? 'Visible' : 'Hidden'}
                </span>
                <button onClick={() => handleOpenModal(faq)} className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-cyan-700 hover:bg-cyan-50 border border-slate-200 transition-colors">
                  <HiOutlinePencil className="w-5 h-5" />
                </button>
                <button onClick={() => handleDelete(faq._id!)} className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors">
                  <HiOutlineTrash className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto pt-6 pb-12">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-lg w-full flex flex-col shadow-2xl my-auto max-h-[88vh] overflow-hidden relative">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-30 shadow-sm">
              <h3 className="font-extrabold text-2xl text-slate-900 tracking-tight">{editingItem ? 'Edit FAQ' : 'Add New FAQ'}</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close Form"
              >
                <HiOutlineX className="w-8 h-8 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto max-h-[calc(88vh-80px)] space-y-5">
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Question *</label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Answer *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="faqVisible"
                  checked={formData.isVisible}
                  onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                  className="w-6 h-6 rounded bg-slate-50 border-2 border-slate-300 text-cyan-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="faqVisible" className="text-base font-extrabold text-slate-800 cursor-pointer">
                  Visible on Website
                </label>
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
                  {saving ? 'Saving...' : 'Save FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
