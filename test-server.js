const http = require('http');

const server = http.createServer((req, res) => {
  const response = {
    message: '🎉 SUCCESS! Brand Guard hosting is working!',
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    headers: req.headers
  };

  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(response, null, 2));
});

const PORT = 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`✅ Test server running at http://${HOST}:${PORT}`);
  console.log(`🌐 Try: http://localhost:${PORT}`);
  console.log(`📡 WSL IP: 172.20.99.220:${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
});