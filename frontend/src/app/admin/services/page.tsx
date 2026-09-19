'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { API_BASE, adminFetch } from '@/lib/adminApi';
import ImageUploadInput from '@/components/admin/ImageUploadInput';
import SeoFormSection, { SEOFields } from '@/components/admin/SeoFormSection';
import RichTextEditor from '@/components/admin/RichTextEditor';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineViewGrid,
  HiOutlineViewList,
  HiOutlineTag,
  HiOutlineCheckCircle,
  HiOutlineQuestionMarkCircle,
} from 'react-icons/hi';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';

interface CompanyInfo {
  _id: string;
  name: string;
  code: string;
  slug?: string;
}

interface ServiceFAQ {
  question: string;
  answer: string;
}

interface ServiceItem {
  _id?: string;
  companyId: string | CompanyInfo;
  serviceName: string;
  title?: string;
  titleLines?: string[];
  slug: string;
  heading?: string;
  text?: string;
  shortDescription?: string;
  fullDescription?: string;
  tags?: string[];
  deliverables?: string[];
  faqs?: ServiceFAQ[];
  image?: { url: string; publicId: string };
  imageUrl?: string;
  imageAlt?: string;
  cardImagePath?: string;
  featured: boolean;
  isVisible: boolean;
  displayOrder: number;
  status?: 'Publish' | 'Draft' | 'Hide';
  seo?: SEOFields;
}

