// Copyright 2016 Google Inc.
//
//     Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//     You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
//     Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
//     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//     See the License for the specific language governing permissions and
// limitations under the License.

// This is a stripped down and specialized version of WebVR-UI
// (https://github.com/googlevr/webvr-ui) that takes out most of the state
// management in favor of providing a simple way of requesting entry into WebXR
// for the needs of the sample pages. Functionality like beginning sessions
// is intentionally left out so that the sample pages can demonstrate them more
// clearly.

//
// State consts
//

// Not yet presenting, but ready to present
const READY_TO_PRESENT = 'ready';

// In presentation mode
const PRESENTING = 'presenting';
const PRESENTING_FULLSCREEN = 'presenting-fullscreen';

// Checking device availability
const PREPARING = 'preparing';

// Errors
const ERROR_NO_PRESENTABLE_DISPLAYS = 'error-no-presentable-displays';
const ERROR_BROWSER_NOT_SUPPORTED = 'error-browser-not-supported';
const ERROR_REQUEST_TO_PRESENT_REJECTED = 'error-request-to-present-rejected';
const ERROR_EXIT_PRESENT_REJECTED = 'error-exit-present-rejected';
const ERROR_REQUEST_STATE_CHANGE_REJECTED = 'error-request-state-change-rejected';
const ERROR_UNKOWN = 'error-unkown';

//
// DOM element
//

const _LOGO_SCALE = 0.8;
let _WEBXR_UI_CSS_INJECTED: { [key: string]: boolean } = {};

type WebXRButtonOptions = {
  /** provide your own domElement to bind to */
  domElement: HTMLElement;

  requiredFeatures: string[];
  optionalFeatures: string[];

  /** set to false if you want to write your own styles */
  injectCSS?: Boolean;
  /** set the text for Enter XR */
  textEnterXRTitle?: string;
  /** set the text for when a XR display is not found */
  textXRNotFoundTitle?: string;
  /** set the text for exiting XR */
  textExitXRTitle?: string;
  /** text and icon color */
  color?: string;
  /** set to false for no brackground or a color */
  background?: string | boolean;
  /** set to 'round', 'square' or pixel value representing the corner radius */
  corners?: string;
  /** set opacity of button dom when disabled */
  disabledOpacity?: number;
  height?: number;
  /** set to change the css prefix from default 'webvr-ui' */
  cssprefix?: string;
}


type RequiredNotNull<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};


function validateOption(_options: WebXRButtonOptions)
  : RequiredNotNull<WebXRButtonOptions> {
  return {
    domElement: _options.domElement,
    requiredFeatures: _options.requiredFeatures,
    optionalFeatures: _options.optionalFeatures,

    color: _options.color || 'rgb(80,168,252)',
    background: _options.background || false,
    disabledOpacity: _options.disabledOpacity || 0.5,
    height: _options.height || 55,
    corners: _options.corners || 'square',
    cssprefix: _options.cssprefix || 'webvr-ui',

    // This reads VR as none of the samples are designed for other formats as of yet.
    textEnterXRTitle: _options.textEnterXRTitle || 'ENTER VR',
    textXRNotFoundTitle: _options.textXRNotFoundTitle || 'VR NOT FOUND',
    textExitXRTitle: _options.textExitXRTitle || 'EXIT VR',
    injectCSS: _options.injectCSS !== false,
  }
}

/**
 * Generate the innerHTML for the button
 *
 * @return {string} html of the button as string
 * @param {string} cssPrefix
 * @param {Number} height
 * @private
 */
const generateInnerHTML = (cssPrefix: string, height: number): string => {
  const logoHeight = height * _LOGO_SCALE;
  const svgString = generateXRIconString(cssPrefix, logoHeight) + generateNoXRIconString(cssPrefix, logoHeight);

  return `<button class="${cssPrefix}-button">
          <div class="${cssPrefix}-title"></div>
          <div class="${cssPrefix}-logo" >${svgString}</div>
        </button>`;
};

const createFeatureHtml = (name: string, features: string[]): HTMLElement => {
  const div = document.createElement('div')!;
  div.innerHTML = `<div>
<h2>${name}</h2>
${features.map(x => '<span class="feature">' + x + '</span>').join('')}
</div>`;
  return div;
}


/**
 * Inject the CSS string to the head of the document
 *
 * @param {string} cssText the css to inject
 */
