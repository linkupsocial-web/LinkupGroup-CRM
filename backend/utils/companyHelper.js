const mongoose = require('mongoose');
const Company = require('../models/Company');

/**
 * Resolves a company ObjectId from various inputs (ObjectId, slug, code, name, query, headers).
 * 
 * Supports:
 * - Direct value: ObjectId string, slug (e.g. 'linkup-social', 'linkup-web'), code (e.g. 'SOCIAL', 'WEB', 'LEGAL', 'FINSERV'), name
 * - Request object (checks req.query.companyId, req.query.company, req.query.companyCode, req.query.companySlug, req.query.company_id, req.headers['x-company-id'], req.headers['x-company-code'], req.headers['x-company-slug'], req.headers['x-company'], body.companyId, etc.)
 * 
 * Returns:
 * - null if 'all' or not specified
 * - mongoose.Types.ObjectId if resolved
 * - 'NOT_FOUND' if a specific company was requested but does not exist
 */
async function resolveCompanyId(reqOrValue) {
  let val = '';

  if (typeof reqOrValue === 'string') {
    val = reqOrValue.trim();
  } else if (reqOrValue && typeof reqOrValue === 'object') {
    const query = reqOrValue.query || {};
    const headers = reqOrValue.headers || {};
    const body = reqOrValue.body || {};

    val = query.companyId ||
          query.company ||
          query.companyCode ||
          query.companySlug ||
          query.company_id ||
          headers['x-company-id'] ||
          headers['x-company-code'] ||
          headers['x-company-slug'] ||
          headers['x-company'] ||
          body.companyId ||
          body.company ||
          body.companyCode ||
          '';

    if (typeof val === 'string') val = val.trim();
  }

  if (!val || val === 'all' || val === 'ALL' || val === '*') {
    return null;
  }

  // If already a valid 24-hex ObjectId
  if (mongoose.Types.ObjectId.isValid(val) && /^[0-9a-fA-F]{24}$/.test(val)) {
    try {
      const exists = await Company.findById(val).select('_id');
      if (exists) return exists._id;
    } catch {
      // ignore
    }
  }

  // Try matching by slug, code, or name (case-insensitive exact match)
  const escaped = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escaped}$`, 'i');

  try {
    const comp = await Company.findOne({
      $or: [
        { slug: regex },
        { code: regex },
        { name: regex }
      ]
    }).select('_id');

    if (comp) {
      return comp._id;
    }

    // Try fallback substring match (e.g. 'social' -> 'linkup-social', 'linkup-web' -> 'web')
    const fallbackComp = await Company.findOne({
      $or: [
        { slug: new RegExp(escaped, 'i') },
        { code: new RegExp(escaped, 'i') },
        { name: new RegExp(escaped, 'i') }
      ]
    }).select('_id');

    if (fallbackComp) {
      return fallbackComp._id;
    }
  } catch (err) {
    console.error('Error resolving company ID:', err);
  }

  return 'NOT_FOUND';
}

module.exports = {
  resolveCompanyId
};