export default function ServicesAdminPage() {
  const { selectedCompany, companies } = useAdminAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingService, setViewingService] = useState<ServiceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);

  const [tagsInput, setTagsInput] = useState('');
  const [deliverablesInput, setDeliverablesInput] = useState('');

  const [formData, setFormData] = useState<ServiceItem>({
    companyId: '',
    serviceName: '',
    title: '',
    titleLines: [],
    slug: '',
    heading: '',
    text: '',
    shortDescription: '',
    fullDescription: '',
    tags: [],
    deliverables: [],
    faqs: [],
    image: { url: '', publicId: '' },
    imageUrl: '',
    imageAlt: '',
    featured: false,
    isVisible: true,
    displayOrder: 1,
    status: 'Publish',
    seo: {}
  });

  const fetchServices = async () => {
    setLoading(true);
    try {
      const activeFilter = companyFilter || 'all';
      const res = await adminFetch(`/services?companyId=${activeFilter}&includeHidden=true`);
      if (res.success && Array.isArray(res.data)) {
        setServices(res.data);
      }
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [companyFilter]);

  const renderServiceContent = (content: string | undefined) => {
    if (!content) {
      return <div className="text-slate-500 italic py-4">No content provided for this service.</div>;
    }

    const rawItems = content.split(/\n\n+/);
    const blocks: { type: 'h1' | 'h2' | 'h3' | 'list' | 'image' | 'p'; items: string[] }[] = [];

    rawItems.forEach((item) => {
      const trimmed = item.trim();
      if (!trimmed) return;

      const imgMatch = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        blocks.push({ type: 'image', items: [imgMatch[2], imgMatch[1] || 'Service image'] });
      } else if (trimmed.startsWith('### ')) {
        blocks.push({ type: 'h3', items: [trimmed.replace(/^###\s+/, '')] });
      } else if (trimmed.startsWith('## ')) {
        blocks.push({ type: 'h2', items: [trimmed.replace(/^##\s+/, '')] });
      } else if (trimmed.startsWith('# ')) {
        blocks.push({ type: 'h1', items: [trimmed.replace(/^#\s+/, '')] });
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const bulletLines = trimmed.split('\n').map(l => l.replace(/^[\*\-]\s+/, '').trim()).filter(Boolean);
        const lastBlock = blocks[blocks.length - 1];
        if (lastBlock && lastBlock.type === 'list') {
          lastBlock.items.push(...bulletLines);
        } else {
          blocks.push({ type: 'list', items: bulletLines });
        }
      } else {
        blocks.push({ type: 'p', items: [trimmed] });
      }
    });

    return (
      <div className="space-y-4 text-slate-900 text-base leading-relaxed font-normal">
        {blocks.map((block, idx) => {
          if (block.type === 'h1') {
            return <h1 key={idx} className="text-2xl sm:text-3xl font-black text-slate-900 mt-6 mb-3">{block.items[0]}</h1>;
          }
          if (block.type === 'h2') {
            return <h2 key={idx} className="text-xl sm:text-2xl font-black text-cyan-950 border-b-2 border-slate-200 pb-2 mt-6 mb-3">{block.items[0]}</h2>;
          }
          if (block.type === 'h3') {
            return <h3 key={idx} className="text-lg sm:text-xl font-extrabold text-slate-900 mt-4 mb-2">{block.items[0]}</h3>;
          }
          if (block.type === 'image') {
            return (
              <figure key={idx} className="my-4 space-y-2">
                <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950">
                  <img src={block.items[0]} alt={block.items[1]} className="w-full h-auto object-cover max-h-[450px]" />
                </div>
              </figure>
            );
          }
          if (block.type === 'list') {
            return (
              <ul key={idx} className="list-disc list-inside space-y-2 pl-3 font-bold text-slate-800 bg-slate-50 p-4 rounded-2xl border border-slate-200 my-3">
                {block.items.map((bullet, i) => (
                  <li key={i}>{bullet.replace(/\*\*(.*?)\*\*/g, '$1')}</li>
                ))}
              </ul>
            );
          }
          const formatted = block.items[0].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return <p key={idx} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />;
        })}
      </div>
    );
  };

  const handleOpenModal = async (item?: ServiceItem) => {
    if (item?._id) {
      try {
        const res = await adminFetch(`/services/${item._id}`);
        if (res.success && res.data) item = res.data;
      } catch (err: any) {
        alert(err.message || 'Could not load the full service');
        return;
      }
    }

    if (item) {
      setEditingItem(item);
      const compId = typeof item.companyId === 'object' ? item.companyId._id : item.companyId;
      const sName = item.serviceName || item.title || '';
      setFormData({
        ...item,
        companyId: compId || companies[0]?._id || '',
        serviceName: sName,
        title: sName,
        shortDescription: item.shortDescription || item.text || '',
        fullDescription: item.fullDescription || item.text || '',
        text: item.text || item.shortDescription || '',
        tags: item.tags || [],
        deliverables: item.deliverables || [],
        faqs: item.faqs || [],
        imageUrl: item.imageUrl || item.image?.url || '',
        image: item.image || { url: item.imageUrl || '', publicId: '' },
        status: item.status || (item.isVisible ? 'Publish' : 'Hide'),
        featured: item.featured ?? false,
        isVisible: item.isVisible ?? true,
        displayOrder: item.displayOrder ?? 1,
        seo: item.seo || {}
      });
      setTagsInput((item.tags || []).join(', '));
      setDeliverablesInput((item.deliverables || []).join('\n'));
    } else {
      setEditingItem(null);
      const defaultCompId = (companyFilter !== 'all' ? companyFilter : '') || selectedCompany?._id || companies[0]?._id || '';
      setFormData({
        companyId: defaultCompId,
        serviceName: '',
        title: '',
        titleLines: [],
        slug: '',
        heading: '',
        text: '',
        shortDescription: '',
        fullDescription: '',
        tags: [],
        deliverables: [],
        faqs: [],
        image: { url: '', publicId: '' },
        imageUrl: '',
        imageAlt: '',
        featured: false,
        isVisible: true,
        displayOrder: services.length + 1,
        status: 'Publish',
        seo: {}
      });
      setTagsInput('');
      setDeliverablesInput('');
    }
    setIsModalOpen(true);
  };

  const handleViewService = async (item: ServiceItem) => {
    try {
      const res = await adminFetch(`/services/${item._id || item.slug}`);
      if (res.success && res.data) setViewingService(res.data);
    } catch (err: any) {
      alert(err.message || 'Could not load the full service');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const deliverablesArray = deliverablesInput.split('\n').map(d => d.trim()).filter(Boolean);
      const sName = formData.serviceName || formData.title || '';
      const slugVal = formData.slug || sName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const summaryVal = formData.shortDescription || formData.text || '';
      const imgUrl = formData.imageUrl || formData.image?.url || '';
      const isVis = formData.status ? formData.status === 'Publish' : formData.isVisible;

      const payload = {
        ...formData,
        parentServiceId: null,
        isLocationService: false,
        companyId: formData.companyId || selectedCompany?._id || companies[0]?._id,
        serviceName: sName,
        title: sName,
        slug: slugVal,
        shortDescription: summaryVal,
        text: summaryVal,
        fullDescription: formData.fullDescription || summaryVal,
        imageUrl: imgUrl,
        image: { url: imgUrl, publicId: formData.image?.publicId || '' },
        tags: tagsArray,
        deliverables: deliverablesArray,
        isVisible: isVis,
        status: formData.status || (isVis ? 'Publish' : 'Hide')
      };

      if (editingItem?._id) {
        await adminFetch(`/services/${editingItem._id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await adminFetch('/services', { method: 'POST', body: JSON.stringify(payload) });
      }
      setIsModalOpen(false);
      fetchServices();
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id: string, newStatus: 'Draft' | 'Publish' | 'Hide') => {
    const isVis = newStatus === 'Publish';
    try {
      await adminFetch(`/services/${id}/visibility`, { method: 'PATCH', body: JSON.stringify({ isVisible: isVis }) });
      setServices(services.map(s => s._id === id ? { ...s, isVisible: isVis, status: newStatus } : s));
    } catch {
      setServices(services.map(s => s._id === id ? { ...s, isVisible: isVis, status: newStatus } : s));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to soft-delete this service?')) return;
    try {
      await adminFetch(`/services/${id}`, { method: 'DELETE' });
      setServices(services.filter(s => s._id !== id));
    } catch {
      setServices(services.filter(s => s._id !== id));
    }
  };

  // FAQ management helpers
  const addFAQ = () => {
    setFormData(prev => ({
      ...prev,
      faqs: [...(prev.faqs || []), { question: '', answer: '' }]
    }));
  };

  const updateFAQ = (index: number, field: keyof ServiceFAQ, value: string) => {
    setFormData(prev => {
      const updated = [...(prev.faqs || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, faqs: updated };
    });
  };

  const removeFAQ = (index: number) => {
    setFormData(prev => ({
      ...prev,
      faqs: (prev.faqs || []).filter((_, i) => i !== index)
    }));
  };

  const getCompanyName = (comp: string | CompanyInfo) => {
    if (typeof comp === 'object' && comp?.name) return comp.name;
    if (comp === 'all') return 'All Companies';
    const found = companies.find(c => c._id === comp);
    return found ? found.name : 'Linkup Group';
  };

  const getCompanyCode = (comp: string | CompanyInfo) => {
    if (typeof comp === 'object' && comp?.code) return comp.code;
    const found = companies.find(c => c._id === comp);
    return found ? found.code : 'CMS';
  };

  const filteredServices = services.filter(s => {
    const nameMatch = (s.serviceName || s.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const headingMatch = (s.heading || '').toLowerCase().includes(searchTerm.toLowerCase());
    const tagsMatch = (s.tags || []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSearch = nameMatch || headingMatch || tagsMatch;

    if (companyFilter === 'all') {
      return matchesSearch;
    } else {
      const sCompId = typeof s.companyId === 'object' ? (s.companyId as any)?._id : s.companyId;
      return matchesSearch && (sCompId === companyFilter || !sCompId);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Services Management</h1>
          <p className="text-base text-slate-600 mt-1 font-bold">
            Services and offerings for <span className="text-cyan-700 font-extrabold text-lg">{getCompanyName(companyFilter)}</span>
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl text-base flex items-center gap-2.5 shadow-md cursor-pointer transition-all hover:scale-[1.02]"
        >
          <HiOutlinePlus className="w-6 h-6" />
          <span>Add New Service</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <HiOutlineSearch className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search services by name, heading, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <HiOutlineBuildingOffice2 className="w-5 h-5 text-cyan-600" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-600 cursor-pointer"
            >
              <option value="all">All Companies</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              title="Grid View"
            >
              <HiOutlineViewGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              title="Table View"
            >
              <HiOutlineViewList className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center text-slate-600 text-lg font-bold bg-white rounded-2xl border-2 border-slate-200">
          Loading services...
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="p-12 text-center text-slate-600 text-lg font-bold bg-white rounded-2xl border-2 border-slate-200">
          No services found. Click "Add New Service" to create one.
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => {
            const imgUrl = service.cardImagePath
              ? `${API_BASE}${service.cardImagePath.replace(/^\/api/, '')}`
              : service.image?.url || service.imageUrl;
            const currentStatus = service.status || (service.isVisible ? 'Publish' : 'Hide');

            return (
              <div
                key={service._id || service.slug || service.serviceName}
                className="bg-white border-2 border-slate-200 hover:border-cyan-500 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 group"
              >
                <div>
                  {/* Card Thumbnail */}
                  <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden border-b border-slate-200">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={service.serviceName || service.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                        NO IMAGE PROVIDED
                      </div>
                    )}

                    <span className="absolute top-3 left-3 px-3 py-1.5 rounded-xl text-xs font-black bg-white/95 backdrop-blur-md text-cyan-800 border border-cyan-200 shadow-sm">
                      {getCompanyCode(service.companyId)} — {getCompanyName(service.companyId)}
                    </span>

                    <span
                      className={`absolute top-3 right-3 text-xs font-extrabold px-3 py-1 rounded-full border shadow-sm ${
                        currentStatus === 'Publish'
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : currentStatus === 'Draft'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-slate-700 text-white border-slate-800'
                      }`}
                    >
                      {currentStatus}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span className="font-mono text-cyan-700 font-bold bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                        /{service.slug}
                      </span>
                      <span>Order: #{service.displayOrder}</span>
                    </div>

                    <h3 className="font-black text-xl text-slate-900 leading-snug line-clamp-2">
                      <Link href={`/admin/services/${service.slug}`} className="hover:text-cyan-700 transition-colors">
                        {service.serviceName || service.title}
                      </Link>
                    </h3>

                    {service.heading && (
                      <p className="text-xs font-bold text-cyan-700 uppercase tracking-wide">
                        {service.heading}
                      </p>
                    )}

                    <p className="text-sm font-medium text-slate-600 line-clamp-3 leading-relaxed">
                      {service.shortDescription || service.text || 'No description provided.'}
                    </p>

                    {/* Deliverables Highlights Preview */}
                    {service.deliverables && service.deliverables.length > 0 && (
                      <div className="bg-cyan-50/50 p-3 rounded-xl border border-cyan-100 space-y-1">
                        <span className="text-[10px] font-black uppercase text-cyan-800 tracking-wider block">Key Deliverables</span>
                        <p className="text-xs font-bold text-slate-800 truncate">✓ {service.deliverables[0]}</p>
                      </div>
                    )}

                    {/* FAQs Counter Preview */}
                    {service.faqs && service.faqs.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <HiOutlineQuestionMarkCircle className="w-4 h-4 text-cyan-600" />
                        <span>{service.faqs.length} FAQs included</span>
                      </div>
                    )}

                    {/* Tags */}
                    {service.tags && service.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {service.tags.map((tag, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-slate-200">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-6 pt-0 flex items-center justify-between border-t border-slate-100 mt-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewService(service)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
                      title="Quick Preview Modal"
                    >
                      <HiOutlineEye className="w-4 h-4" />
                      <span>Quick View</span>
                    </button>
                    <Link
                      href={`/admin/services/${service.slug}`}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-extrabold text-xs border border-cyan-200 transition-colors cursor-pointer"
                    >
                      <span>Read Details</span>
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(service)}
                      className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:text-cyan-700 hover:bg-cyan-50 border border-slate-200 transition-colors cursor-pointer"
                      title="Edit Service"
                    >
                      <HiOutlinePencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(service._id!)}
                      className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer"
                      title="Delete Service"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[640px]">
              <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-extrabold border-b-2 border-slate-200 text-xs">
                <tr>
                  <th className="p-4">Service Title</th>
                  <th className="p-4">Company</th>
                  <th className="p-4">Deliverables & FAQs</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredServices.map((service) => {
                  const imgUrl = service.image?.url || service.imageUrl;
                  const currentStatus = service.status || (service.isVisible ? 'Publish' : 'Hide');

                  return (
                    <tr key={service._id || service.slug || service.serviceName} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-900 to-slate-900 overflow-hidden border border-slate-300 flex-shrink-0 flex items-center justify-center">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={service.serviceName || service.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <HiOutlineDocumentText className="w-7 h-7 text-cyan-300" />
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-base hover:text-cyan-700 transition-colors line-clamp-1">
                              <Link href={`/admin/services/${service.slug}`}>
                                {service.serviceName || service.title}
                              </Link>
                            </div>
                            <div className="text-cyan-700 font-mono text-xs font-bold mt-0.5">/{service.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-300">
                          {getCompanyName(service.companyId)}
                        </span>
                        {service.heading && <p className="text-xs font-bold text-slate-500 mt-1.5">{service.heading}</p>}
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-bold text-slate-700 space-y-1">
                          <p>Deliverables: {service.deliverables?.length || 0}</p>
                          <p className="text-cyan-700">FAQs: {service.faqs?.length || 0}</p>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <select
                          value={currentStatus}
                          onChange={(e) => changeStatus(service._id!, e.target.value as any)}
                          className={`text-xs font-extrabold px-3 py-1.5 rounded-full border cursor-pointer ${
                            currentStatus === 'Publish'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : currentStatus === 'Draft'
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : 'bg-slate-100 text-slate-500 border-slate-300'
                          }`}
                        >
                          <option value="Draft" className="bg-white text-slate-900 font-bold">Draft</option>
                          <option value="Publish" className="bg-white text-slate-900 font-bold">Publish</option>
                          <option value="Hide" className="bg-white text-slate-900 font-bold">Hide</option>
                        </select>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleViewService(service)}
                          className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-cyan-700 hover:bg-slate-200 border border-slate-200 transition-colors"
                          title="Quick View"
                        >
                          <HiOutlineEye className="w-5 h-5" />
                        </button>
                        <Link
                          href={`/admin/services/${service.slug}`}
                          className="inline-block p-2 rounded-xl bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200 transition-colors"
                          title="View Service Details Page"
                        >
                          <HiOutlineDocumentText className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleOpenModal(service)}
                          className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-cyan-700 hover:bg-cyan-50 border border-slate-200 transition-colors"
                          title="Edit Service"
                        >
                          <HiOutlinePencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(service._id!)}
                          className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors"
                          title="Delete Service"
                        >
                          <HiOutlineTrash className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FULL SERVICE READER MODAL (Exact match with Blog Reader Modal) */}
      {viewingService && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto pt-6 pb-12">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-3xl w-full flex flex-col shadow-2xl my-auto max-h-[90vh] overflow-hidden relative">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-30 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-cyan-50 text-cyan-800 border border-cyan-200">
                  {getCompanyName(viewingService.companyId)}
                </span>
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                  (viewingService.status === 'Publish' || viewingService.isVisible)
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-100 text-slate-500 border-slate-300'
                }`}>
                  {viewingService.status || (viewingService.isVisible ? 'Publish' : 'Hide')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingService(null)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close Reader"
              >
                <HiOutlineX className="w-8 h-8 stroke-[2.5]" />
              </button>
            </div>

            {/* Reader Content Body */}
            <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
              {/* Banner Image */}
              {(viewingService.image?.url || viewingService.imageUrl) && (
                <div className="w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                  <img
                    src={viewingService.image?.url || viewingService.imageUrl}
                    alt={viewingService.serviceName || viewingService.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Title & Metadata */}
              <div className="space-y-3">
                <h2 className="text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
                  {viewingService.serviceName || viewingService.title}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-600 pt-1 border-b border-slate-200 pb-4">
                  <span className="flex items-center gap-1.5">
                    <HiOutlineBuildingOffice2 className="w-5 h-5 text-cyan-600" />
                    <span>Company: {getCompanyName(viewingService.companyId)}</span>
                  </span>
                  <span>•</span>
                  <span className="font-mono text-cyan-700 text-xs">/{viewingService.slug}</span>
                  {viewingService.heading && (
                    <>
                      <span>•</span>
                      <span className="text-xs font-bold text-cyan-800">{viewingService.heading}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Short Summary Box */}
              {(viewingService.shortDescription || viewingService.text) && (
                <div className="bg-cyan-50/60 border-l-4 border-cyan-600 p-4 rounded-r-2xl text-slate-800 font-bold text-base italic leading-relaxed">
                  &ldquo;{viewingService.shortDescription || viewingService.text}&rdquo;
                </div>
              )}

              {/* Deliverables Box */}
              {viewingService.deliverables && viewingService.deliverables.length > 0 && (
                <div className="bg-slate-50 border-2 border-slate-200 p-5 rounded-2xl space-y-2.5">
                  <h4 className="text-xs font-black uppercase text-cyan-800 tracking-wider flex items-center gap-1.5">
                    <span>Key Deliverables</span>
                  </h4>
                  <ul className="space-y-1.5 pl-1">
                    {viewingService.deliverables.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm font-bold text-slate-800">
                        <span className="text-cyan-600 font-black shrink-0">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Main Body Content */}
              <div className="border-t border-slate-100 pt-4">
                {renderServiceContent(viewingService.fullDescription || viewingService.text)}
              </div>

              {/* FAQs Section */}
              {viewingService.faqs && viewingService.faqs.length > 0 && (
                <div className="border-t border-slate-200 pt-6 space-y-3">
                  <h4 className="text-sm font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                    <HiOutlineQuestionMarkCircle className="w-5 h-5 text-cyan-600" />
                    <span>Frequently Asked Questions</span>
                  </h4>
                  <div className="space-y-2.5">
                    {viewingService.faqs.map((faq, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <p className="font-bold text-slate-900 text-sm">Q: {faq.question}</p>
                        <p className="font-medium text-slate-600 text-sm pl-3 border-l-2 border-cyan-600">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {viewingService.tags && viewingService.tags.length > 0 && (
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2.5 flex items-center gap-1.5">
                    <HiOutlineTag className="w-4 h-4 text-cyan-600" />
                    <span>Service Tags</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingService.tags.map((tag, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-800 px-3 py-1 rounded-xl text-sm font-extrabold border border-slate-300">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Modal Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const serv = viewingService;
                    setViewingService(null);
                    handleOpenModal(serv);
                  }}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-base rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <HiOutlinePencil className="w-5 h-5" />
                  <span>Edit This Service</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingService(null)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-base font-bold rounded-xl border border-slate-300 transition-colors"
                >
                  Close Reader
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT FORM MODAL (Exact match with Blog Create / Edit Form Modal) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto pt-6 pb-12">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-4xl w-full flex flex-col shadow-2xl my-auto max-h-[88vh] overflow-hidden relative">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-30 shadow-sm">
              <h3 className="font-extrabold text-2xl text-slate-900 tracking-tight">
                {editingItem ? 'Edit Service' : 'Create Service'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close Form"
              >
                <HiOutlineX className="w-8 h-8 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 text-base">
              {/* Company Selector */}
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Assigned Company *</label>
                <select
                  required
                  value={typeof formData.companyId === 'string' ? formData.companyId : (formData.companyId as CompanyInfo)?._id}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600 cursor-pointer"
                >
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Service Title / Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.serviceName || formData.title || ''}
                    onChange={(e) => {
                      const title = e.target.value;
                      setFormData({
                        ...formData,
                        serviceName: title,
                        title,
                        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                      });
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                    placeholder="e.g. Website Strategy & UX"
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-mono font-bold text-cyan-800 focus:outline-none focus:border-cyan-600"
                    placeholder="website-strategy-ux"
                  />
                </div>
              </div>

              {/* Tagline / Heading & Display Order */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-base font-bold text-slate-800 mb-2">Tagline / Sub-Heading</label>
                  <input
                    type="text"
                    value={formData.heading || ''}
                    onChange={(e) => setFormData({ ...formData, heading: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                    placeholder="e.g. Strategic Wireframing & Site Architecture"
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

              {/* Status & Featured */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Publish Status</label>
                  <select
                    value={formData.status || (formData.isVisible ? 'Publish' : 'Hide')}
                    onChange={(e) => {
                      const st = e.target.value as any;
                      setFormData({
                        ...formData,
                        status: st,
                        isVisible: st === 'Publish'
                      });
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600 cursor-pointer"
                  >
                    <option value="Draft" className="bg-white text-slate-900 font-bold">Draft</option>
                    <option value="Publish" className="bg-white text-slate-900 font-bold">Publish</option>
                    <option value="Hide" className="bg-white text-slate-900 font-bold">Hide</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-6 sm:pt-8">
                  <input
                    type="checkbox"
                    id="service-featured"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-6 h-6 rounded text-cyan-600 border-slate-300 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="service-featured" className="text-base font-bold text-slate-800 cursor-pointer">
                    Featured Service
                  </label>
                </div>
              </div>

              {/* Short Summary / Excerpt */}
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Short Summary / Excerpt</label>
                <textarea
                  rows={2}
                  value={formData.shortDescription || formData.text || ''}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value, text: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600 leading-relaxed"
                  placeholder="Brief 1-2 sentence overview for cards and summaries..."
                />
              </div>

              {/* Deliverables / Highlights (1 per line) */}
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Deliverables (1 per line)</label>
                <textarea
                  rows={3}
                  value={deliverablesInput}
                  onChange={(e) => setDeliverablesInput(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600 leading-relaxed"
                  placeholder="High-fidelity wireframes&#10;Interactive prototype&#10;Site architecture map"
                />
              </div>

              {/* Full Rich Text Content */}
              <RichTextEditor
                label="Full Service Content (Markdown / HTML)"
                value={formData.fullDescription || formData.text || ''}
                onChange={(content) => setFormData({ ...formData, fullDescription: content })}
                rows={10}
              />

              {/* ADDITIONAL FAQs SECTION */}
              <div className="border-2 border-slate-200 bg-slate-50 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <HiOutlineQuestionMarkCircle className="w-5 h-5 text-cyan-600" />
                      <span>Frequently Asked Questions (FAQs)</span>
                    </h4>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">Add common questions and answers for this specific service</p>
                  </div>
                  <button
                    type="button"
                    onClick={addFAQ}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <HiOutlinePlus className="w-4 h-4" />
                    <span>Add FAQ</span>
                  </button>
                </div>

                {(formData.faqs || []).length === 0 ? (
                  <p className="text-center py-4 text-xs font-bold text-slate-400 border border-dashed border-slate-300 rounded-xl">
                    No FAQs added yet. Click &quot;Add FAQ&quot; above to add one.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.faqs!.map((faq, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 relative">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black uppercase text-cyan-700 tracking-wider">FAQ #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeFAQ(idx)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <HiOutlineTrash className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => updateFAQ(idx, 'question', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                          placeholder="Question (e.g. How long does this service take?)"
                        />
                        <textarea
                          rows={2}
                          value={faq.answer}
                          onChange={(e) => updateFAQ(idx, 'answer', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                          placeholder="Answer to this question..."
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-mono font-bold text-cyan-800 focus:outline-none focus:border-cyan-600"
                  placeholder="UX Design, Strategy, Architecture"
                />
              </div>

              {/* Image Input */}
              <div className="space-y-2">
                <label className="block text-base font-bold text-slate-800">Featured Image URL / Asset Path</label>
                <input
                  type="text"
                  value={formData.imageUrl || formData.image?.url || ''}
                  onChange={(e) => {
                    const url = e.target.value;
                    setFormData({
                      ...formData,
                      imageUrl: url,
                      image: { url, publicId: formData.image?.publicId || '' }
                    });
                  }}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 text-base font-mono font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                  placeholder="/assets/services/service1.jpg or https://..."
                />
              </div>

              <ImageUploadInput
                label="Or Upload Banner Image to Cloudinary"
                value={formData.image || { url: '', publicId: '' }}
                onChange={(image) => setFormData({ ...formData, image, imageUrl: image.url })}
                folder="linkup_services"
              />

              {/* SEO Section */}
              <SeoFormSection
                seo={formData.seo || {}}
                onChange={(seo) => setFormData({ ...formData, seo })}
              />

              {/* Footer Actions */}
              <div className="pt-4 sm:pt-5 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm sm:text-base font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm sm:text-base rounded-xl cursor-pointer shadow-md transition-all"
                >
                  {saving ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