const injectCSS = (cssText: string) => {
  // Create the css
  const style = document.createElement('style');
  style.innerHTML = cssText;

  let head = document.getElementsByTagName('head')[0];
  head.insertBefore(style, head.firstChild);
};

/**
 * Generate DOM element view for button
 *
 * @return {HTMLElement}
 * @param {Object} options
 */
const createDefaultView = (options: RequiredNotNull<WebXRButtonOptions>): HTMLElement => {
  const fontSize = options.height / 3;
  if (options.injectCSS) {
    // Check that css isnt already injected
    if (!_WEBXR_UI_CSS_INJECTED[options.cssprefix]) {
      injectCSS(generateCSS(options, fontSize));
      _WEBXR_UI_CSS_INJECTED[options.cssprefix] = true;
    }
  }

  const el = document.createElement('div');
  el.innerHTML = generateInnerHTML(options.cssprefix, fontSize);
  return el.firstChild as HTMLElement;
};


const createXRIcon = (cssPrefix: string, height: number) => {
  const el = document.createElement('div');
  el.innerHTML = generateXRIconString(cssPrefix, height);
  return el.firstChild;
};

const createNoXRIcon = (cssPrefix: string, height: number) => {
  const el = document.createElement('div');
  el.innerHTML = generateNoXRIconString(cssPrefix, height);
  return el.firstChild;
};

const generateXRIconString = (cssPrefix: string, height: number) => {
  let aspect = 28 / 18;
  return `<svg class="${cssPrefix}-svg" version="1.1" x="0px" y="0px"
        width="${aspect * height}px" height="${height}px" viewBox="0 0 28 18" xml:space="preserve">
        <path d="M26.8,1.1C26.1,0.4,25.1,0,24.2,0H3.4c-1,0-1.7,0.4-2.4,1.1C0.3,1.7,0,2.7,0,3.6v10.7
        c0,1,0.3,1.9,0.9,2.6C1.6,17.6,2.4,18,3.4,18h5c0.7,0,1.3-0.2,1.8-0.5c0.6-0.3,1-0.8,1.3-1.4l
        1.5-2.6C13.2,13.1,13,13,14,13v0h-0.2 h0c0.3,0,0.7,0.1,0.8,0.5l1.4,2.6c0.3,0.6,0.8,1.1,1.3,
        1.4c0.6,0.3,1.2,0.5,1.8,0.5h5c1,0,2-0.4,2.7-1.1c0.7-0.7,1.2-1.6,1.2-2.6 V3.6C28,2.7,27.5,
        1.7,26.8,1.1z M7.4,11.8c-1.6,0-2.8-1.3-2.8-2.8c0-1.6,1.3-2.8,2.8-2.8c1.6,0,2.8,1.3,2.8,2.8
        C10.2,10.5,8.9,11.8,7.4,11.8z M20.1,11.8c-1.6,0-2.8-1.3-2.8-2.8c0-1.6,1.3-2.8,2.8-2.8C21.7
        ,6.2,23,7.4,23,9 C23,10.5,21.7,11.8,20.1,11.8z"/>
    </svg>`;
};

const generateNoXRIconString = (cssPrefix: string, height: number) => {
  let aspect = 28 / 18;
  return `<svg class="${cssPrefix}-svg-error" x="0px" y="0px"
        width="${aspect * height}px" height="${aspect * height}px" viewBox="0 0 28 28" xml:space="preserve">
        <path d="M17.6,13.4c0-0.2-0.1-0.4-0.1-0.6c0-1.6,1.3-2.8,2.8-2.8s2.8,1.3,2.8,2.8s-1.3,2.8-2.8,2.8
        c-0.2,0-0.4,0-0.6-0.1l5.9,5.9c0.5-0.2,0.9-0.4,1.3-0.8
        c0.7-0.7,1.1-1.6,1.1-2.5V7.4c0-1-0.4-1.9-1.1-2.5c-0.7-0.7-1.6-1-2.5-1
        H8.1 L17.6,13.4z"/>
        <path d="M10.1,14.2c-0.5,0.9-1.4,1.4-2.4,1.4c-1.6,0-2.8-1.3-2.8-2.8c0-1.1,0.6-2,1.4-2.5
        L0.9,5.1 C0.3,5.7,0,6.6,0,7.5v10.7c0,1,0.4,1.8,1.1,2.5c0.7,0.7,1.6,1,2.5,1
        h5c0.7,0,1.3-0.1,1.8-0.5c0.6-0.3,1-0.8,1.3-1.4l1.3-2.6 L10.1,14.2z"/>
        <path d="M25.5,27.5l-25-25C-0.1,2-0.1,1,0.5,0.4l0,0C1-0.1,2-0.1,2.6,0.4l25,25c0.6,0.6,0.6,1.5
        ,0,2.1l0,0 C27,28.1,26,28.1,25.5,27.5z"/>
    </svg>`;
};

