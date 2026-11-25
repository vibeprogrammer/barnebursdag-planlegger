import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiHandlers from '../api/shared/handlers.cjs';
import { canonicalLocation } from '../scripts/content-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 8080;
const DIST = path.join(__dirname, '..', 'dist');
const {
  getHealthResponse,
  getKassalProductsResponse,
  getMenyCartResponse
} = apiHandlers;

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

function sendApiResponse(res, result) {
  res.set(result.headers);
  return res.status(result.status).json(result.body);
}

// Local development and E2E adapter for the same handlers deployed as managed Functions.
app.get('/api/health', (_req, res) => {
  sendApiResponse(res, getHealthResponse());
});

app.get('/api/kassal/products', async (req, res) => {
  sendApiResponse(res, await getKassalProductsResponse(req.query));
});

app.post('/api/meny/cart', async (req, res) => {
  sendApiResponse(res, await getMenyCartResponse(req.body));
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Fant ikke API-endepunktet.' });
});

// Canonical URL: one 301 for www / azure hosts, trailing slashes and legacy guide paths.
// Registered before static files so a directory index cannot answer /kontakt/ with 200.
app.use((req, res, next) => {
  const search = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const location = canonicalLocation({ hostname: req.hostname, pathname: req.path, search });
  if (!location) return next();
  const status = req.method === 'GET' || req.method === 'HEAD' ? 301 : 308;
  res.redirect(status, location);
});

// index:false so express.static does not serve dist/<page>/index.html for a trailing slash.
// redirect:false so it does not add a slash of its own. The catch-all below serves the
// extensionless page, and anything else is a real 404 (no SPA catch-all).
app.use(express.static(DIST, { maxAge: '1h', index: false, redirect: false }));
app.get('*', (req, res) => {
  const bare = req.path === '/' ? '/' : req.path.replace(/\/+$/, '') || '/';
  if (bare !== req.path) {
    const search = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    return res.redirect(301, bare + search);
  }
  const page = bare === '/' ? path.join(DIST, 'index.html') : path.join(DIST, bare, 'index.html');
  const root = path.resolve(DIST);
  const resolved = path.resolve(page);
  if ((resolved === path.join(root, 'index.html') || resolved.startsWith(root + path.sep)) && fs.existsSync(resolved)) {
    return res.sendFile(resolved);
  }
  res.status(404).sendFile(path.join(DIST, '404.html'), (err) => err && res.sendFile(path.join(DIST, 'index.html')));
});

app.listen(PORT, () => {
  console.log(`🎂 Kakeklar kjører på http://0.0.0.0:${PORT}  (kassal: ${process.env.KASSAL_API_KEY ? 'på' : 'av'})`);
});
