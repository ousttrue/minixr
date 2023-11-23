import fs from 'fs'
import path from "path";

/** @type any */
const config = {
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

if (fs.existsSync('localhost-key.pem') && fs.existsSync('localhost.pem')) {
  config.server = {
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    }
  };
}

export default config