/**
 * Generate the CSS string to inject
 */
const generateCSS = (
  options: RequiredNotNull<WebXRButtonOptions>, fontSize = 18): string => {
  const height = options.height;
  const borderWidth = 2;
  const borderColor = options.background ? options.background : options.color;
  const cssPrefix = options.cssprefix;

  let borderRadius;
  if (options.corners == 'round') {
    borderRadius = options.height / 2;
  } else if (options.corners == 'square') {
    borderRadius = 2;
  } else {
    borderRadius = options.corners;
  }

  return (`
    @font-face {
        font-family: 'Karla';
        font-style: normal;
        font-weight: 400;
        src: local('Karla'), local('Karla-Regular'),
             url(https://fonts.gstatic.com/s/karla/v5/31P4mP32i98D9CEnGyeX9Q.woff2) format('woff2');
        unicode-range: U+0100-024F, U+1E00-1EFF, U+20A0-20AB, U+20AD-20CF, U+2C60-2C7F, U+A720-A7FF;
    }
    @font-face {
        font-family: 'Karla';
        font-style: normal;
        font-weight: 400;
        src: local('Karla'), local('Karla-Regular'),
             url(https://fonts.gstatic.com/s/karla/v5/Zi_e6rBgGqv33BWF8WTq8g.woff2) format('woff2');
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074,
                       U+20AC, U+2212, U+2215, U+E0FF, U+EFFD, U+F000;
    }

    button.${cssPrefix}-button {
        font-family: 'Karla', sans-serif;

        border: ${borderColor} ${borderWidth}px solid;
        border-radius: ${borderRadius}px;
        box-sizing: border-box;
        background: ${options.background ? options.background : 'none'};

        height: ${height}px;
        min-width: ${fontSize * 9.6}px;
        display: inline-block;
        position: relative;

        cursor: pointer;
        transition: border 0.5s;
    }

    button.${cssPrefix}-button:focus {
      outline: none;
    }

    /*
    * Logo
    */

    .${cssPrefix}-logo {
        width: ${height}px;
        height: ${height}px;
        position: absolute;
        top:0px;
        left:0px;
        width: ${height - 4}px;
        height: ${height - 4}px;
    }
    .${cssPrefix}-svg {
        fill: ${options.color};
        margin-top: ${(height - fontSize * _LOGO_SCALE) / 2 - 2}px;
        margin-left: ${height / 3}px;
    }
    .${cssPrefix}-svg-error {
        fill: ${options.color};
        display:none;
        margin-top: ${(height - 28 / 18 * fontSize * _LOGO_SCALE) / 2 - 2}px;
        margin-left: ${height / 3}px;
    }


    /*
    * Title
    */

    .${cssPrefix}-title {
        color: ${options.color};
        position: relative;
        font-size: ${fontSize}px;
        padding-left: ${height * 1.05}px;
        padding-right: ${(borderRadius - 10 < 5) ? height / 3 : borderRadius - 10}px;
        transition: color 0.5s;
    }

    /*
    * disabled
    */

    button.${cssPrefix}-button[disabled=true] {
        opacity: ${options.disabledOpacity};
    }

    button.${cssPrefix}-button[disabled=true] > .${cssPrefix}-logo > .${cssPrefix}-svg {
        display:none;
    }

    button.${cssPrefix}-button[disabled=true] > .${cssPrefix}-logo > .${cssPrefix}-svg-error {
        display:initial;
    }

    /*
    * error
    */

    button.${cssPrefix}-button[error=true] {
        animation: errorShake 0.4s;
    }

    @keyframes errorShake {
      0% { transform: translate(1px, 0) }
      10% { transform: translate(-2px, 0) }
      20% { transform: translate(2px, 0) }
      30% { transform: translate(-2px, 0) }
      40% { transform: translate(2px, 0) }
      50% { transform: translate(-2px, 0) }
      60% { transform: translate(2px, 0) }
      70% { transform: translate(-2px, 0) }
      80% { transform: translate(2px, 0) }
      90% { transform: translate(-1px, 0) }
      100% { transform: translate(0px, 0) }
    }
  `);
};

