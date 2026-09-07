/* =========================================================================
   SERVIDOR - Sistema de Signos
   -------------------------------------------------------------------------
   Hace 2 cosas:
   1) Sirve display.html y control.html por http, para que la compu y la
      tablet los abran desde el navegador (sin instalar nada en la tablet).
   2) Levanta un WebSocket y reenvía ("broadcast") cualquier mensaje que
      llega de un cliente a todos los demás clientes conectados. Así, lo
      que toca la tablet (control.html) le llega a la compu (display.html).

   CÓMO USARLO:
   1) Instalar dependencia una sola vez:  npm install ws
   2) Correr el servidor:                 node server.js
   3) En la COMPU: abrir en el navegador  http://localhost:8080
   4) En la TABLET (misma red wifi): abrir  http://IP-DE-LA-COMPU:8080/control.html
      (la IP de la compu se ve en la consola al arrancar el servidor)
   ========================================================================= */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');

const PORT = 8080;

const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css' };

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/display.html' : req.url;
  filePath = path.join(__dirname, decodeURIComponent(filePath.split('?')[0]));
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('No encontrado: ' + filePath); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    // "data" llega como Buffer binario. Lo convertimos a texto (data.toString())
    // antes de reenviarlo: si no, el navegador que lo recibe lo interpreta como
    // un Blob binario en vez de JSON y JSON.parse() falla del otro lado.
    const text = data.toString();
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) client.send(text);
    });
  });
});

function getLocalIP(){
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)){
    for (const net of nets[name]){
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

server.listen(PORT, () => {
  const ip = getLocalIP();
  console.log('=================================================');
  console.log(' Servidor listo');
  console.log(` En esta compu (pantalla de proyección):  http://localhost:${PORT}`);
  console.log(` En la tablet (misma wifi):                 http://${ip}:${PORT}/control.html`);
  console.log('=================================================');
});