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
  HiOutlineCalendar,
  HiOutlineUser,
  HiOutlineTag,
  HiOutlineOfficeBuilding
} from 'react-icons/hi';

interface CaseStudyItem {
  _id?: string;
  companyId: string | { _id: string; name: string; code: string };
  id?: string;
  title: string;
  slug: string;
  category: string;
  client?: string;
  featuredImage: { url: string; publicId: string };
  image?: string;
  imageUrl?: string;
  cardImagePath?: string;
  shortDescription: string;
  excerpt?: string;
  content: string | string[];
  author: string;
  authorRole?: string;
  readTime?: string;
  highlights?: string[];
  tags: string[];
  publishDate: string;
  date?: string;
  status: 'Draft' | 'Publish' | 'Hide';
  seo?: SEOFields;
}

export default function CaseStudiesAdminPage() {
  const { selectedCompany, companies } = useAdminAuth();
  const [caseStudies, setCaseStudies] = useState<CaseStudyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingCaseStudy, setViewingCaseStudy] = useState<CaseStudyItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<CaseStudyItem | null>(null);

  const [tagsInput, setTagsInput] = useState('');
  const [highlightsInput, setHighlightsInput] = useState('');

  const [formData, setFormData] = useState<CaseStudyItem>({
    companyId: '',
    title: '',
    slug: '',
    category: 'Case Study',
    client: '',
    featuredImage: { url: '', publicId: '' },
    shortDescription: '',
    content: '',
    author: 'LinkUp Web Team',
    authorRole: 'Editorial & Tech Team',
    readTime: '6 min read',
    highlights: [],
    tags: [],
    publishDate: new Date().toISOString().split('T')[0],
    status: 'Publish',
    seo: {}
  });

  useEffect(() => {
    if (selectedCompany?._id) {
      setCompanyFilter(selectedCompany._id);
    }
  }, [selectedCompany]);

  const fetchCaseStudies = async () => {
    setLoading(true);
    try {
      const activeFilter = companyFilter || 'all';
      const res = await adminFetch(`/case-studies?companyId=${activeFilter}&includeAll=true`);
      if (res.success && Array.isArray(res.data)) {
        setCaseStudies(res.data);
      }
    } catch {
      setCaseStudies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseStudies();
  }, [companyFilter]);

  const renderContent = (content: string | string[]) => {
    let rawItems: string[] = [];
    if (Array.isArray(content)) {
      rawItems = content;
    } else if (typeof content === 'string') {
      rawItems = content.split(/\n\n+/);
    }

    if (!rawItems || rawItems.length === 0) {
      return <div className="text-slate-500 italic py-4">No content provided for this case study.</div>;
    }

    const blocks: { type: 'h1' | 'h2' | 'h3' | 'list' | 'image' | 'p'; items: string[] }[] = [];

    rawItems.forEach((item) => {
      const trimmed = item.trim();
      if (!trimmed) return;

      const imgMatch = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        blocks.push({ type: 'image', items: [imgMatch[2], imgMatch[1] || 'Case study image'] });
      } else if (trimmed.startsWith('<img')) {
        const srcMatch = trimmed.match(/src=["'](.*?)["']/);
        const altMatch = trimmed.match(/alt=["'](.*?)["']/);
        if (srcMatch && srcMatch[1]) {
          blocks.push({ type: 'image', items: [srcMatch[1], altMatch ? altMatch[1] : 'Case study image'] });
        }
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
      <div className="space-y-4 text-slate-900 text-base sm:text-lg leading-relaxed font-normal">
        {blocks.map((block, idx) => {
          if (block.type === 'h1') {
            return <h1 key={idx} className="text-3xl font-black text-slate-900 mt-8 mb-4">{block.items[0]}</h1>;
          }
          if (block.type === 'h2') {
            return <h2 key={idx} className="text-2xl font-black text-cyan-950 border-b-2 border-slate-200 pb-2 mt-8 mb-3">{block.items[0]}</h2>;
          }
          if (block.type === 'h3') {
            return <h3 key={idx} className="text-xl font-extrabold text-slate-900 mt-6 mb-2">{block.items[0]}</h3>;
          }
          if (block.type === 'image') {
            return (
              <figure key={idx} className="my-6 space-y-2">
                <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-950">
                  <img src={block.items[0]} alt={block.items[1]} className="w-full h-auto object-cover max-h-[550px]" />
                </div>
                {block.items[1] && block.items[1] !== 'Case study image' && (
                  <figcaption className="text-center text-xs font-bold text-slate-500 italic">
                    📷 {block.items[1]}
                  </figcaption>
                )}
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

  const handleOpenModal = async (item?: CaseStudyItem) => {
    if (item?._id) {
      try {
        const res = await adminFetch(`/case-studies/${item._id}`);
        if (res.success && res.data) item = res.data;
      } catch (err: any) {
        alert(err.message || 'Could not load the full case study');
        return;
      }
    }

    if (item) {
      setEditingItem(item);
      let contentStr = '';
      if (Array.isArray(item.content)) {
        const parts: string[] = [];
        item.content.forEach((line) => {
          const trimmed = line.trim();
          if (trimmed) parts.push(trimmed);
        });
        const joined: string[] = [];
        parts.forEach((p, idx) => {
          const prev = parts[idx - 1] || '';
          const isBullet = p.startsWith('* ') || p.startsWith('- ');
          const prevIsBullet = prev.startsWith('* ') || prev.startsWith('- ');
          if (isBullet && prevIsBullet) {
            joined.push(p);
          } else {
            if (idx > 0) joined.push('');
            joined.push(p);
          }
        });
        contentStr = joined.join('\n');
      } else {
        contentStr = item.content || '';
      }

      setFormData({
        ...item,
        client: item.client || '',
        shortDescription: item.shortDescription || item.excerpt || '',
        content: contentStr
      });
      setTagsInput((item.tags || []).join(', '));
      setHighlightsInput((item.highlights || []).join('\n'));
    } else {
      setEditingItem(null);
      const defaultCompId = (companyFilter !== 'all' ? companyFilter : '') || selectedCompany?._id || companies[0]?._id || '';
      setFormData({
        companyId: defaultCompId,
        title: '',
        slug: '',
        category: 'Case Study',
        client: '',
        featuredImage: { url: '', publicId: '' },
        shortDescription: '',
        content: '',
        author: 'LinkUp Web Team',
        authorRole: 'Editorial & Tech Team',
        readTime: '6 min read',
        highlights: [],
        tags: [],
        publishDate: new Date().toISOString().split('T')[0],
        status: 'Publish',
        seo: {}
      });
      setTagsInput('');
      setHighlightsInput('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const highlightsArray = highlightsInput.split('\n').map(h => h.trim()).filter(Boolean);
      const imgUrl = formData.featuredImage?.url || formData.image || formData.imageUrl || '';
      const slugVal = formData.slug || formData.id || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const excerptVal = formData.excerpt || formData.shortDescription || '';
      const dateVal = formData.publishDate || formData.date || new Date().toISOString().split('T')[0];
      const formCompanyId = typeof formData.companyId === 'object' ? formData.companyId._id : formData.companyId;
      const editingCompanyId = editingItem
        ? (typeof editingItem.companyId === 'object' ? editingItem.companyId._id : editingItem.companyId)
        : '';

      const contentVal = typeof formData.content === 'string'
        ? formData.content.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
        : formData.content;

      const payload = {
        ...formData,
        // Editing a record must never move it to the globally selected company.
        companyId: editingCompanyId || formCompanyId || selectedCompany?._id || '',
        id: slugVal,
        slug: slugVal,
        excerpt: excerptVal,
        shortDescription: excerptVal,
        date: dateVal,
        publishDate: dateVal,
        image: imgUrl,
        imageUrl: imgUrl,
        featuredImage: { url: imgUrl, publicId: formData.featuredImage?.publicId || '' },
        content: contentVal,
        tags: tagsArray,
        highlights: highlightsArray
      };

      if (editingItem?._id) {
        await adminFetch(`/case-studies/${editingItem._id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await adminFetch('/case-studies', { method: 'POST', body: JSON.stringify(payload) });
      }
      setIsModalOpen(false);
      fetchCaseStudies();
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id: string, newStatus: 'Draft' | 'Publish' | 'Hide') => {
    try {
      await adminFetch(`/case-studies/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      setCaseStudies(caseStudies.map(b => b._id === id ? { ...b, status: newStatus } : b));
    } catch {
      setCaseStudies(caseStudies.map(b => b._id === id ? { ...b, status: newStatus } : b));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Soft-delete this case study?')) return;
    try {
      await adminFetch(`/case-studies/${id}`, { method: 'DELETE' });
      setCaseStudies(caseStudies.filter(b => b._id !== id));
    } catch {
      setCaseStudies(caseStudies.filter(b => b._id !== id));
    }
  };

  const getCompanyName = (comp: string | { _id: string; name: string; code: string }) => {
    if (typeof comp === 'object' && comp?.name) return comp.name;
    if (comp === 'all') return 'All Companies';
    const found = companies.find(c => c._id === comp);
    return found ? found.name : 'Linkup Web';
  };

  const filteredCaseStudies = caseStudies.filter(b => {
    const titleMatch = (b.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const categoryMatch = (b.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const clientMatch = (b.client || '').toLowerCase().includes(searchTerm.toLowerCase());
    const tagsMatch = (b.tags || []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSearch = titleMatch || categoryMatch || clientMatch || tagsMatch;

    if (companyFilter === 'all') {
      return matchesSearch;
    } else {
      const bCompId = typeof b.companyId === 'object' ? (b.companyId as any)?._id : b.companyId;
      return matchesSearch && (bCompId === companyFilter || !bCompId);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Case Studies Management</h1>
          <p className="text-base text-slate-600 mt-1 font-bold">
            Client success stories and portfolio case studies for <span className="text-cyan-700 font-extrabold text-lg">{getCompanyName(companyFilter)}</span>
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-base flex items-center gap-2.5 shadow-md cursor-pointer transition-all"
        >
          <HiOutlinePlus className="w-5 h-5" />
          <span>Create Case Study</span>
        </button>
      </div>

      {/* Filter & View Mode Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 sm:gap-4 bg-white p-3.5 sm:p-4 rounded-2xl border-2 border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <HiOutlineSearch className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search case studies by title, client, category, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pl-11 pr-4 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="bg-slate-50 border-2 border-slate-300 hover:border-cyan-600 text-cyan-800 font-extrabold text-xs sm:text-base rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:border-cyan-600 cursor-pointer w-full sm:w-auto min-w-0 truncate max-w-full"
          >
            <option value="all" className="bg-white text-cyan-700 font-bold">🌐 All Companies</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id} className="bg-white text-slate-900 font-bold">
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-center gap-1 border-2 border-slate-200 rounded-xl p-1 bg-slate-50 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HiOutlineViewGrid className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HiOutlineViewList className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-lg font-medium shadow-sm">
          Loading case studies...
        </div>
      ) : filteredCaseStudies.length === 0 ? (
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-lg font-medium shadow-sm">
          No case studies found for {getCompanyName(companyFilter)}.
        </div>
      ) : viewMode === 'grid' ? (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCaseStudies.map((cs) => {
            const imgUrl = cs.cardImagePath
              ? `${API_BASE}${cs.cardImagePath.replace(/^\/api/, '')}`
              : cs.featuredImage?.url || cs.image || cs.imageUrl;
            return (
              <div
                key={cs._id || cs.slug || cs.title}
                className="bg-white border-2 border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Banner Thumbnail */}
                  <div className="relative aspect-video bg-gradient-to-br from-cyan-900 via-slate-900 to-blue-950 overflow-hidden border-b border-slate-200">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={cs.title}
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : null}

                    {/* Overlay Title fallback if image fails or missing */}
                    <div className="absolute inset-0 p-5 flex flex-col justify-end bg-gradient-to-t from-slate-950/80 via-transparent to-transparent z-0">
                      <div className="text-[11px] font-black uppercase text-cyan-300 tracking-wider mb-1">{cs.category}</div>
                      <div className="font-extrabold text-sm line-clamp-2 text-white drop-shadow-sm">{cs.title}</div>
                    </div>

                    {/* Badges Overlay */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap z-10">
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/90 text-cyan-900 shadow-sm border border-slate-200 backdrop-blur-sm">
                        {cs.category}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 z-10">
                      <select
                        value={cs.status}
                        onChange={(e) => changeStatus(cs._id!, e.target.value as any)}
                        className={`text-xs font-extrabold px-3 py-1 rounded-full border shadow-md cursor-pointer ${
                          cs.status === 'Publish'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : cs.status === 'Draft'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        <option value="Draft" className="bg-white text-slate-900 font-bold">Draft</option>
                        <option value="Publish" className="bg-white text-slate-900 font-bold">Publish</option>
                        <option value="Hide" className="bg-white text-slate-900 font-bold">Hide</option>
                      </select>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                      {cs.client && (
                        <span className="flex items-center gap-1 text-cyan-800 font-extrabold">
                          <HiOutlineOfficeBuilding className="w-4 h-4 text-cyan-600" />
                          <span>{cs.client}</span>
                        </span>
                      )}
                      {cs.client && <span>•</span>}
                      <span className="flex items-center gap-1">
                        <HiOutlineCalendar className="w-4 h-4 text-cyan-600" />
                        <span>{cs.publishDate || cs.date}</span>
                      </span>
                      {cs.readTime && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-700 font-extrabold">{cs.readTime}</span>
                        </>
                      )}
                    </div>

                    <h3 className="font-extrabold text-xl text-slate-900 line-clamp-2 leading-snug hover:text-cyan-700 transition-colors">
                      <Link href={`/admin/case-studies/${cs.slug || cs._id}`}>
                        {cs.title}
                      </Link>
                    </h3>

                    <p className="text-sm font-medium text-slate-600 line-clamp-3 leading-relaxed">
                      {cs.shortDescription || cs.excerpt || 'No summary provided.'}
                    </p>

                    {/* Highlights Preview */}
                    {cs.highlights && cs.highlights.length > 0 && (
                      <div className="bg-cyan-50/50 p-3 rounded-xl border border-cyan-100 space-y-1">
                        <span className="text-[10px] font-black uppercase text-cyan-800 tracking-wider block">Key Highlights & Impact</span>
                        <p className="text-xs font-bold text-slate-800 truncate">✓ {cs.highlights[0]}</p>
                      </div>
                    )}

                    {/* Tags */}
                    {cs.tags && cs.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {cs.tags.map((tag, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-slate-200">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-5 pt-0 flex items-center justify-between border-t border-slate-100 mt-4">
                  <Link
                    href={`/admin/case-studies/${cs.slug || cs._id}`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-extrabold text-sm border border-cyan-200 transition-colors cursor-pointer"
                  >
                    <HiOutlineEye className="w-5 h-5 text-cyan-600" />
                    <span>Read Details</span>
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(cs)}
                      className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:text-cyan-700 hover:bg-cyan-50 border border-slate-200 transition-colors cursor-pointer"
                      title="Edit Case Study"
                    >
                      <HiOutlinePencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cs._id!)}
                      className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer"
                      title="Delete Case Study"
                    >
                      <HiOutlineTrash className="w-5 h-5" />
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
                  <th className="p-4">Case Study Title</th>
                  <th className="p-4">Category & Client</th>
                  <th className="p-4">Tags & Highlights</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCaseStudies.map((cs) => {
                  const imgUrl = cs.cardImagePath
                    ? `${API_BASE}${cs.cardImagePath.replace(/^\/api/, '')}`
                    : cs.featuredImage?.url || cs.image || cs.imageUrl;
                  return (
                    <tr key={cs._id || cs.slug || cs.title} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-900 to-slate-900 overflow-hidden border border-slate-300 flex-shrink-0 flex items-center justify-center">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={cs.title}
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <HiOutlineDocumentText className="w-7 h-7 text-cyan-300" />
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-base cursor-pointer hover:text-cyan-700 transition-colors line-clamp-1">
                              <Link href={`/admin/case-studies/${cs.slug || cs._id}`}>
                                {cs.title}
                              </Link>
                            </div>
                            <div className="text-cyan-700 font-mono text-xs font-bold mt-0.5">/{cs.slug || cs.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-300">
                          {cs.category}
                        </span>
                        {cs.client && <p className="text-xs font-bold text-slate-500 mt-1.5">Client: {cs.client}</p>}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {cs.tags?.map((tag, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-300">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        {cs.readTime && <p className="text-xs font-extrabold text-cyan-700 mt-1">{cs.readTime}</p>}
                      </td>
                      <td className="p-4 text-center">
                        <select
                          value={cs.status}
                          onChange={(e) => changeStatus(cs._id!, e.target.value as any)}
                          className={`text-xs font-extrabold px-3 py-1.5 rounded-full border cursor-pointer ${
                            cs.status === 'Publish'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : cs.status === 'Draft'
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
                        <Link
                          href={`/admin/case-studies/${cs.slug || cs._id}`}
                          className="inline-block p-2 rounded-xl bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200 transition-colors"
                          title="View Case Study Details"
                        >
                          <HiOutlineEye className="w-5 h-5" />
                        </Link>
                        <button onClick={() => handleOpenModal(cs)} className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-cyan-700 hover:bg-cyan-50 border border-slate-200 transition-colors">
                          <HiOutlinePencil className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(cs._id!)} className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors">
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

      {/* FULL CASE STUDY READER MODAL */}
      {viewingCaseStudy && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto pt-6 pb-12">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-3xl w-full flex flex-col shadow-2xl my-auto max-h-[90vh] overflow-hidden relative">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-30 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-cyan-50 text-cyan-800 border border-cyan-200">
                  {viewingCaseStudy.category}
                </span>
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                  viewingCaseStudy.status === 'Publish'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : viewingCaseStudy.status === 'Draft'
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-slate-100 text-slate-500 border-slate-300'
                }`}>
                  {viewingCaseStudy.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingCaseStudy(null)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close Reader"
              >
                <HiOutlineX className="w-8 h-8 stroke-[2.5]" />
              </button>
            </div>

            {/* Reader Content Body */}
            <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
              {/* Banner Image */}
              {(viewingCaseStudy.featuredImage?.url || viewingCaseStudy.image || viewingCaseStudy.imageUrl) ? (
                <div className="w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                  <img
                    src={viewingCaseStudy.featuredImage?.url || viewingCaseStudy.image || viewingCaseStudy.imageUrl}
                    alt={viewingCaseStudy.title}
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}

              {/* Title & Metadata */}
              <div className="space-y-3">
                <h2 className="text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
                  {viewingCaseStudy.title}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-600 pt-1 border-b border-slate-200 pb-4">
                  {viewingCaseStudy.client && (
                    <span className="flex items-center gap-1.5 text-cyan-800 font-extrabold">
                      <HiOutlineOfficeBuilding className="w-5 h-5 text-cyan-600" />
                      <span>Client: {viewingCaseStudy.client}</span>
                    </span>
                  )}
                  {viewingCaseStudy.client && <span>•</span>}
                  <span className="flex items-center gap-1.5">
                    <HiOutlineUser className="w-5 h-5 text-cyan-600" />
                    <span>Author: {viewingCaseStudy.author}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <HiOutlineCalendar className="w-5 h-5 text-cyan-600" />
                    <span>Date: {viewingCaseStudy.publishDate || viewingCaseStudy.date}</span>
                  </span>
                </div>
              </div>

              {/* Short Summary Box */}
              {(viewingCaseStudy.shortDescription || viewingCaseStudy.excerpt) && (
                <div className="bg-cyan-50/60 border-l-4 border-cyan-600 p-4 rounded-r-2xl text-slate-800 font-bold text-base italic leading-relaxed">
                  &ldquo;{viewingCaseStudy.shortDescription || viewingCaseStudy.excerpt}&rdquo;
                </div>
              )}

              {/* Key Highlights Box */}
              {viewingCaseStudy.highlights && viewingCaseStudy.highlights.length > 0 && (
                <div className="bg-slate-50 border-2 border-slate-200 p-5 rounded-2xl space-y-2.5">
                  <h4 className="text-xs font-black uppercase text-cyan-800 tracking-wider flex items-center gap-1.5">
                    <span>Key Case Study Results & Highlights</span>
                  </h4>
                  <ul className="space-y-1.5 pl-1">
                    {viewingCaseStudy.highlights.map((item, idx) => (
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
                {renderContent(viewingCaseStudy.content)}
              </div>

              {/* Tags */}
              {viewingCaseStudy.tags && viewingCaseStudy.tags.length > 0 && (
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2.5 flex items-center gap-1.5">
                    <HiOutlineTag className="w-4 h-4 text-cyan-600" />
                    <span>Tags</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingCaseStudy.tags.map((tag, idx) => (
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
                    const item = viewingCaseStudy;
                    setViewingCaseStudy(null);
                    handleOpenModal(item);
                  }}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-base rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <HiOutlinePencil className="w-5 h-5" />
                  <span>Edit This Case Study</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingCaseStudy(null)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-base font-bold rounded-xl border border-slate-300 transition-colors"
                >
                  Close Reader
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto pt-6 pb-12">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-4xl w-full flex flex-col shadow-2xl my-auto max-h-[88vh] overflow-hidden relative">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-30 shadow-sm">
              <h3 className="font-extrabold text-2xl text-slate-900 tracking-tight">{editingItem ? 'Edit Case Study' : 'Create Case Study'}</h3>
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
                  value={typeof formData.companyId === 'string' ? formData.companyId : (formData.companyId as any)?._id}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Case Study Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setFormData({
                        ...formData,
                        title,
                        slug: title.toLowerCase().replace(/[^a-z0-9]/g, '-')
                      });
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                    placeholder="E.g., E-Commerce Revenue 300% Growth"
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
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Client / Brand Name</label>
                  <input
                    type="text"
                    value={formData.client || ''}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                    placeholder="E.g., Acme Corp / Nike"
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                    placeholder="Case Study / Growth / Web Dev"
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Read Time</label>
                  <input
                    type="text"
                    value={formData.readTime || ''}
                    onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                    placeholder="6 min read"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Author</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Publish Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600 cursor-pointer"
                  >
                    <option value="Draft" className="bg-white text-slate-900 font-bold">Draft</option>
                    <option value="Publish" className="bg-white text-slate-900 font-bold">Publish</option>
                    <option value="Hide" className="bg-white text-slate-900 font-bold">Hide</option>
                  </select>
                </div>
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Publish Date</label>
                  <input
                    type="text"
                    value={formData.publishDate || formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, publishDate: e.target.value, date: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                    placeholder="Sep 01, 2026"
                  />
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Short Summary / Excerpt</label>
                <textarea
                  rows={2}
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value, excerpt: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Key Highlights / Results (1 per line)</label>
                <textarea
                  rows={3}
                  value={highlightsInput}
                  onChange={(e) => setHighlightsInput(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600 leading-relaxed"
                  placeholder="300% Revenue Increase&#10;50k Active Monthly Users"
                />
              </div>

              <RichTextEditor
                label="Case Study Content (Markdown / HTML)"
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                rows={10}
              />

              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-mono font-bold text-cyan-800 focus:outline-none focus:border-cyan-600"
                  placeholder="E-Commerce, Growth, React"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-base font-bold text-slate-800">Featured Image URL / Asset Path</label>
                <input
                  type="text"
                  value={formData.featuredImage?.url || formData.image || ''}
                  onChange={(e) => {
                    const url = e.target.value;
                    setFormData({
                      ...formData,
                      image: url,
                      imageUrl: url,
                      featuredImage: { url, publicId: formData.featuredImage?.publicId || '' }
                    });
                  }}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 text-base font-mono font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                  placeholder="/assets/casestudies/cs1.jpg or https://..."
                />
              </div>

              <ImageUploadInput
                label="Or Upload Banner Image to Cloudinary"
                value={formData.featuredImage}
                onChange={(featuredImage) => setFormData({ ...formData, featuredImage, image: featuredImage.url, imageUrl: featuredImage.url })}
                folder="linkup_casestudies"
              />

              <SeoFormSection
                seo={formData.seo || {}}
                onChange={(seo) => setFormData({ ...formData, seo })}
              />

              <div className="pt-4 sm:pt-5 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm sm:text-base font-bold rounded-xl border border-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm sm:text-base rounded-xl cursor-pointer shadow-md transition-all"
                >
                  {saving ? 'Saving...' : 'Save Case Study'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