export class WebXRSessionStartEvent extends Event {
  constructor(
    public readonly mode: 'immersive-ar' | 'immersive-vr' | 'inline',
    public readonly session: XRSession,
  ) {
    super('webxrsession-start');
  }
};


/**
 * Function checking if a specific css class exists as child of element.
 *
 * @param {HTMLElement} el element to find child in
 * @param {string} cssPrefix css prefix of button
 * @param {string} suffix class name
 * @param {function} fn function to call if child is found
 * @private
 */
const ifChild = (el: HTMLElement, cssPrefix: string, suffix: string, fn: Function) => {
  const c = el.querySelector('.' + cssPrefix + '-' + suffix);
  c && fn(c);
};


// // This informs the 'Enter XR' button that the session has started and
// // that it should display 'Exit XR' instead.
// xrButton.setSession(session);

// // Called either when the user has explicitly ended the session (like in
// // onEndSession()) or when the UA has ended the session for any reason.
// // At this point the session object is no longer usable and should be
// // discarded.
// function onSessionEnded(_event: Event) {
//   console.log('onSessionEnded');
//
//   xrButton.setSession(null);
//
//   // In this simple case discard the WebGL context too, since we're not
//   // rendering anything else to the screen with it.
//   g_app = null;
// }
// // Listen for the sessions 'end' event so we can respond if the user
// // or UA ends the session for any reason.
// session.addEventListener('end', onSessionEnded);
// // Is WebXR available on this UA?
// if (xr) {
//   // If the device allows creation of exclusive sessions set it as the
//   // target of the 'Enter XR' button.
//   xr!.isSessionSupported(isAR ? 'immersive-ar' : 'immersive-vr').then((supported) => {
//     xrButton.enabled = supported;
//   });
// }

class InnerButton {
  domElement: HTMLElement;
  private _enabled: boolean = false;
  private __forceDisabled: boolean = false;
  private __defaultDisplayStyle: string;
  private __session: XRSession | null = null;
  textEnterXRTitle: string;
  textExitXRTitle: string;

  constructor(mode: XRSessionMode,
    public readonly options: RequiredNotNull<WebXRButtonOptions>,
    requestSessionAsync: (mode: XRSessionMode) => Promise<XRSession>) {

    this.textEnterXRTitle = options.textEnterXRTitle + `(${mode})`;
    this.textExitXRTitle = options.textExitXRTitle + `(${mode})`;

    this.domElement = createDefaultView(options);

    this.__defaultDisplayStyle = this.domElement.style.display || 'initial';

    // Bind button click events to __onClick
    this.domElement.addEventListener('click', async () => {

      if (this.__session) {
        // end exists session
        console.log('onClick => end');
        this.__session.end();
        this.__session = null;
        this.__updateButtonState();
      } else if (navigator.xr) {
        try {
          // get new session
          this.__session = await requestSessionAsync(mode)
          console.log('onClick =>', this.__session);
          this.__updateButtonState();
        }
        catch (err) {
          // Reaching this point indicates that the session request has failed
          // and we should communicate that to the user somehow.
          let errorMsg = `XRSession creation failed: ${(err as Error).message}`;

          this.setTooltip(errorMsg);
          // console.error(errorMsg);

          // Disable the button momentarily to indicate there was an issue.
          this.__setDisabledAttribute(true);
          this.domElement.setAttribute('error', 'true');
          setTimeout(() => {
            this.__setDisabledAttribute(false);
            this.domElement.setAttribute('error', 'false');
          }, 1000);
          throw err;
        }
      }

    });

    this.__setDisabledAttribute(true);
    this.setTitle(options.textXRNotFoundTitle);
  }

  /**
   * Sets the enabled state of this button.
   * @param {boolean} enabled
   */
  set enabled(enabled: boolean) {
    this._enabled = enabled;
    this.__updateButtonState();
  }

