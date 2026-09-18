/**
 * Page metadata for the "F & Q" section rendered at the bottom of every page.
 *
 * Each page owns its own F & Q records. They are stored through the FAQ API
 * with `pageSlug` set to one of the keys below, so a single shared
 * <FaqSection /> component can serve every page without duplicating code.
 */

export type PageFaqSlug =
  | 'dashboard'
  | 'login'
  | 'blogs'
  | 'blog-detail'
  | 'case-studies'
  | 'case-study-detail'
  | 'faqs'
  | 'projects'
  | 'seo'
  | 'services'
  | 'service-detail'
  | 'location-service-detail'
  | 'settings'
  | 'testimonials'
  | 'users';

/** Human readable page name, shown next to the section heading. */
export const PAGE_FAQ_LABELS: Record<PageFaqSlug, string> = {
  dashboard: 'Admin Dashboard',
  login: 'Admin Login',
  blogs: 'Blogs & Insights',
  'blog-detail': 'Blog Post Editor',
  'case-studies': 'Case Studies',
  'case-study-detail': 'Case Study Detail',
  faqs: 'FAQ Manager',
  projects: 'Projects / Portfolio',
  seo: 'SEO Management',
  services: 'Services',
  'service-detail': 'Service Detail',
  'location-service-detail': 'Location Service Detail',
  settings: 'Site Settings',
  testimonials: 'Testimonials',
  users: 'Users & Access'
};

/** Routes that map 1:1 to a page F & Q set. */
const STATIC_ROUTE_FAQ_SLUGS: Record<string, PageFaqSlug> = {
  '/admin': 'dashboard',
  '/admin/login': 'login',
  '/admin/blogs': 'blogs',
  '/admin/case-studies': 'case-studies',
  '/admin/faqs': 'faqs',
  '/admin/projects': 'projects',
  '/admin/seo': 'seo',
  '/admin/services': 'services',
  '/admin/settings': 'settings',
  '/admin/testimonials': 'testimonials',
  '/admin/users': 'users'
};

/** Trailing slashes, query strings and hashes are normalised before matching. */
function normalizePathname(pathname: string): string {
  const trimmed = (pathname || '').split('?')[0].split('#')[0].replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/**
 * Resolves the page key for a route, including the dynamic
 * /admin/blogs/[slug] and /admin/services/[slug]/[locationSlug] pages.
 */
export function resolvePageFaqSlug(pathname: string): PageFaqSlug {
  const path = normalizePathname(pathname);

  const staticSlug = STATIC_ROUTE_FAQ_SLUGS[path];
  if (staticSlug) return staticSlug;

  const segments = path.split('/').filter(Boolean);

  if (segments[0] === 'admin') {
    if (segments[1] === 'blogs' && segments.length >= 3) return 'blog-detail';
    if (segments[1] === 'case-studies' && segments.length >= 3) return 'case-study-detail';
    if (segments[1] === 'services') {
      if (segments.length >= 4) return 'location-service-detail';
      if (segments.length === 3) return 'service-detail';
    }
  }

  return 'dashboard';
}

/** Page name shown in the F & Q section subtitle. */
export function getPageFaqLabel(slug: PageFaqSlug): string {
  return PAGE_FAQ_LABELS[slug] ?? 'This Page';
}

/**
 * Pages that must not render the shared F & Q section:
 *  - dashboard : overview screen only, it has no F & Q of its own
 *  - faqs      : already the dedicated FAQ manager with its own list
 *  - seo       : SEO form page, no F & Q needed below
 *  - users     : admin users & roles page, no F & Q needed below
 *  - settings  : global settings page, no F & Q needed below
 */
export const PAGE_FAQ_HIDDEN_SLUGS: PageFaqSlug[] = ['dashboard', 'faqs', 'seo', 'users', 'settings'];

/** Whether the F & Q section should render for the given route. */
export function shouldShowPageFaqs(pathname: string): boolean {
  return !PAGE_FAQ_HIDDEN_SLUGS.includes(resolvePageFaqSlug(pathname));
}