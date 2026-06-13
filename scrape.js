/**
 * phantom-scraper
 * 
 * Scrapes available seats + prices from LW Theatres for Phantom of the Opera.
 * Outputs raw seat data to console so you can inspect the structure.
 * 
 * Setup:
 *   npm install puppeteer
 *   node scrape.js
 */

const puppeteer = require('puppeteer');

// ---- CONFIG ----
const SHOW_URL = 'https://lwtheatres.co.uk/whats-on/the-phantom-of-the-opera/';
const HEADLESS = false; // Set true once you know it works — false lets you watch it run
const SLOW_MO = 50;    // ms between actions, helps avoid bot detection
// ----------------

async function scrape() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    slowMo: SLOW_MO,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 900 }
  });

  const page = await browser.newPage();

  // Mimic a real browser
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  console.log('Navigating to show page...');
  await page.goto(SHOW_URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // ---- STEP 1: Snapshot the page structure ----
  // Before trying to click anything, let's see what's there
  console.log('\n=== PAGE TITLE ===');
  console.log(await page.title());

  console.log('\n=== LOOKING FOR BOOK NOW BUTTONS ===');
  const buttons = await page.$$eval('a, button', els =>
    els
      .filter(el => /book|tickets|buy/i.test(el.textContent))
      .map(el => ({
        tag: el.tagName,
        text: el.textContent.trim().substring(0, 60),
        href: el.href || null,
        class: el.className.substring(0, 80)
      }))
  );
  console.log(JSON.stringify(buttons, null, 2));

  console.log('\n=== LOOKING FOR IFRAMES ===');
  const frames = page.frames();
  for (const frame of frames) {
    console.log('Frame URL:', frame.url());
  }

  // ---- STEP 2: Try clicking through to date/seat selection ----
  // Find and click the first "Book" link
  try {
    const bookLink = await page.$('a[href*="book"], a[href*="ticket"], .book-now, .cta-book');
    if (bookLink) {
      console.log('\nFound a book link, clicking...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
        bookLink.click()
      ]);
      console.log('New URL:', page.url());
    } else {
      console.log('\nNo book link found — check the page HTML below');
    }
  } catch (e) {
    console.log('Click failed:', e.message);
  }

  // ---- STEP 3: Snapshot whatever page we landed on ----
  console.log('\n=== CURRENT URL ===');
  console.log(page.url());

  console.log('\n=== ALL LINKS ON PAGE ===');
  const links = await page.$$eval('a', els =>
    els.map(el => ({ text: el.textContent.trim().substring(0, 50), href: el.href }))
       .filter(l => l.href && !l.href.startsWith('javascript'))
       .slice(0, 30)
  );
  console.log(JSON.stringify(links, null, 2));

  // ---- STEP 4: Look for date listings ----
  console.log('\n=== DATE-LIKE ELEMENTS ===');
  const dates = await page.$$eval('*', els =>
    els
      .filter(el => /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(el.textContent) && el.children.length < 5)
      .map(el => el.textContent.trim().substring(0, 80))
      .filter(t => t.length > 3 && t.length < 80)
      .slice(0, 20)
  );
  console.log(JSON.stringify(dates, null, 2));

  console.log('\n=== DONE — browser staying open for manual inspection ===');
  console.log('Press Ctrl+C to exit when done looking around');

  // Keep browser open so you can poke around manually
  await new Promise(() => {}); // hang forever until Ctrl+C
}

scrape().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
