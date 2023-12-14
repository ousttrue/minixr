import * as vite from 'vite'
import express from 'express';
import type { Express, Request, Response } from 'express';
import https from 'https';
import { networkInterfaces } from "os";


function printListen(port: number) {
  const map = networkInterfaces();
  for (const key in map) {
    const interfaces = map[key];
    if (interfaces) {
      for (const iface of interfaces) {
        if (iface.family == 'IPv4') {
          console.log(`https://${iface.address}:${port}`);
        }
      }
    }
  }
}


// import { PORT } from './vite.config.js';
const PORT = 3000;

import fs from 'node:fs'
import { fileURLToPath } from "node:url";
import path from "node:path";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app: Express = express();
app.get('/api/hello', (req: Request, res: Response) => res.send('Hello World!'));


const staticPath = path.join(__dirname, 'client')

// express.static alternative
vite.createServer({
  root: staticPath,
  logLevel: 'info',
  server: {
    middlewareMode: true,
    watch: {
      usePolling: true,
      interval: 100,
    },
    hmr: {
      protocol: "ws",
    }
  },
}).then(viteServer => {
  app.use(viteServer.middlewares)
});

var options = {
  key: fs.readFileSync('localhost-key.pem'),
  cert: fs.readFileSync('localhost.pem')
};
var server = https.createServer(options, app);
server.listen(PORT, () => {

  printListen(PORT);

})


