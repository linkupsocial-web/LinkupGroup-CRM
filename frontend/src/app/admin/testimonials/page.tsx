'use client';

import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { API_BASE, adminFetch } from '@/lib/adminApi';
import ImageUploadInput from '@/components/admin/ImageUploadInput';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineStar,
  HiOutlineX
} from 'react-icons/hi';

interface TestimonialItem {
  _id?: string;
  companyId: string;
  clientName: string;
  companyName: string;
  designation: string;
  profileImage: { url: string; publicId: string };
  cardImagePath?: string;
  review: string;
  rating: number;
  isVisible: boolean;
  displayOrder: number;
}

export default function TestimonialsAdminPage() {
  const { selectedCompany } = useAdminAuth();
  const [items, setItems] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<TestimonialItem | null>(null);

  const [formData, setFormData] = useState<TestimonialItem>({
    companyId: '',
    clientName: '',
    companyName: '',
    designation: '',
    profileImage: { url: '', publicId: '' },
    review: '',
    rating: 5,
    isVisible: true,
    displayOrder: 0
  });

  const fetchItems = async () => {
    if (!selectedCompany?._id) return;
    setLoading(true);
    try {
      const res = await adminFetch(`/testimonials?companyId=${selectedCompany._id}&includeHidden=true`);
      if (res.success && Array.isArray(res.data)) {
        setItems(res.data);
      }
    } catch {
      setItems([
        {
          _id: 't1',
          companyId: selectedCompany._id,
          clientName: 'Sarah Jenkins',
          companyName: 'TechScale Inc',
          designation: 'VP of Marketing',
          profileImage: { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', publicId: 'demo/sarah' },
          review: 'Linkup Group delivered extraordinary results for our brand campaign.',
          rating: 5,
          isVisible: true,
          displayOrder: 1
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [selectedCompany]);

  const handleOpenModal = async (item?: TestimonialItem) => {
    if (item?._id) {
      try {
        const res = await adminFetch(`/testimonials/${item._id}`);
        if (res.success && res.data) item = res.data;
      } catch (err: any) {
        alert(err.message || 'Could not load the full testimonial');
        return;
      }
    }

    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        companyId: selectedCompany?._id || '',
        clientName: '',
        companyName: '',
        designation: '',
        profileImage: { url: '', publicId: '' },
        review: '',
        rating: 5,
        isVisible: true,
        displayOrder: items.length + 1
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData, companyId: selectedCompany?._id || formData.companyId };
      if (editingItem?._id) {
        await adminFetch(`/testimonials/${editingItem._id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await adminFetch('/testimonials', { method: 'POST', body: JSON.stringify(payload) });
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Soft-delete this testimonial?')) return;
    try {
      await adminFetch(`/testimonials/${id}`, { method: 'DELETE' });
      setItems(items.filter(t => t._id !== id));
    } catch {
      setItems(items.filter(t => t._id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Testimonials Management</h1>
          <p className="text-base text-slate-600 mt-1">
            Client reviews for <span className="text-cyan-700 font-bold text-lg">{selectedCompany?.name}</span>
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-base flex items-center gap-2.5 shadow-md cursor-pointer transition-all"
        >
          <HiOutlinePlus className="w-5 h-5" />
          <span>Add Testimonial</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-8 text-center text-slate-500 text-lg font-medium">Loading testimonials...</div>
        ) : items.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-500 text-lg font-medium">No testimonials yet for this company.</div>
        ) : (
          items.map((item) => (
            <div key={item._id} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border-2 border-slate-300">
                      {(item.cardImagePath || item.profileImage?.url) ? (
                        <img src={item.cardImagePath ? `${API_BASE}${item.cardImagePath.replace(/^\/api/, '')}` : item.profileImage.url} alt={item.clientName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-cyan-700 text-base">
                          {item.clientName[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base">{item.clientName}</h4>
                      <p className="text-xs font-bold text-slate-500">{item.designation} {item.companyName && `at ${item.companyName}`}</p>
                    </div>
                  </div>
                  <div className="flex text-amber-500">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <HiOutlineStar key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-700 italic leading-relaxed line-clamp-3">&ldquo;{item.review}&rdquo;</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${item.isVisible ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                  {item.isVisible ? 'Visible' : 'Hidden'}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleOpenModal(item)} className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-cyan-700 hover:bg-cyan-50 border border-slate-200 transition-colors">
                    <HiOutlinePencil className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete(item._id!)} className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors">
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto pt-6 pb-12">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-xl w-full flex flex-col shadow-2xl my-auto max-h-[88vh] overflow-hidden relative">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-30 shadow-sm">
              <h3 className="font-extrabold text-2xl text-slate-900 tracking-tight">{editingItem ? 'Edit Testimonial' : 'Add Testimonial'}</h3>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                    placeholder="CEO, Founder..."
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Rating (1 - 5 stars)</label>
                  <select
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600 cursor-pointer"
                  >
                    {[5, 4, 3, 2, 1].map((num) => (
                      <option key={num} value={num} className="bg-white text-slate-900 font-bold">{num} Stars</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Review Content *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.review}
                  onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600 leading-relaxed"
                />
              </div>

              <ImageUploadInput
                label="Profile Image (Cloudinary)"
                value={formData.profileImage}
                onChange={(profileImage) => setFormData({ ...formData, profileImage })}
                folder="linkup_testimonials"
              />

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
                  {saving ? 'Saving...' : 'Save Testimonial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
