export class Fbo {
  frameBuffer: WebGLFramebuffer | null = null;
  fTexture: WebGLTexture | null = null;
  width = 0;
  height = 0;

  constructor(private gl: WebGL2RenderingContext) {
  }

  getOrCreate(width: number, height: number)
    : WebGLFramebuffer {
    const gl = this.gl;
    if (this.frameBuffer && width == this.width && height == this.height) {
      return this.frameBuffer;
    }

    if (this.frameBuffer) {
      gl.deleteFramebuffer(this.frameBuffer);
      gl.deleteTexture(this.fTexture);
    }
    this.width = width;
    this.height = height;

    this.fTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);

    this.frameBuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    console.log('create fbo', width, height, this.frameBuffer);
    return this.frameBuffer;
  }
}
