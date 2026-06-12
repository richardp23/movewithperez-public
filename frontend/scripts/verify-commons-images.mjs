const API = 'https://commons.wikimedia.org/w/api.php';

const EXPLICIT = [
  ['Richmond Hill', 'File:House in Richmond Hill Queens.JPG'],
  ['Ozone Park',    'File:House in Ozone Park 02.JPG'],
  ['Howard Beach',  'File:Cross Bay Boulevard (Howard Beach).jpg'],
  ['Howard Beach',  'File:Old Howard Beach, Queens, NY, USA - panoramio.jpg'],
  ['Glendale',      'File:RIDGEWOOD-GLENDALE-FRESH POND 055.JPG'],
];

const SEARCHES = [
  ['Richmond Hill', 'Richmond Hill Queens houses'],
  ['Richmond Hill', 'Richmond Hill Queens street'],
  ['Woodhaven',     'Woodhaven Queens houses'],
  ['Woodhaven',     'Woodhaven Queens street'],
  ['Glendale',      'Glendale Queens houses'],
  ['Howard Beach',  'Howard Beach Queens houses'],
  ['Howard Beach',  'Howard Beach Queens canal'],
  ['Ozone Park',    'Ozone Park Queens houses'],
  ['Ozone Park',    'Ozone Park Queens street'],
];

const MIN_LONG_EDGE = 1600;
const stripHtml = (s = '') => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  // Wikimedia requires a descriptive User-Agent or it returns 403
  const res = await fetch(url, { headers: { 'User-Agent': 'rp-realestate-image-check/1.0 (richard.perez@exitrealtycentral.com)' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function searchFiles(query) {
  const data = await api({ action: 'query', list: 'search', srsearch: query, srnamespace: '6', srlimit: '15' });
  return (data.query?.search || []).map((r) => r.title);
}

async function imageInfo(titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += 50) {
    const data = await api({
      action: 'query',
      titles: titles.slice(i, i + 50).join('|'),
      prop: 'imageinfo',
      iiprop: 'extmetadata|url|size|mime',
      iiextmetadatafilter: 'LicenseShortName|License|Artist|LicenseUrl|AttributionRequired|Attribution|ImageDescription',
    });
    for (const p of Object.values(data.query?.pages || {})) if (p.imageinfo) out[p.title] = p.imageinfo[0];
  }
  return out;
}

function licenseOk(shortName = '', code = '') {
  const s = `${shortName} ${code}`.toLowerCase();
  if (/nc|nd|noncommercial|no-?deriv/.test(s)) return false;            // reject NC / ND
  return /cc[ -]?by|cc0|public domain|pdm/.test(s);                      // accept CC BY*, CC0, PD
}

const collected = new Map();
for (const [nb, title] of EXPLICIT) collected.set(title, nb);
for (const [nb, q] of SEARCHES) {
  try { for (const t of await searchFiles(q)) if (!collected.has(t)) collected.set(t, nb); }
  catch (e) { console.error('search failed:', q, e.message); }
}

const info = await imageInfo([...collected.keys()]);
const rows = [];
for (const [title, nb] of collected) {
  const ii = info[title];
  if (!ii) continue;
  const em = ii.extmetadata || {};
  const license = em.LicenseShortName?.value || '';
  const author = stripHtml(em.Artist?.value || '');
  const longEdge = Math.max(ii.width || 0, ii.height || 0);
  const isImage = (ii.mime || '').startsWith('image/') && !/svg/.test(ii.mime || '');
  const attribution = stripHtml(em.Attribution?.value || '') || (author ? `${author} — ${license}, via Wikimedia Commons` : '');
  const pass = isImage && licenseOk(license, em.License?.value || '') && longEdge >= MIN_LONG_EDGE && !!author;
  rows.push({ neighborhood: nb, title, pass, license, author, px: `${ii.width}x${ii.height}`,
    licenseUrl: em.LicenseUrl?.value || '', filePage: ii.descriptionurl, fileUrl: ii.url,
    attribution, description: stripHtml(em.ImageDescription?.value || '').slice(0, 160) });
}

rows.sort((a, b) => a.neighborhood.localeCompare(b.neighborhood) || Number(b.pass) - Number(a.pass));
for (const r of rows) {
  console.log(`\n[${r.pass ? 'PASS' : 'review'}] ${r.neighborhood} — ${r.title}`);
  console.log(`  license: ${r.license} | author: ${r.author || '(none listed)'} | ${r.px}`);
  console.log(`  page:    ${r.filePage}`);
  console.log(`  attrib:  ${r.attribution}`);
  if (r.description) console.log(`  desc:    ${r.description}`);
}
const { writeFile } = await import('node:fs/promises');
await writeFile('docs/commons-candidates.json', JSON.stringify(rows, null, 2));
console.log(`\nWrote docs/commons-candidates.json — ${rows.length} files, ${rows.filter((r) => r.pass).length} pass`);
