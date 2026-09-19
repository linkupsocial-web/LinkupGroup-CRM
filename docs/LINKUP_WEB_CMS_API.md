# Linkup Web ↔ CRM API integration

## Purpose

The CRM list APIs are optimized for card pages. They do **not** return article content, galleries, SEO objects, or raw base64 images. This keeps the initial Linkup Web response small and fast.

Use the card/list endpoint for grids. Fetch a single record only when a visitor opens its detail page.

## New image field — use this first

Every blog, case-study, service, project, and testimonial list item now has:

```ts
cardImageUrl: string
```

`cardImageUrl` is the canonical, complete image URL for a card. It points to a small CRM image endpoint, for example:

```text
https://your-crm-api.example.com/api/blogs/RECORD_ID/image
```

The endpoint either returns the image bytes or redirects to Cloudinary. Do not download it in JavaScript; put it directly in an `<img src>` or image component.

`cardImagePath` is also present for the CRM admin app. It is a relative path and should not be used by Linkup Web. Use `cardImageUrl` instead.

For backward compatibility, these existing fields are also populated with the same lightweight URL:

| Content type | Compatible fields |
| --- | --- |
| Blogs | `image`, `imageUrl`, `featuredImage.url` |
| Case studies | `image`, `imageUrl`, `featuredImage.url` |
| Services | `image.url`, `imageUrl` |
| Projects | `thumbnail.url` |
| Testimonials | `profileImage.url` |

Example blog-card response:

```json
{
  "_id": "BLOG_ID",
  "title": "Example article",
  "excerpt": "Short card description",
  "cardImageUrl": "https://your-crm-api.example.com/api/blogs/BLOG_ID/image",
  "cardImagePath": "/api/blogs/BLOG_ID/image",
  "image": "https://your-crm-api.example.com/api/blogs/BLOG_ID/image"
}
```

The CRM infers its public API host from the request. For a fixed production host, the CRM deployment can optionally define `PUBLIC_API_URL` as its full API URL, for example `https://your-crm-api.example.com/api`.

## Required Linkup Web card code

Use this helper for all card images:

```ts
function getCardImage(item: {
  cardImageUrl?: string;
  image?: string | { url?: string };
  imageUrl?: string;
  featuredImage?: { url?: string };
  thumbnail?: { url?: string };
  profileImage?: { url?: string };
}) {
  return (
    item.cardImageUrl ||
    item.featuredImage?.url ||
    item.thumbnail?.url ||
    item.profileImage?.url ||
    (typeof item.image === 'object' ? item.image?.url : item.image) ||
    item.imageUrl ||
    ''
  );
}
```

```tsx
const imageUrl = getCardImage(item);

{imageUrl ? (
  <img
    src={imageUrl}
    alt={item.title || item.projectTitle || item.serviceName || 'Linkup Web'}
    loading="lazy"
    onError={(event) => {
      event.currentTarget.style.display = 'none';
    }}
  />
) : (
  <CardImageFallback />
)}
```

Do **not** filter projects, blogs, or services by image presence. A record can be valid even when its image has not yet been uploaded. Render the card and show a fallback for a missing or failed image.

## API endpoints

`CMS_API_URL` below includes `/api`, for example `https://your-crm-api.example.com/api`.

| Content | Fast card list | Full detail |
| --- | --- | --- |
| Blogs | `GET /blogs?companyId=COMPANY_ID` | `GET /blogs/:id-or-slug` |
| Case studies | `GET /case-studies?companyId=COMPANY_ID` | `GET /case-studies/:id-or-slug` |
| Services | `GET /services?companyId=COMPANY_ID` | `GET /services/:id-or-slug` |
| Projects | `GET /projects?companyId=COMPANY_ID` | `GET /projects/:id` |
| Testimonials | `GET /testimonials?companyId=COMPANY_ID` | `GET /testimonials/:id` |
| FAQs | `GET /faqs?companyId=COMPANY_ID` | Not required; the list is already small |

Get the Linkup Web `COMPANY_ID` from `GET /companies` by selecting the company whose `code` is `WEB`. Do not send the literal text `WEB` as `companyId`.

For the public Linkup Web site, do not send admin-only query parameters such as `includeAll=true` or `includeHidden=true`.

## Recommended Linkup Web fetching

Use a short revalidation period for public pages. This keeps the page quick and lets CRM changes appear shortly after publishing.

```ts
const response = await fetch(
  `${process.env.CMS_API_URL}/projects?companyId=${companyId}`,
  { next: { revalidate: 60 } }
);

const payload = await response.json();
const projects = payload.data;
```

For an admin preview or a page that must show a CMS edit immediately, use:

```ts
fetch(url, { cache: 'no-store' });
```

Never use `force-cache` or a build-time-only fetch for CMS content. If Linkup Web uses a static-site build, it must be redeployed or revalidated after a CMS update.

## Performance rules

1. Render card lists from the list endpoint only.
2. Fetch the detail endpoint only after a card is opened.
3. Use `cardImageUrl` and `loading="lazy"` for card images.
4. Do not convert image responses to base64 in the Linkup Web frontend.
5. Upload new images to Cloudinary. Old embedded base64 images work, but are slower when their individual image endpoint is requested.

## Current data note

Some existing Linkup Web projects have no thumbnail saved. Those project cards must still render, but they need a fallback image until an editor uploads a thumbnail in CRM.
