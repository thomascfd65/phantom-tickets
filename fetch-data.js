/**
 * fetch-data.js
 * Fetches performance data directly using Node's built-in fetch,
 * spoofing headers to look like a browser request from their own site.
 */

const fs = require('fs');

const PERFORMANCE_URL = 'https://ticketing.lwtheatres.co.uk/event/121/performance/1049003';
const API_URL = 'https://ticketing.lwtheatres.co.uk/api/event/121/performance/?event_id=121&page=1&per_page=500';

async function fetchData() {
  console.log('Fetching performance page to get cookies...');

  // Step 1: Hit the performance page to get session cookies
  const pageRes = await fetch(PERFORMANCE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.9',
    }
  });

  // Grab cookies from the response
  const cookies = pageRes.headers.getSetCookie?.() || [];
  const cookieStr = cookies.map(c => c.split(';')[0]).join('; ');
  console.log('Got cookies:', cookieStr ? 'yes' : 'none');

  // Step 2: Call the API with those cookies and a Referer header
  console.log('Calling API...');
  const apiRes = await fetch(API_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': PERFORMANCE_URL,
      'Origin': 'https://ticketing.lwtheatres.co.uk',
      'Cookie': cookieStr,
    }
  });

  const text = await apiRes.text();
  console.log('Response status:', apiRes.status);
  console.log('Response preview:', text.substring(0, 100));

  let data;
  try {
    data = JSON.parse(text);
  } catch(e) {
    console.error('Not valid JSON. Got:', text.substring(0, 200));
    process.exit(1);
  }

  if (!data?.data?.length) {
    console.error('No performance data in response');
    process.exit(1);
  }

  data.fetchedAt = new Date().toISOString();
  fs.writeFileSync('performances.json', JSON.stringify(data, null, 2));
  console.log(`Saved ${data.data.length} performances to performances.json`);
}

fetchData().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
