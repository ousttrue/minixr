import { Terminal } from '../../xterm.mjs/src/browser/public/Terminal.mjs';
import { WebglExternalAddon } from '../../xterm.mjs/addons/xterm-addon-webgl/src/WebglExternalAddon.mjs';

export class XRTTty {
  terminalElement: HTMLElement;
  term: Terminal;
  addon: WebglExternalAddon;

  constructor(gl: WebGL2RenderingContext,
    el: HTMLElement, rows: number = 80, cols: number = 24) {
    console.log('new tty');
    this.terminalElement = document.createElement('div');
    this.terminalElement.setAttribute('style',
      `width: 1024px; height: 1024px; opacity: 0.0; overflow: hidden;`);
    el.appendChild(this.terminalElement);

    this.term = new Terminal({
      allowTransparency: false,
      cursorBlink: true,
      disableStdin: false,
      rows,
      cols,
      fontSize: 24
    });
    // TODO:
    // make textarea backend
    // but work diffirent in webxr ?(keydown... etc)
    this.term.open(this.terminalElement);

    // @ts-ignore
    this.addon = new WebglExternalAddon(gl);
    this.term.loadAddon(this.addon);

    const message = 'Initialized\r\n';
    this.term.write(message);
  }

  tick() {
    if (document.activeElement != document.body) {
      if (document.activeElement instanceof HTMLElement) {
        console.log('fix activeElement');
        document.activeElement.blur();
      }
    }
  }
}
