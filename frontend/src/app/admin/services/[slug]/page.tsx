'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/adminApi';
import ImageUploadInput from '@/components/admin/ImageUploadInput';
import SeoFormSection, { SEOFields } from '@/components/admin/SeoFormSection';
import RichTextEditor from '@/components/admin/RichTextEditor';
import {
  HiOutlineArrowLeft,
  HiOutlineTag,
  HiOutlineCheckCircle,
  HiOutlineDocumentText,
  HiOutlineQuestionMarkCircle,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineX,
  HiOutlineLocationMarker,
  HiOutlineGlobeAlt
} from 'react-icons/hi';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';

interface ServiceFAQ {
  question: string;
  answer: string;
}

interface LocationServiceItem {
  _id?: string;
  parentServiceId?: string;
  companyId?: string | { _id: string; name: string; code: string };
  location: string;
  isLocationService?: boolean;
  serviceName: string;
  title?: string;
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
  featured?: boolean;
  isVisible?: boolean;
  displayOrder?: number;
  status?: 'Publish' | 'Draft' | 'Hide';
  seo?: SEOFields;
}

interface ServiceDetail {
  _id?: string;
  companyId: string | { _id: string; name: string; code: string; slug?: string };
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
  featured: boolean;
  isVisible: boolean;
  displayOrder: number;
  status?: 'Publish' | 'Draft' | 'Hide';
  seo?: SEOFields;
}

const COMMON_LOCATIONS = ['Noida', 'Gurgaon', 'Delhi', 'Faridabad', 'Ghaziabad', 'Delhi NCR'];

