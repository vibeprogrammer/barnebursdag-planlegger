import data from '../../content/affiliates.json';
import { BUILD_CONFIG } from './buildConfig';
import type { Category } from './types';

export interface AffiliateLink {
  label: string;
  merchant: string;
  url: string;
}

/**
 * «Hvor kjøpe» links for the calculator. OFF by default: shown only when the build sets
 * VITE_AFFILIATE_LINKS=1 AND the entry in content/affiliates.json has a url. Always labelled
 * «Annonselenke» and rendered with rel="sponsored nofollow noopener".
 */
export function affiliateLinksFor(category: Category): AffiliateLink[] {
  if (!BUILD_CONFIG.affiliateLinks) return [];
  const list = (data.calculator as Partial<Record<Category, AffiliateLink[]>>)[category] || [];
  return list.filter((l) => l.url && l.label);
}

export const AFFILIATE_DISCLOSURE: string = data.disclosure;
