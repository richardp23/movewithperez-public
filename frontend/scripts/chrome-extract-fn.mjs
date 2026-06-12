// Shared extraction function body for Chrome DevTools evaluate_script
export const EXTRACT_FN = `async () => {
  const strip = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let plainAttr = [...document.querySelectorAll('input[readonly], textarea[readonly]')]
    .map((el) => el.value)
    .find((v) => v && v.includes('via Wikimedia Commons') && !v.includes('<a '));

  if (!plainAttr) {
    const btn = [...document.querySelectorAll('a, button')].find((el) =>
      (el.getAttribute('title') || '').includes('Use this file on the web') ||
      strip(el.textContent) === 'Use this file on the web'
    );
    if (btn) {
      btn.click();
      await sleep(900);
    }
    plainAttr = [...document.querySelectorAll('input[readonly], textarea[readonly]')]
      .map((el) => el.value)
      .find((v) => v && v.includes('via Wikimedia Commons') && !v.includes('<a '));
  }

  let author = '';
  for (const tr of document.querySelectorAll('table tr')) {
    const cells = [...tr.querySelectorAll('th, td')];
    if (cells.length >= 2 && strip(cells[0].textContent) === 'Author') {
      author = strip(cells[1].textContent);
      break;
    }
  }

  let license = '';
  const licH2 = [...document.querySelectorAll('h2')].find((h) => strip(h.textContent) === 'Licensing');
  if (licH2) {
    let node = licH2.nextElementSibling;
    const parts = [];
    while (node && node.tagName !== 'H2') {
      parts.push(node.textContent || '');
      node = node.nextElementSibling;
    }
    const m = parts.join(' ').match(/CC BY-SA [\\d.]+|CC BY [\\d.]+|CC0|Public domain/i);
    if (m) license = m[0];
  }
  if (!license) {
    const link = document.querySelector('a[href*="creativecommons.org/licenses"]');
    if (link) {
      const href = link.href;
      const m = href.match(/by-sa\\/([\\d.]+)/) || href.match(/by\\/([\\d.]+)/);
      if (m) license = href.includes('by-sa') ? \`CC BY-SA \${m[1]}\` : \`CC BY \${m[1]}\`;
    }
  }

  let dimensions = '';
  const dimTd = [...document.querySelectorAll('td')].find((td) =>
    /^\\s*\\d{1,3}(,\\d{3})?\\s*×\\s*\\d{1,3}(,\\d{3})?/.test(td.textContent)
  );
  if (dimTd) dimensions = strip(dimTd.textContent).replace(/\\s*\\([^)]*\\)/, '');

  const img = document.querySelector('.fullMedia img, .mw-file-description img, #file img');
  const longEdge = dimensions
    ? Math.max(...dimensions.replace(/,/g, '').split('×').map((n) => parseInt(n.trim(), 10)))
    : 0;

  return {
    author,
    license,
    dimensions,
    longEdge,
    plainAttribution: plainAttr || null,
    imgSrc: img?.src || '',
    pageUrl: location.href,
  };
}`;
