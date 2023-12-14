import fs from 'node:fs'
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export const PORT = 19999;


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const config = defineConfig({
  root: path.join(__dirname, 'client'),
  resolve: {
    alias: {
      "browser": path.resolve(__dirname, "xterm.mjs/src/browser"),
      "common": path.resolve(__dirname, "xterm.mjs/src/common"),
    },
  },
  server: {
  },
  // https://vitejs.dev/config/
  plugins: [
    react(),
  ],
});

// if (fs.existsSync('localhost-key.pem') && fs.existsSync('localhost.pem')) {
//   config.server = {
//     https: {
//       key: fs.readFileSync('./localhost-key.pem'),
//       cert: fs.readFileSync('./localhost.pem'),
//     }
//   };
// }

export default config;
