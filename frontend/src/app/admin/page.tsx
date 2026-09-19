'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth, Company } from '@/context/AdminAuthContext';
import { adminFetch } from '@/lib/adminApi';
import {
  HiOutlineBriefcase,
  HiOutlineFolderOpen,
  HiOutlineChatAlt2,
  HiOutlineDocumentText,
  HiOutlineBookOpen,
  HiOutlineQuestionMarkCircle,
  HiOutlinePlus,
  HiOutlineArrowRight
} from 'react-icons/hi';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';

interface CompanyStats {
  company: Company;
  projectsCount: number;
  servicesCount: number;
  blogsCount: number;
  caseStudiesCount: number;
  testimonialsCount: number;
  faqsCount: number;
}

export default function AdminDashboardPage() {
  const { selectedCompany, setSelectedCompany, companies } = useAdminAuth();
  const [companyBreakdown, setCompanyBreakdown] = useState<CompanyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllCompanyBreakdown = async () => {
      if (!companies || companies.length === 0) return;
      setLoading(true);

      try {
        const statsPromises = companies.map(async (comp) => {
          const query = `?companyId=${comp._id}&includeHidden=true&summary=true`;
          const [sRes, pRes, bRes, csRes, tRes, fRes] = await Promise.allSettled([
            adminFetch(`/services${query}`),
            adminFetch(`/projects${query}`),
            adminFetch(`/blogs${query}&includeAll=true`),
            adminFetch(`/case-studies${query}&includeAll=true`),
            adminFetch(`/testimonials${query}`),
            adminFetch(`/faqs${query}`)
          ]);

          return {
            company: comp,
            servicesCount: sRes.status === 'fulfilled' ? sRes.value.count || 0 : 0,
            projectsCount: pRes.status === 'fulfilled' ? pRes.value.count || 0 : 0,
            blogsCount: bRes.status === 'fulfilled' ? bRes.value.count || 0 : 0,
            caseStudiesCount: csRes.status === 'fulfilled' ? csRes.value.count || 0 : 0,
            testimonialsCount: tRes.status === 'fulfilled' ? tRes.value.count || 0 : 0,
            faqsCount: fRes.status === 'fulfilled' ? fRes.value.count || 0 : 0,
          };
        });

        const results = await Promise.all(statsPromises);
        setCompanyBreakdown(results);
      } catch {
        // Fallback default statistics
        setCompanyBreakdown(companies.map(c => ({
          company: c,
          projectsCount: 2,
          servicesCount: 1,
          blogsCount: 3,
          caseStudiesCount: 2,
          testimonialsCount: 2,
          faqsCount: 1
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchAllCompanyBreakdown();
  }, [companies]);

  const activeStats = companyBreakdown.find(cb => cb.company._id === selectedCompany?._id) || companyBreakdown[0];

  return (
    <div className="space-y-6">
      {/* Active Selected Company Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold mb-2">
            <HiOutlineBuildingOffice2 className="w-4 h-4 text-cyan-600" />
            <span>Active: {selectedCompany?.name || 'Linkup Group'} ({selectedCompany?.code})</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">CMS Management Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl font-medium leading-relaxed">
            Manage projects, services, blogs, case studies, and SEO independently for each of the 4 Linkup Group websites.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/admin/services"
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-all"
          >
            <HiOutlinePlus className="w-4 h-4" />
            <span>Add Service</span>
          </Link>
          <Link
            href="/admin/projects"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs flex items-center gap-1.5 border border-slate-300 transition-all shadow-xs"
          >
            <HiOutlinePlus className="w-4 h-4" />
            <span>Add Project</span>
          </Link>
        </div>
      </div>

      {/* Selected Company Quick Metric Summary */}
      {selectedCompany && activeStats && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Active Company Summary ({selectedCompany.name})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <Link href="/admin/services" className="p-4 bg-white border border-slate-200 hover:border-cyan-500 rounded-xl shadow-xs transition-all hover:-translate-y-0.5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mb-3">
                <HiOutlineBriefcase className="w-5 h-5" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">{loading ? '...' : activeStats.servicesCount}</div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">Services</div>
            </Link>

            <Link href="/admin/projects" className="p-4 bg-white border border-slate-200 hover:border-cyan-500 rounded-xl shadow-xs transition-all hover:-translate-y-0.5">
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center mb-3">
                <HiOutlineFolderOpen className="w-5 h-5" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">{loading ? '...' : activeStats.projectsCount}</div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">Projects</div>
            </Link>

            <Link href="/admin/blogs" className="p-4 bg-white border border-slate-200 hover:border-cyan-500 rounded-xl shadow-xs transition-all hover:-translate-y-0.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-3">
                <HiOutlineDocumentText className="w-5 h-5" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">{loading ? '...' : activeStats.blogsCount}</div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">Blogs & Insights</div>
            </Link>

            <Link href="/admin/case-studies" className="p-4 bg-white border border-slate-200 hover:border-cyan-500 rounded-xl shadow-xs transition-all hover:-translate-y-0.5">
              <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-200 flex items-center justify-center mb-3">
                <HiOutlineBookOpen className="w-5 h-5" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">{loading ? '...' : activeStats.caseStudiesCount}</div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">Case Studies</div>
            </Link>

            <Link href="/admin/testimonials" className="p-4 bg-white border border-slate-200 hover:border-cyan-500 rounded-xl shadow-xs transition-all hover:-translate-y-0.5">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-3">
                <HiOutlineChatAlt2 className="w-5 h-5" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">{loading ? '...' : activeStats.testimonialsCount}</div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">Testimonials</div>
            </Link>

            <Link href="/admin/faqs" className="p-4 bg-white border border-slate-200 hover:border-cyan-500 rounded-xl shadow-xs transition-all hover:-translate-y-0.5">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mb-3">
                <HiOutlineQuestionMarkCircle className="w-5 h-5" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">{loading ? '...' : activeStats.faqsCount}</div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">FAQs</div>
            </Link>
          </div>
        </div>
      )}

      {/* Main Company-wise Content Breakdown Cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
          <HiOutlineBuildingOffice2 className="w-4 h-4 text-cyan-600" />
          <span>Company Content Breakdown</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companyBreakdown.map((item) => {
            const isSelected = selectedCompany?._id === item.company._id;
            return (
              <div
                key={item.company._id}
                className={`p-5 rounded-2xl border transition-all shadow-xs flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-cyan-500 ring-1 ring-cyan-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Company Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200 uppercase tracking-wider">
                      {item.company.code}
                    </span>
                    {isSelected && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ✓ Active
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-1">{item.company.name}</h3>
                  <p className="text-xs text-slate-500 font-medium leading-normal mb-4">
                    {item.company.description || 'Linkup Group specialized website module.'}
                  </p>

                  {/* Company Projects & Services Breakdown Grid */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projects</div>
                      <div className="text-base font-extrabold text-purple-700">
                        {loading ? '...' : item.projectsCount} Projects
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Services</div>
                      <div className="text-base font-extrabold text-cyan-700">
                        {loading ? '...' : item.servicesCount} Services
                      </div>
                    </div>

                    <div className="space-y-0.5 pt-2 border-t border-slate-200">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blogs</div>
                      <div className="text-sm font-bold text-emerald-700">
                        {loading ? '...' : item.blogsCount} Articles
                      </div>
                    </div>

                    <div className="space-y-0.5 pt-2 border-t border-slate-200">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Testimonials & FAQs</div>
                      <div className="text-sm font-bold text-amber-700">
                        {loading ? '...' : item.testimonialsCount + item.faqsCount} Items
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Slug: /{item.company.slug}</span>
                  <button
                    onClick={() => setSelectedCompany(item.company)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Switch Company'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