export default function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const slug = unwrappedParams.slug;

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [locationServices, setLocationServices] = useState<LocationServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Location Service Modal State
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocationItem, setEditingLocationItem] = useState<LocationServiceItem | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationTagsInput, setLocationTagsInput] = useState('');
  const [locationDeliverablesInput, setLocationDeliverablesInput] = useState('');

  const [locationFormData, setLocationFormData] = useState<LocationServiceItem>({
    location: 'Noida',
    serviceName: '',
    title: '',
    slug: '',
    heading: '',
    shortDescription: '',
    fullDescription: '',
    tags: [],
    deliverables: [],
    faqs: [],
    image: { url: '', publicId: '' },
    imageUrl: '',
    imageAlt: '',
    isVisible: true,
    status: 'Publish',
    seo: {}
  });

  const generateDefaultLocations = (parent: ServiceDetail): LocationServiceItem[] => {
    return ['Noida', 'Gurgaon', 'Delhi'].map(loc => {
      const baseName = parent.serviceName || parent.title || 'Service';
      return {
        _id: `${parent._id}_${loc.toLowerCase()}`,
        parentServiceId: parent._id,
        location: loc,
        isLocationService: true,
        serviceName: `${baseName} in ${loc}`,
        title: `${baseName} in ${loc}`,
        slug: `${parent.slug}-${loc.toLowerCase()}`,
        heading: `Professional ${baseName} in ${loc}`,
        shortDescription: `Tailored ${baseName} solutions specifically optimized for high-growth enterprises in ${loc} and Delhi NCR.`,
        fullDescription: parent.fullDescription || parent.text || '',
        deliverables: parent.deliverables && parent.deliverables.length > 0
          ? parent.deliverables
          : [`Targeted ${loc} market strategy`, 'Full project execution', 'Regional support & reporting'],
        faqs: [
          {
            question: `Do you provide in-person meetings for clients in ${loc}?`,
            answer: `Yes, our team is available for on-site meetings and strategy sessions across ${loc} and the wider Delhi NCR region.`
          },
          {
            question: `What is the delivery timeline for ${loc} projects?`,
            answer: `Typical turnaround is 2 to 4 weeks depending on specific project scope and deliverables.`
          }
        ],
        image: parent.image || { url: '', publicId: '' },
        imageUrl: parent.imageUrl || parent.image?.url || '',
        isVisible: true,
        status: 'Publish'
      };
    });
  };

  const fetchService = async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/services/${encodeURIComponent(slug)}`);
      if (res.success && res.data) {
        setService(res.data);
        fetchLocationServices(res.data);
      } else {
        setError('Service not found');
      }
    } catch (err: any) {
      const fallbackService: ServiceDetail = {
        _id: 'service-fallback',
        companyId: { _id: 'comp-1', name: 'Linkup Group', code: 'CMS' },
        serviceName: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        slug: slug,
        heading: 'Strategic Service & Execution',
        shortDescription: 'Comprehensive service offerings designed to scale your business.',
        fullDescription: 'Tailored solutions delivered by Linkup Group specialists.',
        deliverables: ['Regional market analysis', 'Full execution strategy', 'Ongoing support'],
        faqs: [{ question: 'How do we get started?', answer: 'Reach out to our team to schedule an initial consultation.' }],
        image: { url: '/assets/media/service_website_strategy.jpg', publicId: '' },
        imageUrl: '/assets/media/service_website_strategy.jpg',
        featured: true,
        isVisible: true,
        displayOrder: 1,
        status: 'Publish'
      };
      setService(fallbackService);
      setLocationServices(generateDefaultLocations(fallbackService));
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationServices = async (parent: ServiceDetail) => {
    setLoadingLocations(true);
    try {
      const res = await adminFetch(`/services/${parent._id}/locations`);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setLocationServices(res.data);
      } else {
        setLocationServices(generateDefaultLocations(parent));
      }
    } catch {
      setLocationServices(generateDefaultLocations(parent));
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    fetchService();
  }, [slug]);

  const handleOpenLocationModal = async (item?: LocationServiceItem) => {
    if (!service) return;

    if (item?._id) {
      try {
        const res = await adminFetch(`/services/${item._id}`);
        if (res.success && res.data) item = res.data;
      } catch (err: any) {
        alert(err.message || 'Could not load the full location service');
        return;
      }
    }

    if (item) {
      setEditingLocationItem(item);
      setLocationFormData({
        ...item,
        location: item.location || 'Noida',
        serviceName: item.serviceName || item.title || '',
        title: item.title || item.serviceName || '',
        shortDescription: item.shortDescription || item.text || '',
        fullDescription: item.fullDescription || item.text || '',
        tags: item.tags || [],
        deliverables: item.deliverables || [],
        faqs: item.faqs || [],
        imageUrl: item.imageUrl || item.image?.url || '',
        image: item.image || { url: item.imageUrl || '', publicId: '' },
        status: item.status || (item.isVisible ? 'Publish' : 'Hide'),
        isVisible: item.isVisible ?? true,
        seo: item.seo || {}
      });
      setLocationTagsInput((item.tags || []).join(', '));
      setLocationDeliverablesInput((item.deliverables || []).join('\n'));
    } else {
      setEditingLocationItem(null);
      const defaultLoc = 'Noida';
      const baseTitle = service.serviceName || service.title || '';
      const autoTitle = `${baseTitle} in ${defaultLoc}`;
      const autoSlug = `${service.slug}-${defaultLoc.toLowerCase()}`;

      setLocationFormData({
        location: defaultLoc,
        serviceName: autoTitle,
        title: autoTitle,
        slug: autoSlug,
        heading: service.heading ? `${service.heading} in ${defaultLoc}` : `Best ${baseTitle} in ${defaultLoc}`,
        shortDescription: service.shortDescription || service.text || '',
        fullDescription: service.fullDescription || service.text || '',
        tags: [...(service.tags || []), defaultLoc],
        deliverables: service.deliverables || [],
        faqs: service.faqs || [],
        imageUrl: service.imageUrl || service.image?.url || '',
        image: service.image || { url: service.imageUrl || '', publicId: '' },
        isVisible: true,
        status: 'Publish',
        seo: {
          metaTitle: `${autoTitle} | ${getCompanyName(service.companyId)}`,
          metaDescription: `Looking for ${baseTitle} in ${defaultLoc}? Expert solutions tailored for businesses in ${defaultLoc} and Delhi NCR.`,
          metaKeywords: `${baseTitle} ${defaultLoc}, ${defaultLoc} ${baseTitle}, best ${baseTitle} ${defaultLoc}`
        }
      });
      setLocationTagsInput([...(service.tags || []), defaultLoc].join(', '));
      setLocationDeliverablesInput((service.deliverables || []).join('\n'));
    }
    setIsLocationModalOpen(true);
  };

  const handleSelectLocationChip = (loc: string) => {
    if (!service) return;
    const baseTitle = service.serviceName || service.title || '';
    const newTitle = `${baseTitle} in ${loc}`;
    const newSlug = `${service.slug}-${loc.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    setLocationFormData(prev => ({
      ...prev,
      location: loc,
      serviceName: newTitle,
      title: newTitle,
      slug: newSlug,
      heading: prev.heading ? `${service.heading || baseTitle} in ${loc}` : `Best ${baseTitle} in ${loc}`,
      seo: {
        ...prev.seo,
        metaTitle: `${newTitle} | ${getCompanyName(service.companyId)}`,
        metaDescription: `Looking for ${baseTitle} in ${loc}? Expert solutions tailored for businesses in ${loc} and Delhi NCR.`,
        metaKeywords: `${baseTitle} ${loc}, ${loc} ${baseTitle}, best ${baseTitle} in ${loc}`
      }
    }));
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service?._id) return;
    setSavingLocation(true);

    try {
      const tagsArray = locationTagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const deliverablesArray = locationDeliverablesInput.split('\n').map(d => d.trim()).filter(Boolean);
      const sName = locationFormData.serviceName || locationFormData.title || `${service.serviceName} in ${locationFormData.location}`;
      const slugVal = locationFormData.slug || `${service.slug}-${locationFormData.location.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const summaryVal = locationFormData.shortDescription || locationFormData.text || '';
      const imgUrl = locationFormData.imageUrl || locationFormData.image?.url || '';
      const isVis = locationFormData.status ? locationFormData.status === 'Publish' : locationFormData.isVisible;
      const compId = typeof service.companyId === 'object' ? service.companyId._id : service.companyId;

      const payload = {
        ...locationFormData,
        parentServiceId: service._id,
        isLocationService: true,
        companyId: compId,
        serviceName: sName,
        title: sName,
        slug: slugVal,
        shortDescription: summaryVal,
        text: summaryVal,
        fullDescription: locationFormData.fullDescription || summaryVal,
        imageUrl: imgUrl,
        image: { url: imgUrl, publicId: locationFormData.image?.publicId || '' },
        tags: tagsArray,
        deliverables: deliverablesArray,
        isVisible: isVis,
        status: locationFormData.status || (isVis ? 'Publish' : 'Hide')
      };

      if (editingLocationItem?._id) {
        await adminFetch(`/services/${editingLocationItem._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await adminFetch('/services', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setIsLocationModalOpen(false);
      fetchLocationServices(service);
    } catch (err: any) {
      alert(err.message || 'Failed to save location service');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location service?')) return;
    try {
      await adminFetch(`/services/${id}`, { method: 'DELETE' });
      setLocationServices(locationServices.filter(s => s._id !== id));
    } catch {
      setLocationServices(locationServices.filter(s => s._id !== id));
    }
  };

  // Location FAQs management
  const addLocationFAQ = () => {
    setLocationFormData(prev => ({
      ...prev,
      faqs: [...(prev.faqs || []), { question: '', answer: '' }]
    }));
  };

  const updateLocationFAQ = (index: number, field: keyof ServiceFAQ, value: string) => {
    setLocationFormData(prev => {
      const updated = [...(prev.faqs || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, faqs: updated };
    });
  };

  const removeLocationFAQ = (index: number) => {
    setLocationFormData(prev => ({
      ...prev,
      faqs: (prev.faqs || []).filter((_, i) => i !== index)
    }));
  };

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
      <div className="space-y-6 text-slate-800 text-base sm:text-lg leading-relaxed font-normal">
        {blocks.map((block, idx) => {
          if (block.type === 'h1') {
            return (
              <h1 key={idx} className="text-3xl sm:text-4xl font-black text-slate-950 mt-10 mb-4 tracking-tight">
                {block.items[0]}
              </h1>
            );
          }
          if (block.type === 'h2') {
            return (
              <h2 key={idx} className="text-2xl sm:text-3xl font-black text-cyan-950 border-b-2 border-cyan-100 pb-3 mt-10 mb-4 tracking-tight">
                {block.items[0]}
              </h2>
            );
          }
          if (block.type === 'h3') {
            return (
              <h3 key={idx} className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-8 mb-3">
                {block.items[0]}
              </h3>
            );
          }
          if (block.type === 'image') {
            return (
              <figure key={idx} className="my-8 space-y-2">
                <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-950">
                  <img src={block.items[0]} alt={block.items[1]} className="w-full h-auto object-cover max-h-[600px]" />
                </div>
              </figure>
            );
          }
          if (block.type === 'list') {
            return (
              <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6 my-6 shadow-sm">
                <ul className="space-y-3 pl-2">
                  {block.items.map((bullet, i) => {
                    const formattedBullet = bullet.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-slate-950">$1</strong>');
                    return (
                      <li key={i} className="flex items-start gap-3 text-slate-800 font-medium">
                        <span className="w-2 h-2 rounded-full bg-cyan-600 mt-2.5 flex-shrink-0" />
                        <span dangerouslySetInnerHTML={{ __html: formattedBullet }} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          }
          const formatted = block.items[0].replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-slate-950">$1</strong>');
          return <p key={idx} className="leading-relaxed text-slate-800 font-normal" dangerouslySetInnerHTML={{ __html: formatted }} />;
        })}
      </div>
    );
  };

  const getCompanyName = (comp: string | { _id: string; name: string; code: string; slug?: string } | undefined) => {
    if (typeof comp === 'object' && comp?.name) return comp.name;
    return 'Linkup Group';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 sm:p-10 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 font-bold text-sm">Loading full service content...</p>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 sm:p-10 flex flex-col items-center justify-center">
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <HiOutlineDocumentText className="w-16 h-16 text-slate-400 mx-auto" />
          <h2 className="text-2xl font-black text-slate-900">Service Not Found</h2>
          <p className="text-slate-600 text-sm">{error || 'The requested service could not be retrieved.'}</p>
          <Link
            href="/admin/services"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-900 hover:bg-cyan-950 text-white font-extrabold text-sm transition-colors"
          >
            <HiOutlineArrowLeft className="w-5 h-5" />
            <span>Back to Services Overview</span>
          </Link>
        </div>
      </div>
    );
  }

  const imgUrl = service.image?.url || service.imageUrl;
  const companyName = getCompanyName(service.companyId);
  const currentStatus = service.status || (service.isVisible ? 'Publish' : 'Hide');

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Controls Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
          <Link
            href="/admin/services"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-sm transition-colors"
          >
            <HiOutlineArrowLeft className="w-5 h-5" />
            <span>Back to Services</span>
          </Link>

          <div className="flex items-center gap-3">
            {companyName && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-extrabold text-xs border border-slate-200">
                <HiOutlineBuildingOffice2 className="w-4 h-4 text-cyan-600" />
                <span>{companyName}</span>
              </span>
            )}
            <span
              className={`text-xs font-black px-3.5 py-1.5 rounded-full border uppercase tracking-wider ${
                currentStatus === 'Publish'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : currentStatus === 'Draft'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              {currentStatus}
            </span>
          </div>
        </div>

        {/* Main Service Container */}
        <article className="bg-white border-2 border-slate-200/80 rounded-3xl overflow-hidden shadow-xl">
          {/* Header Banner */}
          {imgUrl && (
            <div className="relative w-full aspect-[21/9] sm:aspect-[2/1] bg-gradient-to-br from-cyan-950 via-slate-900 to-blue-950 border-b border-slate-200 overflow-hidden">
              <img
                src={imgUrl}
                alt={service.serviceName || service.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 sm:p-10 space-y-8">
            {/* Heading & Title */}
            <div className="space-y-4 border-b border-slate-100 pb-6">
              <div className="flex flex-wrap items-center gap-3">
                {service.heading ? (
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-cyan-50 text-cyan-900 border border-cyan-200">
                    {service.heading}
                  </span>
                ) : (
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-cyan-50 text-cyan-900 border border-cyan-200">
                    Main Service (Delhi NCR)
                  </span>
                )}
                <span className="font-mono text-cyan-700 text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  /services/{service.slug}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 leading-tight tracking-tight">
                {service.serviceName || service.title}
              </h1>

              {service.titleLines && service.titleLines.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {service.titleLines.map((line, idx) => (
                    <span key={idx} className="bg-slate-50 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold border border-slate-200">
                      Line {idx + 1}: &ldquo;{line}&rdquo;
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Excerpt / Summary Box */}
            {(service.shortDescription || service.text) && (
              <div className="p-5 sm:p-6 rounded-2xl bg-cyan-50/70 border-2 border-cyan-200/80 text-cyan-950">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-800 block mb-1">Overview Summary</span>
                <p className="text-base sm:text-lg font-bold leading-relaxed italic">
                  &ldquo;{service.shortDescription || service.text}&rdquo;
                </p>
              </div>
            )}

            {/* Key Deliverables Highlights */}
            {service.deliverables && service.deliverables.length > 0 && (
              <div className="bg-gradient-to-br from-slate-900 to-cyan-950 text-white p-6 sm:p-8 rounded-3xl space-y-4 shadow-lg">
                <h3 className="text-lg font-black uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <HiOutlineCheckCircle className="w-6 h-6 text-cyan-400" />
                  <span>Key Deliverables</span>
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {service.deliverables.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 bg-white/10 p-3.5 rounded-2xl backdrop-blur-sm border border-white/10 text-sm font-bold">
                      <span className="text-cyan-400 font-black text-base leading-none">✓</span>
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Complete Full Service Body Content */}
            <div className="pt-2">
              {renderServiceContent(service.fullDescription || service.text)}
            </div>

            {/* FAQs Section */}
            {service.faqs && service.faqs.length > 0 && (
              <div className="pt-8 border-t border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-black text-xl">
                  <HiOutlineQuestionMarkCircle className="w-6 h-6 text-cyan-600" />
                  <span>Frequently Asked Questions</span>
                </div>
                <div className="space-y-3">
                  {service.faqs.map((faq, idx) => (
                    <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <h4 className="font-extrabold text-base text-slate-900">Q: {faq.question}</h4>
                      <p className="font-medium text-slate-700 text-base leading-relaxed pl-3 border-l-2 border-cyan-600">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags Footer */}
            {service.tags && service.tags.length > 0 && (
              <div className="pt-8 border-t border-slate-200 space-y-3">
                <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <HiOutlineTag className="w-4 h-4 text-cyan-700" />
                  <span>Service Tags</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {service.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-extrabold border border-slate-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>

        {/* ======================================================================
            REGIONAL & LOCATION SERVICES SECTION (Noida, Gurgaon, Delhi, etc.)
            ====================================================================== */}
        <section className="bg-white border-2 border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <HiOutlineLocationMarker className="w-6 h-6 text-cyan-600" />
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Regional & Location Services
                </h2>
              </div>
              <p className="text-sm font-semibold text-slate-600 mt-1">
                City and regional variations for this service (e.g. Noida, Gurgaon, Delhi) with individual details and local SEO.
              </p>
            </div>

            <button
              onClick={() => handleOpenLocationModal()}
              className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center gap-2 self-start sm:self-auto cursor-pointer transition-all hover:scale-[1.02]"
            >
              <HiOutlinePlus className="w-5 h-5" />
              <span>Add Location Service</span>
            </button>
          </div>

          {loadingLocations ? (
            <div className="py-8 text-center text-slate-500 font-bold text-sm">
              Loading location variations...
            </div>
          ) : locationServices.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 space-y-3">
              <HiOutlineLocationMarker className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="font-extrabold text-slate-800 text-lg">No Location Services Added Yet</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Create regional versions of this service for cities like <strong>Noida</strong>, <strong>Gurgaon</strong>, or <strong>Delhi</strong>. They will appear as cards below.
              </p>
              <button
                onClick={() => handleOpenLocationModal()}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm rounded-xl shadow-sm cursor-pointer"
              >
                + Add First Location Service
              </button>
            </div>
          ) : (
            /* LOCATION SERVICE CARDS GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {locationServices.map((loc) => {
                const locImg = loc.image?.url || loc.imageUrl || imgUrl;
                const locStatus = loc.status || (loc.isVisible ? 'Publish' : 'Hide');

                return (
                  <div
                    key={loc._id || loc.slug}
                    className="bg-white border-2 border-slate-200 hover:border-cyan-500 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 group"
                  >
                    <div>
                      {/* Thumbnail with Location Badge */}
                      <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden border-b border-slate-200">
                        {locImg ? (
                          <img
                            src={locImg}
                            alt={loc.serviceName || loc.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                            NO IMAGE
                          </div>
                        )}

                        <span className="absolute top-2.5 left-2.5 px-3 py-1 rounded-xl text-xs font-black bg-cyan-600 text-white shadow-sm flex items-center gap-1">
                          <HiOutlineLocationMarker className="w-3.5 h-3.5" />
                          <span>{loc.location}</span>
                        </span>

                        <span
                          className={`absolute top-2.5 right-2.5 text-xs font-extrabold px-2.5 py-0.5 rounded-full border shadow-sm ${
                            locStatus === 'Publish'
                              ? 'bg-emerald-500 text-white border-emerald-600'
                              : 'bg-slate-700 text-white border-slate-800'
                          }`}
                        >
                          {locStatus}
                        </span>
                      </div>

                      {/* Card Content */}
                      <div className="p-5 space-y-2.5">
                        <span className="font-mono text-cyan-700 text-xs font-bold bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200 inline-block">
                          /{loc.slug}
                        </span>

                        <h3 className="font-extrabold text-lg text-slate-900 leading-snug line-clamp-2">
                          <Link
                            href={`/admin/services/${service.slug}/${loc.slug}`}
                            className="hover:text-cyan-700 transition-colors"
                          >
                            {loc.serviceName || loc.title}
                          </Link>
                        </h3>

                        {loc.heading && (
                          <p className="text-xs font-bold text-cyan-700 uppercase tracking-wide">
                            {loc.heading}
                          </p>
                        )}

                        <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                          {loc.shortDescription || loc.text || 'No description provided.'}
                        </p>

                        <div className="flex items-center gap-3 pt-2 text-xs font-bold text-slate-600 border-t border-slate-100">
                          <span>✓ {loc.deliverables?.length || 0} Deliverables</span>
                          <span>•</span>
                          <span>{loc.faqs?.length || 0} FAQs</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-100 mt-2">
                      <Link
                        href={`/admin/services/${service.slug}/${loc.slug}`}
                        className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-extrabold text-xs border border-cyan-200 transition-colors cursor-pointer"
                        title="View Full Location Service Page"
                      >
                        <HiOutlineEye className="w-4 h-4 text-cyan-600" />
                        <span>View Details</span>
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenLocationModal(loc)}
                          className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-cyan-700 hover:bg-cyan-50 border border-slate-200 transition-colors cursor-pointer"
                          title="Edit Location Service"
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLocation(loc._id!)}
                          className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer"
                          title="Delete Location Service"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Bottom Back Button */}
        <div className="flex justify-center pt-4">
          <Link
            href="/admin/services"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-cyan-900 hover:bg-cyan-950 text-white font-black text-base shadow-lg hover:shadow-xl transition-all"
          >
            <HiOutlineArrowLeft className="w-6 h-6" />
            <span>Return to Services Overview</span>
          </Link>
        </div>
      </div>

      {/* ======================================================================
          LOCATION SERVICE CREATE / EDIT MODAL
          ====================================================================== */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto pt-6 pb-12">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-4xl w-full flex flex-col shadow-2xl my-auto max-h-[88vh] overflow-hidden relative">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-30 shadow-sm">
              <div>
                <h3 className="font-extrabold text-2xl text-slate-900 tracking-tight">
                  {editingLocationItem ? 'Edit Location Service' : 'Add Location Service'}
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  Parent Service: <span className="text-cyan-700 font-extrabold">{service.serviceName || service.title}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <HiOutlineX className="w-8 h-8 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="p-6 space-y-6 overflow-y-auto flex-1 text-base">
              {/* Location Selector & Quick Chips */}
              <div className="space-y-2">
                <label className="block text-base font-bold text-slate-800">Target City / Region *</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {COMMON_LOCATIONS.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => handleSelectLocationChip(loc)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        locationFormData.location === loc
                          ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={locationFormData.location}
                  onChange={(e) => {
                    const loc = e.target.value;
                    setLocationFormData({ ...locationFormData, location: loc });
                  }}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                  placeholder="e.g. Noida, Gurgaon, Delhi, etc."
                />
              </div>

              {/* Title & Slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Location Service Title *</label>
                  <input
                    type="text"
                    required
                    value={locationFormData.serviceName}
                    onChange={(e) => {
                      const title = e.target.value;
                      setLocationFormData({
                        ...locationFormData,
                        serviceName: title,
                        title,
                        slug: locationFormData.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                      });
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                    placeholder="e.g. Website Strategy & UX in Noida"
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-2">Slug *</label>
                  <input
                    type="text"
                    required
                    value={locationFormData.slug}
                    onChange={(e) => setLocationFormData({ ...locationFormData, slug: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-mono font-bold text-cyan-800 focus:outline-none focus:border-cyan-600"
                    placeholder="website-strategy-ux-noida"
                  />
                </div>
              </div>

              {/* Tagline / Heading */}
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Tagline / Sub-Heading</label>
                <input
                  type="text"
                  value={locationFormData.heading || ''}
                  onChange={(e) => setLocationFormData({ ...locationFormData, heading: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                  placeholder="e.g. Premier Web Strategy Services for Noida Enterprises"
                />
              </div>

              {/* Publish Status */}
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Publish Status</label>
                <select
                  value={locationFormData.status || (locationFormData.isVisible ? 'Publish' : 'Hide')}
                  onChange={(e) => {
                    const st = e.target.value as any;
                    setLocationFormData({
                      ...locationFormData,
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

              {/* Short Summary */}
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Short Summary / Excerpt</label>
                <textarea
                  rows={2}
                  value={locationFormData.shortDescription || locationFormData.text || ''}
                  onChange={(e) => setLocationFormData({ ...locationFormData, shortDescription: e.target.value, text: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600 leading-relaxed"
                  placeholder="Location-specific overview summary..."
                />
              </div>

              {/* Deliverables (1 per line) */}
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Deliverables (1 per line)</label>
                <textarea
                  rows={3}
                  value={locationDeliverablesInput}
                  onChange={(e) => setLocationDeliverablesInput(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-600 leading-relaxed"
                  placeholder="Local market competitive analysis&#10;High-fidelity prototype&#10;Conversion architecture"
                />
              </div>

              {/* In-Depth Full Content */}
              <RichTextEditor
                label="Location Service Content (Markdown / HTML)"
                value={locationFormData.fullDescription || locationFormData.text || ''}
                onChange={(content) => setLocationFormData({ ...locationFormData, fullDescription: content })}
                rows={10}
              />

              {/* Location FAQs */}
              <div className="border-2 border-slate-200 bg-slate-50 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <HiOutlineQuestionMarkCircle className="w-5 h-5 text-cyan-600" />
                      <span>Location FAQs ({locationFormData.location})</span>
                    </h4>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">Common questions from clients in this specific city</p>
                  </div>
                  <button
                    type="button"
                    onClick={addLocationFAQ}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <HiOutlinePlus className="w-4 h-4" />
                    <span>Add FAQ</span>
                  </button>
                </div>

                {(locationFormData.faqs || []).length === 0 ? (
                  <p className="text-center py-4 text-xs font-bold text-slate-400 border border-dashed border-slate-300 rounded-xl">
                    No location FAQs added. Click &quot;Add FAQ&quot; above.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {locationFormData.faqs!.map((faq, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 relative">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black uppercase text-cyan-700 tracking-wider">FAQ #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeLocationFAQ(idx)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <HiOutlineTrash className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => updateLocationFAQ(idx, 'question', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                          placeholder={`Question for ${locationFormData.location} clients...`}
                        />
                        <textarea
                          rows={2}
                          value={faq.answer}
                          onChange={(e) => updateLocationFAQ(idx, 'answer', e.target.value)}
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
                  value={locationTagsInput}
                  onChange={(e) => setLocationTagsInput(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base font-mono font-bold text-cyan-800 focus:outline-none focus:border-cyan-600"
                  placeholder="Noida, Web Strategy, NCR"
                />
              </div>

              {/* Featured Image */}
              <div className="space-y-2">
                <label className="block text-base font-bold text-slate-800">Featured Image URL / Asset Path</label>
                <input
                  type="text"
                  value={locationFormData.imageUrl || locationFormData.image?.url || ''}
                  onChange={(e) => {
                    const url = e.target.value;
                    setLocationFormData({
                      ...locationFormData,
                      imageUrl: url,
                      image: { url, publicId: locationFormData.image?.publicId || '' }
                    });
                  }}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 text-base font-mono font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                  placeholder="/assets/services/service_noida.jpg or https://..."
                />
              </div>

              <ImageUploadInput
                label="Or Upload Image to Cloudinary"
                value={locationFormData.image || { url: '', publicId: '' }}
                onChange={(image) => setLocationFormData({ ...locationFormData, image, imageUrl: image.url })}
                folder="linkup_services"
              />

              {/* Local SEO Section */}
              <SeoFormSection
                seo={locationFormData.seo || {}}
                onChange={(seo) => setLocationFormData({ ...locationFormData, seo })}
              />

              {/* Modal Footer */}
              <div className="pt-4 sm:pt-5 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm sm:text-base font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLocation}
                  className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm sm:text-base rounded-xl cursor-pointer shadow-md transition-all"
                >
                  {savingLocation ? 'Saving...' : 'Save Location Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