  /**
   * Gets the enabled state of this button.
   */
  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Set the title of the button
   */
  setTitle(text: string): InnerButton {
    this.domElement.title = text;
    ifChild(this.domElement, this.options.cssprefix, 'title', (title: HTMLElement) => {
      if (!text) {
        title.style.display = 'none';
      } else {
        title.innerText = text;
        title.style.display = 'initial';
      }
    });

    return this;
  }

  /**
   * Set the tooltip of the button
   */
  setTooltip(tooltip: string): InnerButton {
    this.domElement.title = tooltip;
    return this;
  }

  /**
   * Show the button
   */
  show(): InnerButton {
    this.domElement.style.display = this.__defaultDisplayStyle;
    return this;
  }

  /**
   * Hide the button
   */
  hide(): InnerButton {
    this.domElement.style.display = 'none';
    return this;
  }

  /**
   * Enable the button
   */
  enable(): InnerButton {
    this.__setDisabledAttribute(false);
    this.__forceDisabled = false;
    return this;
  }

  /**
   * Disable the button from being clicked
   * @return {EnterXRButton}
   */
  disable(): InnerButton {
    this.__setDisabledAttribute(true);
    this.__forceDisabled = true;
    return this;
  }

  /**
   * clean up object for garbage collection
   */
  remove() {
    if (this.domElement.parentElement) {
      this.domElement.parentElement.removeChild(this.domElement);
    }
  }

  /**
   * Set the disabled attribute
   */
  private __setDisabledAttribute(disabled: boolean) {
    if (disabled || this.__forceDisabled) {
      this.domElement.setAttribute('disabled', 'true');
    } else {
      this.domElement.removeAttribute('disabled');
    }
  }

  /**
   * Updates the display of the button based on it's current state
   */
  private __updateButtonState() {
    if (this.__session) {
      this.setTitle(this.textExitXRTitle);
      this.setTooltip('Exit XR presentation');
      this.__setDisabledAttribute(false);
    } else if (this._enabled) {
      this.setTitle(this.textEnterXRTitle);
      this.setTooltip('Enter XR');
      this.__setDisabledAttribute(false);
    } else {
      this.setTitle(this.options.textXRNotFoundTitle);
      this.setTooltip('No XR headset found.');
      this.__setDisabledAttribute(true);
    }
  }
}


export class WebXRButton extends EventTarget {
  options: RequiredNotNull<WebXRButtonOptions>;

  buttonInline: InnerButton;
  buttonVR: InnerButton;
  buttonAR: InnerButton;

  /**
   * Construct a new Enter XR Button
   */
  constructor(_options: WebXRButtonOptions) {

    if (!_options.domElement) {
      throw new Error("require placement elment");
    }

    super();

    this.options = validateOption(_options);

    const onClick = async (mode: XRSessionMode) => {
      const session = await navigator.xr!.requestSession(mode, {
        requiredFeatures: this.options.requiredFeatures,
        optionalFeatures: this.options.optionalFeatures,
      });
      this.dispatchEvent(new WebXRSessionStartEvent('immersive-vr', session));
      return session;
    };

    this.options.domElement.appendChild(
      createFeatureHtml('requiredFeatures', this.options.requiredFeatures));
    this.options.domElement.appendChild(
      createFeatureHtml('optionalFeatures', this.options.optionalFeatures));

    // inline
    this.buttonInline = new InnerButton('inline', this.options, onClick);
    this.options.domElement.appendChild(this.buttonInline.domElement);

    // vr
    this.buttonVR = new InnerButton('immersive-vr', this.options, onClick);
    this.options.domElement.appendChild(this.buttonVR.domElement);

    // ar
    this.buttonAR = new InnerButton('immersive-ar', this.options, onClick);
    this.options.domElement.appendChild(this.buttonAR.domElement);

    if (navigator.xr) {
      navigator.xr.isSessionSupported('inline').then(isSupported => {
        if (isSupported) {
          this.buttonInline.enabled = true;
        }
      });
      navigator.xr.isSessionSupported('immersive-vr').then(isSupported => {
        if (isSupported) {
          this.buttonVR.enabled = true;
        }
      });
      navigator.xr.isSessionSupported('immersive-ar').then(isSupported => {
        if (isSupported) {
          this.buttonAR.enabled = true;
        }
      });
    }
    else {
      console.warn('no navigator.xr');
    }
  }
}
