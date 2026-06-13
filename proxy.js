/**
 * Local proxy server for LW Theatres API
 * Run with: node proxy.js
 * Then open phantom-finder.html via http://localhost:3001
 */

const http = require('http');
const https = require('https');

const PORT = 3001;

const server = http.createServer((req, res) => {
  // Allow all origins (we're local only)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only proxy /api/* requests
  if (!req.url.startsWith('/api/')) {
    // Serve the HTML file for everything else
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, req.url === '/' ? 'phantom-finder.html' : req.url.slice(1));
    try {
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      const ct = ext === '.html' ? 'text/html' : 'text/plain';
      res.writeHead(200, { 'Content-Type': ct });
      res.end(content);
    } catch (e) {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  // Proxy to LW Theatres
  const targetUrl = 'https://ticketing.lwtheatres.co.uk' + req.url;
  console.log('Proxying:', targetUrl);

  const options = {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Referer': 'https://ticketing.lwtheatres.co.uk/',
      'Origin': 'https://ticketing.lwtheatres.co.uk',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  };

  const proxyReq = https.request(targetUrl, options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': proxyRes.headers['content-type'] || 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  });

  proxyReq.end();
});

server.listen(PORT, () => {
  console.log(`\nProxy running at http://localhost:${PORT}`);
  console.log(`Open: http://localhost:${PORT}/phantom-finder.html\n`);
});
