const http = require('http');
const httpProxy = require('http-proxy');

// Create a proxy server with custom application logic
const proxy = httpProxy.createProxyServer({});

// Handle proxy errors so it doesn't crash the server
proxy.on('error', function (err, req, res) {
    if (res && res.writeHead) {
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });
        res.end('Proxy Error: ' + err.message);
    }
});

const server = http.createServer(function (req, res) {
    // Regular HTTP requests
    if (req.url.startsWith('/socket')) {
        proxy.web(req, res, { target: 'http://127.0.0.1:3001' });
    } else {
        proxy.web(req, res, { target: 'http://127.0.0.1:3000' });
    }
});

// Listen to the `upgrade` event and proxy the WebSocket requests
server.on('upgrade', function (req, socket, head) {
    if (req.url.startsWith('/socket')) {
        proxy.ws(req, socket, head, { target: 'ws://127.0.0.1:3001' });
    } else {
        proxy.ws(req, socket, head, { target: 'ws://127.0.0.1:3000' });
    }
});

console.log("NGROK PROXY SERVER RUNNING ON PORT 8080");
console.log("Routing WSS/HTTP -> /socket to 3001");
console.log("Routing WSS/HTTP -> / to 3000");
server.listen(8080);
