'use strict';
// Operation Amelie: dependency-free Node server with persistent dinner bookings.
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const BOOKING_FILE = path.join(DATA_DIR, 'bookings.json');
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const GITHUB_TOKEN = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '');
const GITHUB_BOOKINGS_BACKUP = process.env.GITHUB_BOOKINGS_BACKUP === 'true' || !!GITHUB_TOKEN;
const SESSION_SECRET = crypto.randomBytes(32);
const HOUR = 3600000;
const SESSION_MS = 12 * HOUR;
const loginAttempts = new Map();
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2' };
let writeQueue = Promise.resolve();
let backupQueue = Promise.resolve();
let backupWarningShown = false;

function send(res, status, data, headers = {}) {
  const isObject = typeof data !== 'string' && !Buffer.isBuffer(data);
  const body = isObject ? JSON.stringify(data) : data;
  res.writeHead(status, { 'Content-Type': isObject ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...headers });
  res.end(body);
}
function error(res, status, message) { send(res, status, { error: message }); }
function safeEqual(a,b) {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x,y);
}
function readCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(x => x.trim()).filter(x => x.includes('=')).map(x => { const i=x.indexOf('='); return [x.slice(0,i),x.slice(i+1)]; }));
}
function sign(input) { return crypto.createHmac('sha256', SESSION_SECRET).update(input).digest('base64url'); }
function makeToken() { const payload = `${Date.now() + SESSION_MS}.${crypto.randomBytes(16).toString('hex')}`; return `${payload}.${sign(payload)}`; }
function authed(req) {
  const token = readCookies(req).amelie_admin || '';
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  return Number(parts[0]) > Date.now() && safeEqual(parts[2], sign(payload));
}
function cookie(token, req) { const secure = process.env.COOKIE_SECURE === 'true' || req.headers['x-forwarded-proto'] === 'https'; return `amelie_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS/1000}${secure ? '; Secure' : ''}`; }
async function bodyJSON(req) {
  const chunks=[]; let count=0;
  for await (const chunk of req) { count+=chunk.length; if(count>10000) throw new Error('Request too large.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('Invalid JSON.'); }
}
function parseBookings(content) { const parsed = JSON.parse(content); return Array.isArray(parsed) ? parsed : []; }
function mergeBookings(local, remote) {
  const merged = new Map();
  for(const booking of [...local, ...remote]) {
    const key = booking && (booking.id || booking.key);
    if(key) merged.set(key, booking);
  }
  return [...merged.values()];
}
async function readLocalBookings() { try { return parseBookings(await fs.readFile(BOOKING_FILE,'utf8')); } catch(e) { if(e.code==='ENOENT') return []; throw e; } }
async function readGitHubBookings() {
  const config = githubConfig();
  if(!config) return [];
  const current = await currentGitHubFile(config);
  if(!current || !current.content) return [];
  return parseBookings(Buffer.from(String(current.content).replace(/\n/g,''), 'base64').toString('utf8'));
}
async function readBookings() {
  const local = await readLocalBookings();
  if(!GITHUB_BOOKINGS_BACKUP) return local;
  try { return mergeBookings(local, await readGitHubBookings()); }
  catch(e) { console.error('GitHub bookings restore failed:', e.message); return local; }
}
function githubConfig() {
  if(!GITHUB_BOOKINGS_BACKUP) return null;
  const slug=String(process.env.GITHUB_REPOSITORY || '');
  const [slugOwner, slugRepo] = slug.split('/');
  const config = {
    token: GITHUB_TOKEN,
    owner: String(process.env.GITHUB_OWNER || slugOwner || 'Abhi-coder722'),
    repo: String(process.env.GITHUB_REPO || slugRepo || 'Fun-repo-'),
    branch: String(process.env.GITHUB_BRANCH || 'bookings-backup'),
    filePath: String(process.env.GITHUB_BOOKINGS_PATH || 'data/bookings.json').replace(/^\/+/, ''),
    committerName: String(process.env.GITHUB_COMMITTER_NAME || 'Operation Amelie'),
    committerEmail: String(process.env.GITHUB_COMMITTER_EMAIL || 'operation-amelie@users.noreply.github.com')
  };
  if(config.token && config.owner && config.repo && config.filePath) return config;
  if(!backupWarningShown) {
    backupWarningShown = true;
    console.warn('GitHub bookings backup is enabled but missing GITHUB_TOKEN and repo settings.');
  }
  return null;
}
function encodeGitHubPath(filePath) { return filePath.split('/').map(encodeURIComponent).join('/'); }
async function githubJSON(url, config, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Accept':'application/vnd.github+json', 'Authorization':`Bearer ${config.token}`, 'X-GitHub-Api-Version':'2022-11-28', 'User-Agent':'operation-amelie', ...(options.headers || {}) } });
  const text = await response.text();
  let json = null;
  if(text) { try { json = JSON.parse(text); } catch { json = { message:text }; } }
  if(!response.ok) {
    const err = new Error(json && json.message ? json.message : `GitHub request failed with ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return json;
}
async function currentGitHubFile(config) {
  const pathPart = encodeGitHubPath(config.filePath);
  const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${pathPart}?ref=${encodeURIComponent(config.branch)}`;
  try { return await githubJSON(url, config); }
  catch(e) { if(e.status === 404) return null; throw e; }
}
async function pushBookingsToGitHub(content, reason) {
  const config = githubConfig();
  if(!config) return;
  const pathPart = encodeGitHubPath(config.filePath);
  const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${pathPart}`;
  for(let attempt=1; attempt<=2; attempt++) {
    const current = await currentGitHubFile(config);
    if(current && current.content) {
      const existing = Buffer.from(String(current.content).replace(/\n/g,''), 'base64').toString('utf8');
      if(existing === content) return;
    }
    try {
      await githubJSON(url, config, {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          message: `Save Amelie booking ${reason}`,
          content: Buffer.from(content, 'utf8').toString('base64'),
          branch: config.branch,
          sha: current ? current.sha : undefined,
          committer: { name: config.committerName, email: config.committerEmail }
        })
      });
      return;
    } catch(e) {
      if(e.status === 409 && attempt < 2) continue;
      throw e;
    }
  }
}
function enqueueBookingsBackup(bookings, reason) {
  const snapshot = JSON.stringify(bookings,null,2) + '\n';
  backupQueue = backupQueue.catch(()=>{}).then(()=>pushBookingsToGitHub(snapshot, reason)).catch(e=>console.error('GitHub bookings backup failed:', e.message));
}
async function atomicWrite(bookings, reason='update') { await fs.mkdir(DATA_DIR, {recursive:true}); const temp=BOOKING_FILE+'.'+crypto.randomBytes(6).toString('hex')+'.tmp'; await fs.writeFile(temp,JSON.stringify(bookings,null,2),{mode:0o600}); await fs.rename(temp, BOOKING_FILE); enqueueBookingsBackup(bookings, reason); }
async function api(req,res,url) {
  if(req.method === 'POST' && url.pathname === '/api/bookings') {
    const b = await bodyJSON(req);
    const date=String(b.date||''); const time=String(b.time||''); const note=String(b.note||'').trim(); const key=String(b.key||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || note.length>300 || !/^[a-zA-Z0-9_-]{8,100}$/.test(key)) return error(res,400,'Please select a valid date and time.');
    const dt = new Date(date+'T12:00:00Z');
    if(Number.isNaN(dt.valueOf()) || dt.toISOString().slice(0,10)!==date) return error(res,400,'Invalid calendar date.');
    const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    if(date < today || date > new Date(Date.now()+366*86400000).toISOString().slice(0,10)) return error(res,400,'Please choose a date within the next year.');
    const result=await (writeQueue = writeQueue.catch(()=>{}).then(async()=>{
      const bookings=await readBookings(); const prior=bookings.find(x=>x.key===key);
      if(prior) return prior;
      const entry={ id: crypto.randomUUID(), key, date, time, note, timezone:'Europe/Berlin', createdAt:new Date().toISOString(), status:'confirmed' };
      bookings.push(entry); await atomicWrite(bookings, 'submission'); return entry;
    }));
    return send(res,201,{ok:true,id:result.id,date:result.date,time:result.time});
  }
  if(req.method==='POST' && url.pathname==='/api/admin/login') {
    if(!ADMIN_PASSWORD) return error(res,503,'Admin password not configured on the server.');
    const ip = (req.socket.remoteAddress || 'unknown');
    const recent=(loginAttempts.get(ip)||[]).filter(t=>Date.now()-t<15*60000);
    if(recent.length>=8) return error(res,429,'Too many attempts. Try again later.');
    const b=await bodyJSON(req); if(!safeEqual(b.password || '',ADMIN_PASSWORD)) { recent.push(Date.now()); loginAttempts.set(ip,recent); return error(res,401,'Incorrect password.'); }
    loginAttempts.delete(ip); return send(res,200,{ok:true},{'Set-Cookie':cookie(makeToken(),req)});
  }
  if(req.method==='POST' && url.pathname==='/api/admin/logout') return send(res,200,{ok:true},{'Set-Cookie':'amelie_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});
  if(url.pathname.startsWith('/api/admin/')) {
    if(!authed(req)) return error(res,401,'Please log in.');
    if(req.method==='GET' && url.pathname==='/api/admin/bookings') { const b=await readBookings(); return send(res,200,{bookings:b.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}); }
    if(req.method==='PATCH' && /^\/api\/admin\/bookings\/[a-f0-9-]{36}$/.test(url.pathname)) {
      const id=url.pathname.split('/').pop(); const input=await bodyJSON(req);
      if(!['confirmed','completed','cancelled'].includes(input.status)) return error(res,400,'Invalid status.');
      const found=await (writeQueue=writeQueue.catch(()=>{}).then(async()=>{
        const all=await readBookings(); const entry=all.find(x=>x.id===id);
        if(entry) { entry.status=input.status; await atomicWrite(all, 'status update'); }
        return !!entry;
      }));
      return found?send(res,200,{ok:true}):error(res,404,'Booking not found.');
    }
  }
  return error(res,404,'Not found.');
}
async function serve(req,res,url) {
  if(req.method!=='GET' && req.method!=='HEAD') return error(res,405,'Method not allowed.');
  const pathname = decodeURIComponent(url.pathname);
  const mapped = pathname==='/' ? '/index.html' : pathname==='/admin' ? '/admin.html' : pathname;
  if(mapped.includes('\0') || mapped.includes('\\')) return error(res,400,'Invalid path.');
  const file=path.resolve(PUBLIC, '.'+mapped);
  if(file!==PUBLIC && !file.startsWith(PUBLIC+path.sep)) return error(res,403,'Forbidden.');
  try {
    const stat=await fs.stat(file); if(!stat.isFile()) return error(res,404,'Not found.');
    const content=await fs.readFile(file);
    res.writeHead(200, {'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Content-Length':content.length,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"});
    res.end(req.method==='HEAD'?undefined:content);
  } catch(e) { if(e.code==='ENOENT'||e.code==='EISDIR') return error(res,404,'Not found.'); throw e; }
}
async function handler(req,res) {
  try { const url=new URL(req.url,'http://localhost'); if(url.pathname.startsWith('/api/')) return await api(req,res,url); await serve(req,res,url); }
  catch(e) { console.error(e); if(!res.headersSent) error(res,e.message==='Request too large.'?413:400, e.message==='Request too large.'?'Request too large.':'Something went wrong.'); else res.end(); }
}
if(require.main===module) {
  if(!ADMIN_PASSWORD) console.warn('Admin dashboard login is DISABLED until ADMIN_PASSWORD is set. See README.md');
  http.createServer(handler).listen(PORT,()=>console.log(`Operation Amelie running at http://localhost:${PORT}`));
}
module.exports={handler};
