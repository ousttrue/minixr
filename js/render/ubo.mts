export class Ubo {
  buffer: WebGLBuffer;

  constructor(gl: WebGL2RenderingContext,
    public readonly array: ArrayBuffer) {
    this.buffer = gl.createBuffer()!;
    console.log('create ubo', this.buffer);
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
    gl.bufferData(gl.UNIFORM_BUFFER, this.array, gl.STATIC_DRAW);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  }

  update(gl: WebGL2RenderingContext) {
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
    gl.bufferData(gl.UNIFORM_BUFFER, this.array, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  }

  bind(gl: WebGL2RenderingContext, base: number) {
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, base, this.buffer);
  }

  unbind(gl: WebGL2RenderingContext) {
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  }
}

export type UboMap = { [key: string]: Ubo };
