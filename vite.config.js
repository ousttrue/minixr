import fs from 'fs'
import path from "path";

export default {
  server: {
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    }
  },
  // config options
  // root: './',
  // base: '/',
  resolve: {
    alias: {
      "browser": path.resolve(__dirname, "xterm.mjs/src/browser"),
      "common": path.resolve(__dirname, "xterm.mjs/src/common"),
    },
  },
}
