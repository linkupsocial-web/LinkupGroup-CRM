'use client';

import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { API_BASE, adminFetch } from '@/lib/adminApi';
import ImageUploadInput from '@/components/admin/ImageUploadInput';
import VideoUploadInput from '@/components/admin/VideoUploadInput';
import SeoFormSection, { SEOFields } from '@/components/admin/SeoFormSection';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineStar,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineExternalLink,
  HiOutlineViewGrid,
  HiOutlineViewList,
  HiOutlineVideoCamera,
  HiOutlineTag,
  HiOutlineCheckCircle
} from 'react-icons/hi';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';

interface CompanyInfo {
  _id: string;
  name: string;
  code: string;
  slug?: string;
}

interface ProjectItem {
  _id?: string;
  slug?: string;
  companyId: string | CompanyInfo;
  projectTitle: string;
  title?: string;
  category: string;
  tags?: string[];
  description?: string;
  shortDescription?: string;
  longDescription?: string;
  fullDescription?: string;
  liveUrl?: string;
  projectUrl?: string;
  video?: { url: string; publicId: string } | string;
  deliverables?: string[];
  thumbnail: { url: string; publicId: string };
  cardImagePath?: string;
  gallery: { url: string; publicId: string }[];
  clientDetails: string;
  technologies: string[];
  featured: boolean;
  isVisible: boolean;
  displayOrder: number;
  seo?: SEOFields;
}

