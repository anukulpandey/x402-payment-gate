// One-off dev tool: capture product screenshots into docs/images/ via headless
// Chrome. The committed PNGs are the artifact — regenerate only when the UI
// changes. Requires the server running on :4021 and:  npm i -D puppeteer-core
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import puppeteer from 'puppeteer-core';

const B = 'http://localhost:4021';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// 1. Spin up a clean demo seller with examples + a few settled calls.
const seller = privateKeyToAccount(generatePrivateKey());
const { message } = await (
  await fetch(`${B}/api/auth/nonce`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: seller.address }) })
).json();
const verify = await fetch(`${B}/api/auth/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, signature: await seller.signMessage({ message }) }) });
const jwt = verify.headers.get('set-cookie').split(';')[0].split('=')[1];
const cookie = `gk_session=${jwt}`;
const auth = { cookie, 'content-type': 'application/json' };
await fetch(`${B}/api/examples`, { method: 'POST', headers: auth, body: '{}' });
const eps = await (await fetch(`${B}/api/endpoints`, { headers: { cookie } })).json();
for (const n of ['BTC Price Oracle', 'GitHub Zen', 'Random Joke']) {
  const e = eps.find((x) => x.name === n);
  await fetch(`${B}/api/endpoints/${e.id}/simulate`, { method: 'POST', headers: auth, body: '{}' });
}
console.log('demo seller ready:', seller.address);

// 2. Capture.
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 2 });
await page.setCookie({ name: 'gk_session', value: jwt, url: B });

async function shot(file, url, opts = {}) {
  await page.goto(`${B}${url}`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => (document.documentElement.style.scrollBehavior = 'auto'));
  if (opts.scrollTo) await page.evaluate((id) => document.getElementById(id)?.scrollIntoView(), opts.scrollTo);
  await new Promise((r) => setTimeout(r, opts.wait ?? 900));
  if (opts.click) {
    await page.evaluate((t) => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(t));
      if (b) b.click();
    }, opts.click);
    await new Promise((r) => setTimeout(r, opts.clickWait ?? 4000));
  }
  await page.screenshot({ path: `docs/images/${file}`, fullPage: opts.fullPage ?? false });
  console.log('saved docs/images/' + file);
}

await shot('landing.png', '/');
await shot('how-it-works.png', '/how-it-works');
await shot('docs.png', '/docs');
await shot('pricing.png', '/', { scrollTo: 'pricing' });
await shot('dashboard.png', '/app');
await shot('playground.png', '/app', { click: 'Run agent', clickWait: 6000 });

await browser.close();
console.log('done');
