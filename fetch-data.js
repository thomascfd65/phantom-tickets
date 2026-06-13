/**
 * fetch-data.js
 * Navigates to a known performance page, then fetches all performances
 * from within the page context (bypasses CORS/referrer blocking).
 * 
 * Run: node fetch-data.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function fetchData() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('Loading performance page...');
  await page.goto('https://ticketing.lwtheatres.co.uk/event/121/performance/1049003', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  console.log('Fetching performances from page context...');
  const data = await page.evaluate(async () => {
    const res = await fetch('/api/event/121/performance/?event_id=121&page=1&per_page=500', {
      headers: { 'Accept': 'application/json' }
    });
    return await res.json();
  });

  await browser.close();

  if (!data?.data?.length) {
    console.error('No data returned');
    process.exit(1);
  }

  fs.writeFileSync('performances.json', JSON.stringify(data, null, 2));
  console.log(`Saved ${data.data.length} performances to performances.json`);
}

fetchData().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