export default function ProjectsAdminPage() {
  const { selectedCompany, companies } = useAdminAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingProject, setViewingProject] = useState<ProjectItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectItem | null>(null);

  const [techInput, setTechInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [deliverablesInput, setDeliverablesInput] = useState('');

  const [formData, setFormData] = useState<ProjectItem>({
    companyId: '',
    slug: '',
    projectTitle: '',
    title: '',
    category: 'Web Development',
    tags: [],
    description: '',
    shortDescription: '',
    longDescription: '',
    fullDescription: '',
    liveUrl: '',
    projectUrl: '',
    video: { url: '', publicId: '' },
    deliverables: [],
    thumbnail: { url: '', publicId: '' },
    gallery: [],
    clientDetails: '',
    technologies: [],
    featured: false,
    isVisible: true,
    displayOrder: 0,
    seo: {}
  });

  useEffect(() => {
    if (selectedCompany?._id) {
      setCompanyFilter(selectedCompany._id);
    }
  }, [selectedCompany]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const activeFilter = companyFilter || 'all';
      const res = await adminFetch(`/projects?companyId=${activeFilter}&includeHidden=true`);
      if (res.success && Array.isArray(res.data)) {
        setProjects(res.data);
      }
    } catch {
      setProjects([
        {
          _id: 'p1',
          slug: 'linkup-legal',
          companyId: companies[0]?._id || 'web-1',
          projectTitle: 'Linkup Legal',
          title: 'Linkup Legal',
          category: 'Legal-tech platform',
          tags: ['Government & Legal', 'Service discovery'],
          description: 'A clear, trust-led experience for government and business services across India.',
          shortDescription: 'A clear, trust-led experience for government and business services across India.',
          longDescription: 'Linkup Legal transforms complex legal, tax, and government registration processes into an intuitive digital experience.',
          fullDescription: 'Linkup Legal transforms complex legal, tax, and government registration processes into an intuitive digital experience. Built for maximum clarity, quick service discovery, and transparent workflow tracking across India.',
          liveUrl: 'https://www.linkuplegal.com/',
          projectUrl: 'https://www.linkuplegal.com/',
          video: { url: '/assets/media/cb_hello_showcase_potion.mp4', publicId: '' },
          deliverables: ['UI/UX Design', 'Next.js Frontend', 'Service Discovery Portal', 'SEO & Performance Optimization'],
          thumbnail: { url: '', publicId: '' },
          gallery: [],
          clientDetails: 'Linkup Legal India',
          technologies: ['Next.js', 'React', 'Tailwind CSS', 'Node.js'],
          featured: true,
          isVisible: true,
          displayOrder: 1,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [companyFilter]);

  const getVideoObj = (v: any): { url: string; publicId: string } => {
    if (!v) return { url: '', publicId: '' };
    if (typeof v === 'string') return { url: v, publicId: '' };
    return { url: v.url || '', publicId: v.publicId || '' };
  };

  const getVideoUrlStr = (v: any): string => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    return v.url || '';
  };

  const handleOpenModal = async (item?: ProjectItem) => {
    if (item?._id) {
      try {
        const res = await adminFetch(`/projects/${item._id}`);
        if (res.success && res.data) item = res.data;
      } catch (err: any) {
        alert(err.message || 'Could not load the full project');
        return;
      }
    }

    if (item) {
      setEditingItem(item);
      const compId = typeof item.companyId === 'object' ? item.companyId._id : item.companyId;
      setFormData({
        ...item,
        companyId: compId || companies[0]?._id || '',
        slug: item.slug || item._id || '',
        projectTitle: item.projectTitle || item.title || '',
        title: item.title || item.projectTitle || '',
        category: item.category || 'General',
        description: item.description || item.shortDescription || '',
        shortDescription: item.shortDescription || item.description || '',
        longDescription: item.longDescription || item.fullDescription || '',
        fullDescription: item.fullDescription || item.longDescription || '',
        liveUrl: item.liveUrl || item.projectUrl || '',
        projectUrl: item.projectUrl || item.liveUrl || '',
        video: getVideoObj(item.video),
        clientDetails: item.clientDetails || '',
        thumbnail: item.thumbnail || { url: '', publicId: '' },
        gallery: item.gallery || [],
        featured: item.featured ?? false,
        isVisible: item.isVisible ?? true,
        displayOrder: item.displayOrder ?? 0,
        seo: item.seo || {}
      });
      setTechInput((item.technologies || []).join(', '));
      setTagsInput((item.tags || []).join(', '));
      setDeliverablesInput((item.deliverables || []).join(', '));
    } else {
      setEditingItem(null);
      const defaultCompId = (companyFilter !== 'all' ? companyFilter : (selectedCompany?._id !== 'all' ? selectedCompany?._id : companies[0]?._id)) || '';
      setFormData({
        companyId: defaultCompId,
        slug: '',
        projectTitle: '',
        title: '',
        category: 'Web Development',
        tags: [],
        description: '',
        shortDescription: '',
        longDescription: '',
        fullDescription: '',
        liveUrl: '',
        projectUrl: '',
        video: { url: '', publicId: '' },
        deliverables: [],
        thumbnail: { url: '', publicId: '' },
        gallery: [],
        clientDetails: '',
        technologies: [],
        featured: false,
        isVisible: true,
        displayOrder: projects.length + 1,
        seo: {}
      });
      setTechInput('');
      setTagsInput('');
      setDeliverablesInput('');
    }
    setIsModalOpen(true);
  };

  const handleViewProject = async (item: ProjectItem) => {
    if (!item._id) return;
    try {
      const res = await adminFetch(`/projects/${item._id}`);
      if (res.success && res.data) setViewingProject(res.data);
    } catch (err: any) {
      alert(err.message || 'Could not load the full project');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const techArray = techInput.split(',').map(t => t.trim()).filter(Boolean);
      const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const deliverablesArray = deliverablesInput.split(',').map(d => d.trim()).filter(Boolean);
      
      const titleVal = formData.projectTitle || formData.title || '';
      const liveUrlVal = formData.liveUrl || formData.projectUrl || '';
      const shortDescVal = formData.shortDescription || formData.description || '';
      const longDescVal = formData.fullDescription || formData.longDescription || '';
      const videoObj = getVideoObj(formData.video);

      const payload = {
        ...formData,
        slug: formData.slug || titleVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        projectTitle: titleVal,
        title: titleVal,
        liveUrl: liveUrlVal,
        projectUrl: liveUrlVal,
        description: shortDescVal,
        shortDescription: shortDescVal,
        longDescription: longDescVal,
        fullDescription: longDescVal,
        video: videoObj.url,
        videoFile: videoObj,
        technologies: techArray,
        tags: tagsArray,
        deliverables: deliverablesArray,
        companyId: formData.companyId || companies[0]?._id
      };

      if (editingItem?._id) {
        await adminFetch(`/projects/${editingItem._id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await adminFetch('/projects', { method: 'POST', body: JSON.stringify(payload) });
      }
      setIsModalOpen(false);
      fetchProjects();
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (id: string, currentStatus: boolean) => {
    try {
      await adminFetch(`/projects/${id}/visibility`, { method: 'PATCH', body: JSON.stringify({ isVisible: !currentStatus }) });
      setProjects(projects.map(p => p._id === id ? { ...p, isVisible: !currentStatus } : p));
    } catch {
      setProjects(projects.map(p => p._id === id ? { ...p, isVisible: !currentStatus } : p));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Soft-delete this project?')) return;
    try {
      await adminFetch(`/projects/${id}`, { method: 'DELETE' });
      setProjects(projects.filter(p => p._id !== id));
    } catch {
      setProjects(projects.filter(p => p._id !== id));
    }
  };

  // Filter projects by Search Term AND Company Selection
  const filteredProjects = projects.filter(p => {
    const titleMatch = (p.projectTitle || p.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const categoryMatch = (p.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const tagsMatch = (p.tags || []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSearch = titleMatch || categoryMatch || tagsMatch;

    if (companyFilter === 'all') {
      return matchesSearch;
    } else {
      const pCompId = typeof p.companyId === 'object' ? p.companyId?._id : p.companyId;
      return matchesSearch && (pCompId === companyFilter || !pCompId);
    }
  });

  const getCompanyName = (comp: string | CompanyInfo) => {
    if (typeof comp === 'object' && comp?.name) return comp.name;
    const found = companies.find(c => c._id === comp);
    return found ? found.name : 'Linkup Group';
  };

  const getCompanyCode = (comp: string | CompanyInfo) => {
    if (typeof comp === 'object' && comp?.code) return comp.code;
    const found = companies.find(c => c._id === comp);
    return found ? found.code : 'CMS';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Project Management</h1>
          <p className="text-base text-slate-600 mt-1 font-bold">
            Viewing projects for <span className="text-cyan-700 font-extrabold text-lg">{getCompanyName(companyFilter)}</span>
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl text-base flex items-center gap-2.5 shadow-md cursor-pointer"
        >
          <HiOutlinePlus className="w-5 h-5" />
          <span>Add New Project</span>
        </button>
      </div>

      {/* Controls: Search, Filter & View Switcher */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 sm:gap-4 bg-white p-3.5 sm:p-4 rounded-2xl border-2 border-slate-200 shadow-sm w-full max-w-full">
        <div className="relative flex-1 w-full min-w-0">
          <HiOutlineSearch className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects by title, category, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto min-w-0">
          <div className="flex items-center gap-2 text-slate-800 text-xs sm:text-base font-extrabold shrink-0">
            <HiOutlineBuildingOffice2 className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600" />
            <span>Filter Company:</span>
          </div>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="bg-slate-50 border-2 border-slate-300 hover:border-cyan-600 text-cyan-800 font-extrabold text-xs sm:text-base rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 focus:outline-none focus:border-cyan-600 cursor-pointer w-full sm:w-auto min-w-0 truncate max-w-full"
          >
            <option value="all" className="bg-white text-cyan-700 font-bold">🌐 All Companies</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id} className="bg-white text-slate-900 font-bold">
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-center bg-slate-100 p-1 rounded-xl border border-slate-300 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 sm:flex-initial p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              title="Card Grid View"
            >
              <HiOutlineViewGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 sm:flex-initial p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              title="Table View"
            >
              <HiOutlineViewList className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Render: Grid Cards vs Table View */}
      {loading ? (
        <div className="p-12 text-center text-slate-600 text-xl font-bold bg-white rounded-2xl border-2 border-slate-200">
          Loading projects...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center text-slate-600 text-xl font-bold bg-white rounded-2xl border-2 border-slate-200">
          No projects found for {getCompanyName(companyFilter)}.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const vUrl = getVideoUrlStr(project.video);
            const thumbnailUrl = project.cardImagePath
              ? `${API_BASE}${project.cardImagePath.replace(/^\/api/, '')}`
              : project.thumbnail?.url;
            return (
              <div
                key={project._id || project.slug || project.projectTitle}
                className="bg-white border-2 border-slate-200 hover:border-cyan-500 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1"
              >
                <div>
                  <div className="relative h-56 bg-slate-900 overflow-hidden border-b border-slate-200">
                    {vUrl ? (
                      <video
                        src={vUrl}
                        autoPlay
                        controls
                        playsInline
                        muted
                        loop
                        className="w-full h-full object-cover"
                      />
                    ) : thumbnailUrl ? (
                      <img src={thumbnailUrl} alt={project.projectTitle || project.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-lg bg-slate-100">
                        NO MEDIA PROVIDED
                      </div>
                    )}

                    <span className="absolute top-3 left-3 px-3 py-1.5 rounded-xl text-xs font-black bg-white/90 backdrop-blur-md text-cyan-800 border border-cyan-200 shadow-sm z-10">
                      {getCompanyCode(project.companyId)} — {getCompanyName(project.companyId)}
                    </span>

                    {project.featured && (
                      <span className="absolute top-3 right-3 p-2 rounded-full bg-amber-500 text-white shadow-md z-10">
                        <HiOutlineStar className="w-5 h-5 fill-white" />
                      </span>
                    )}
                  </div>

                  <div className="p-6 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-300">
                        {project.category}
                      </span>
                      {project.clientDetails && (
                        <span className="text-xs font-bold text-slate-500">
                          Client: {project.clientDetails}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {project.tags && project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {project.tags.map((tag, idx) => (
                          <span key={idx} className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md text-xs font-extrabold border border-indigo-200 flex items-center gap-1">
                            <HiOutlineTag className="w-3 h-3 text-indigo-500" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <h3 className="font-black text-xl text-slate-900 tracking-tight leading-snug flex items-center justify-between gap-2">
                      <span>{project.projectTitle || project.title}</span>
                      {(project.liveUrl || project.projectUrl) && (
                        <a href={project.liveUrl || project.projectUrl} target="_blank" rel="noreferrer" className="text-cyan-600 hover:text-cyan-700 flex-shrink-0">
                          <HiOutlineExternalLink className="w-5 h-5" />
                        </a>
                      )}
                    </h3>

                    <p className="text-base text-slate-600 font-bold leading-relaxed line-clamp-3">
                      {project.description || project.shortDescription || project.fullDescription || project.longDescription || 'No description provided.'}
                    </p>

                    {/* Deliverables */}
                    {project.deliverables && project.deliverables.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">Deliverables</span>
                        <div className="flex flex-wrap gap-1.5">
                          {project.deliverables.map((deliv, idx) => (
                            <span key={idx} className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md text-xs font-bold border border-emerald-200 flex items-center gap-1">
                              <HiOutlineCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{deliv}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tech Stack */}
                    {project.technologies && project.technologies.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1.5">
                        {project.technologies.map((tech, idx) => (
                          <span key={idx} className="bg-cyan-50 text-cyan-800 px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold border border-cyan-200">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewProject(project)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-extrabold text-xs border border-cyan-200 transition-colors cursor-pointer"
                    >
                      <HiOutlineEye className="w-4 h-4 text-cyan-600" />
                      <span>View Details</span>
                    </button>

                    <button
                      onClick={() => toggleVisibility(project._id!, project.isVisible)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                        project.isVisible
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                    >
                      <span>{project.isVisible ? 'Visible' : 'Hidden'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(project)}
                      className="p-2.5 rounded-xl bg-slate-100 text-slate-800 hover:text-cyan-700 hover:bg-slate-200 transition-colors shadow-sm cursor-pointer"
                      title="Edit Project"
                    >
                      <HiOutlinePencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(project._id!)}
                      className="p-2.5 rounded-xl bg-slate-100 text-slate-800 hover:text-red-600 hover:bg-slate-200 transition-colors shadow-sm cursor-pointer"
                      title="Delete Project"
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
        <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-base min-w-[700px]">
            <thead className="bg-slate-100 text-slate-800 uppercase tracking-wider font-extrabold border-b border-slate-200 text-sm">
              <tr>
                <th className="p-4">Project Title</th>
                <th className="p-4">Company</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-center">Featured</th>
                <th className="p-4 text-center">Visibility</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProjects.map((p) => (
                <tr key={p._id || p.slug || p.projectTitle} className="hover:bg-slate-50 transition-colors">
                  <td
                    onClick={() => handleViewProject(p)}
                    className="p-4 font-black text-slate-900 cursor-pointer hover:text-cyan-700 transition-colors"
                  >
                    <div>
                      <span>{p.projectTitle || p.title}</span>
                      {p.slug && <span className="block text-xs font-mono text-slate-400">ID: {p.slug}</span>}
                    </div>
                  </td>
                  <td className="p-4 font-extrabold text-cyan-700">{getCompanyName(p.companyId)}</td>
                  <td className="p-4 font-bold text-slate-700">{p.category}</td>
                  <td className="p-4 text-center font-bold">{p.featured ? '⭐ Yes' : 'No'}</td>
                  <td className="p-4 text-center font-bold">{p.isVisible ? 'Visible' : 'Hidden'}</td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleViewProject(p)}
                      className="p-2 bg-cyan-50 rounded-lg text-cyan-800 hover:bg-cyan-100 border border-cyan-200"
                      title="View Details"
                    >
                      <HiOutlineEye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleOpenModal(p)} className="p-2 bg-slate-100 rounded-lg text-slate-800 hover:bg-slate-200">
                      <HiOutlinePencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p._id!)} className="p-2 bg-slate-100 rounded-lg text-red-600 hover:bg-red-50">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* FULL PROJECT DETAILS READER MODAL */}
      {viewingProject && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto pt-6 pb-12">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-3xl w-full flex flex-col shadow-2xl my-auto max-h-[90vh] overflow-hidden relative">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-30 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-cyan-50 text-cyan-800 border border-cyan-200">
                  {getCompanyCode(viewingProject.companyId)} — {getCompanyName(viewingProject.companyId)}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-300">
                  {viewingProject.category}
                </span>
                {viewingProject.featured && (
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <HiOutlineStar className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span>Featured Project</span>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setViewingProject(null)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close Reader"
              >
                <HiOutlineX className="w-8 h-8 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
              {/* Project Video Player or Image */}
              {getVideoUrlStr(viewingProject.video) ? (
                <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md relative group">
                  <video
                    src={getVideoUrlStr(viewingProject.video)}
                    autoPlay
                    muted
                    loop
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  {(viewingProject.liveUrl || viewingProject.projectUrl) && (
                    <a
                      href={viewingProject.liveUrl || viewingProject.projectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-slate-900 px-4 py-2.5 rounded-xl font-extrabold text-sm flex items-center gap-2 shadow-lg border border-slate-200 transition-all z-10"
                    >
                      <span>Visit Live Website</span>
                      <HiOutlineExternalLink className="w-5 h-5 text-cyan-600" />
                    </a>
                  )}
                </div>
              ) : viewingProject.thumbnail?.url ? (
                <div className="w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-md relative group">
                  <img src={viewingProject.thumbnail.url} alt={viewingProject.projectTitle || viewingProject.title} className="w-full h-full object-cover" />
                  {(viewingProject.liveUrl || viewingProject.projectUrl) && (
                    <a
                      href={viewingProject.liveUrl || viewingProject.projectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-slate-900 px-4 py-2.5 rounded-xl font-extrabold text-sm flex items-center gap-2 shadow-lg border border-slate-200 transition-all"
                    >
                      <span>Visit Live Website</span>
                      <HiOutlineExternalLink className="w-5 h-5 text-cyan-600" />
                    </a>
                  )}
                </div>
              ) : null}

              {/* Title & Metadata */}
              <div className="space-y-3">
                <h2 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">
                  {viewingProject.projectTitle || viewingProject.title}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700">
                  <div>
                    <span className="text-xs uppercase font-extrabold text-slate-400 block mb-0.5">Company</span>
                    <span className="text-cyan-800 font-extrabold">{getCompanyName(viewingProject.companyId)}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-extrabold text-slate-400 block mb-0.5">Project ID / Slug</span>
                    <span className="text-slate-900 font-mono font-extrabold">{viewingProject.slug || viewingProject._id || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-extrabold text-slate-400 block mb-0.5">Visibility Status</span>
                    <span className={viewingProject.isVisible ? 'text-emerald-700 font-extrabold' : 'text-slate-500'}>
                      {viewingProject.isVisible ? '✓ Publicly Visible' : 'Hidden'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {viewingProject.tags && viewingProject.tags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Project Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingProject.tags.map((tag, idx) => (
                      <span key={idx} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-extrabold border border-indigo-200 flex items-center gap-1.5">
                        <HiOutlineTag className="w-4 h-4 text-indigo-500" />
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Short Description */}
              {(viewingProject.description || viewingProject.shortDescription) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Summary Description</h4>
                  <div className="bg-cyan-50/60 p-4 rounded-2xl border border-cyan-200 text-slate-900 text-base font-bold leading-relaxed">
                    {viewingProject.description || viewingProject.shortDescription}
                  </div>
                </div>
              )}

              {/* Full Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Comprehensive Description</h4>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-slate-900 text-base leading-relaxed font-normal whitespace-pre-line">
                  {viewingProject.fullDescription || viewingProject.longDescription || 'No detailed description provided for this project.'}
                </div>
              </div>

              {/* Deliverables */}
              {viewingProject.deliverables && viewingProject.deliverables.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Key Deliverables</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {viewingProject.deliverables.map((deliv, idx) => (
                      <div key={idx} className="bg-emerald-50 text-emerald-900 p-3 rounded-xl border border-emerald-200 text-sm font-bold flex items-center gap-2">
                        <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <span>{deliv}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tech Stack */}
              {viewingProject.technologies && viewingProject.technologies.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Technologies Used</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingProject.technologies.map((tech, idx) => (
                      <span key={idx} className="bg-cyan-50 text-cyan-800 px-3.5 py-1.5 rounded-xl text-sm font-mono font-extrabold border border-cyan-200 shadow-sm">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Gallery Images */}
              {viewingProject.gallery && viewingProject.gallery.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Project Gallery Screenshots</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {viewingProject.gallery.map((gImg, idx) => (
                      <div key={idx} className="aspect-video rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                        <img src={gImg.url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const proj = viewingProject;
                    setViewingProject(null);
                    handleOpenModal(proj);
                  }}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-base rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <HiOutlinePencil className="w-5 h-5" />
                  <span>Edit This Project</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingProject(null)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-base font-bold rounded-xl border border-slate-300 transition-colors"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto pt-6 pb-12">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-3xl w-full flex flex-col shadow-2xl my-auto max-h-[88vh] overflow-hidden relative">
            {/* Sticky Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-30 shadow-sm">
              <h3 className="font-black text-2xl text-slate-900 tracking-tight">
                {editingItem ? 'Edit Project' : 'Add New Project'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Close Form"
              >
                <HiOutlineX className="w-8 h-8 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 text-base">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <label className="block text-base font-black uppercase tracking-wider text-cyan-700 mb-2 flex items-center gap-2">
                  <HiOutlineBuildingOffice2 className="w-6 h-6 text-cyan-600" />
                  <span>Assigned Linkup Company *</span>
                </label>
                <select
                  required
                  value={typeof formData.companyId === 'string' ? formData.companyId : formData.companyId?._id}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  className="w-full bg-white border-2 border-slate-300 text-slate-900 font-extrabold text-lg rounded-xl px-4 py-3.5 focus:outline-none focus:border-cyan-600 cursor-pointer shadow-sm"
                >
                  {companies.map((c) => (
                    <option key={c._id} value={c._id} className="bg-white text-slate-900 py-2 font-extrabold text-base">
                      {c.name} ({c.code}) - {c.slug}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-extrabold text-slate-800 mb-2">Project ID / Slug</label>
                  <input
                    type="text"
                    value={formData.slug || ''}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-mono text-cyan-900 font-bold focus:outline-none focus:border-cyan-600"
                    placeholder="e.g. linkup-legal"
                  />
                </div>
                <div>
                  <label className="block text-base font-extrabold text-slate-800 mb-2">Project Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.projectTitle || formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value, title: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                    placeholder="e.g. Linkup Legal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-extrabold text-slate-800 mb-2">Category</label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                    placeholder="Legal-tech platform, Construction, D2C beauty..."
                  />
                </div>
                <div>
                  <label className="block text-base font-extrabold text-slate-800 mb-2">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                    placeholder="Government & Legal, Service discovery"
                  />
                </div>
              </div>

              <div>
                <label className="block text-base font-extrabold text-slate-800 mb-2">Short Description</label>
                <textarea
                  rows={2}
                  value={formData.shortDescription || formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value, description: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600 leading-relaxed"
                  placeholder="Short card summary e.g. A clear, trust-led experience..."
                />
              </div>

              <div>
                <label className="block text-base font-extrabold text-slate-800 mb-2">Full / Long Description</label>
                <textarea
                  rows={4}
                  value={formData.fullDescription || formData.longDescription || ''}
                  onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value, longDescription: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600 leading-relaxed"
                  placeholder="Detailed project story and overview..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-extrabold text-slate-800 mb-2">Live Website URL</label>
                  <input
                    type="url"
                    value={formData.liveUrl || formData.projectUrl || ''}
                    onChange={(e) => setFormData({ ...formData, liveUrl: e.target.value, projectUrl: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-mono text-cyan-800 font-bold focus:outline-none focus:border-cyan-600"
                    placeholder="https://www.linkuplegal.com/"
                  />
                </div>
                <div>
                  <label className="block text-base font-extrabold text-slate-800 mb-2">Client Details</label>
                  <input
                    type="text"
                    value={formData.clientDetails || ''}
                    onChange={(e) => setFormData({ ...formData, clientDetails: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                    placeholder="e.g. Linkup Legal / External Client"
                  />
                </div>
              </div>

              {/* Cloudinary Media Upload Section: Video & Thumbnail */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <VideoUploadInput
                  label="Project Video (Cloudinary Upload)"
                  value={getVideoObj(formData.video)}
                  onChange={(video) => setFormData({ ...formData, video })}
                  folder="linkup_project_videos"
                />

                <ImageUploadInput
                  label="Project Thumbnail Image (Cloudinary)"
                  value={formData.thumbnail}
                  onChange={(thumbnail) => setFormData({ ...formData, thumbnail })}
                  folder="linkup_projects"
                />
              </div>

              <div>
                <label className="block text-base font-extrabold text-slate-800 mb-2">Deliverables (comma separated)</label>
                <input
                  type="text"
                  value={deliverablesInput}
                  onChange={(e) => setDeliverablesInput(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                  placeholder="UI/UX Design, Next.js Frontend, Service Discovery Portal, SEO & Performance Optimization"
                />
              </div>

              <div>
                <label className="block text-base font-extrabold text-slate-800 mb-2">Technologies (comma separated)</label>
                <input
                  type="text"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-mono text-cyan-800 font-bold focus:outline-none focus:border-cyan-600"
                  placeholder="React, Next.js, Node.js, MongoDB"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                <div>
                  <label className="block text-base font-extrabold text-slate-800 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                  />
                </div>
                <div className="flex items-center gap-3 pt-7">
                  <input
                    type="checkbox"
                    id="pFeatured"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-6 h-6 rounded bg-slate-50 border-slate-300 text-cyan-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="pFeatured" className="text-base font-extrabold text-slate-800 cursor-pointer">
                    Featured Project
                  </label>
                </div>
                <div className="flex items-center gap-3 pt-7">
                  <input
                    type="checkbox"
                    id="pVisible"
                    checked={formData.isVisible}
                    onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                    className="w-6 h-6 rounded bg-slate-50 border-slate-300 text-cyan-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="pVisible" className="text-base font-extrabold text-slate-800 cursor-pointer">
                    Visible on Website
                  </label>
                </div>
              </div>

              <SeoFormSection
                seo={formData.seo || {}}
                onChange={(seo) => setFormData({ ...formData, seo })}
              />

              <div className="pt-5 border-t border-slate-200 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-base rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  Cancel / Close
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-7 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-base rounded-xl cursor-pointer shadow-md disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
