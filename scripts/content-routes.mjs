/** Legacy guide URLs shared by the static host and the local/Docker adapter. */
export const REDIRECTS = {
  '/slik-beregner-kakeklar': '/guider/slik-beregner-kakeklar',
  '/barnehagebursdag': '/guider/barnehagebursdag',
  '/allergier-i-barnebursdag': '/guider/allergier-i-barnebursdag',
  '/om-forfatteren': '/om-utvikleren'
};

export const CANONICAL_HOST = 'kakeklar.no';
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

/**
 * Hosts that must 301 to https://kakeklar.no. Azure Static Web Apps cannot express
 * this in staticwebapp.config.json (routes match the path only). On SWA it is the
 * portal "Set default" custom domain. The Express adapter applies the same rule
 * when a request actually reaches this server.
 */
export function isNonCanonicalProductionHost(hostname) {
  const host = String(hostname || '').trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  if (!host || host === CANONICAL_HOST || host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '0.0.0.0') return false;
  return host === `www.${CANONICAL_HOST}`
    || host.endsWith('.azurestaticapps.net')
    || host.endsWith('.azurestaticwebsites.net')
    || host.endsWith('.azurecontainerapps.io')
    || host === 'push.foo'
    || host.endsWith('.push.foo');
}

/**
 * One 301 to the canonical path (no trailing slash, legacy guides already moved).
 * Returns a relative path for local/canonical hosts, or an absolute https URL when
 * the hostname itself is a known non-canonical production host. Null when the
 * request is already canonical.
 */
export function canonicalLocation({ hostname, pathname, search = '' }) {
  const original = pathname || '/';
  const stripped = original.length > 1 ? original.replace(/\/+$/, '') || '/' : original;
  const target = REDIRECTS[stripped] || stripped;
  const query = search ? (String(search).startsWith('?') ? String(search) : `?${search}`) : '';
  if (!isNonCanonicalProductionHost(hostname) && target === original) return null;
  return isNonCanonicalProductionHost(hostname) ? `${CANONICAL_ORIGIN}${target}${query}` : `${target}${query}`;
}

/**
 * staticwebapp.config.json for the built site.
 *
 * Do not add a rewrite per content page. A route on "/kontakt" also matches
 * "/kontakt/" (Azure treats a folder path as slash-insensitive), so the rewrite
 * answers 200 and `trailingSlash: "never"` never redirects. With no such rewrite,
 * SWA serves dist/kontakt/index.html for /kontakt (200) and 301s /kontakt/ and
 * /kontakt/index.html to /kontakt. That is the documented trailingSlash table.
 * Host redirects (www, *.azurestaticapps.net) are not possible in this file.
 */
export function staticWebAppConfig(base) {
  const config = {
    ...base,
    routes: [
      ...(base.routes || []),
      ...Object.entries(REDIRECTS).map(([route, redirect]) => ({ route, redirect, statusCode: 301 }))
    ],
    trailingSlash: 'never',
    responseOverrides: {
      ...(base.responseOverrides || {}),
      404: { rewrite: '/404.html', statusCode: 404 }
    }
  };
  delete config.navigationFallback;
  return config;
}
