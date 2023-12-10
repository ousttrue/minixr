export class Program {
  private _program: WebGLProgram;
  uniformMap: { [key: string]: WebGLUniformLocation } = {};

  constructor(gl: WebGL2RenderingContext, vs: string, fs: string) {
    const vertexShader = this._makeShader(gl, vs, gl.VERTEX_SHADER);
    const fragmentShader = this._makeShader(gl, fs, gl.FRAGMENT_SHADER);

    this._program = gl.createProgram()!;
    gl.attachShader(this._program, vertexShader);
    gl.attachShader(this._program, fragmentShader);
    gl.linkProgram(this._program);
    if (!gl.getProgramParameter(this._program, gl.LINK_STATUS)) {
      throw new Error("Unable to initialize the shader program");
    }

    let uniformCount = gl.getProgramParameter(this._program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      let uniformInfo = gl.getActiveUniform(this._program, i);
      if (uniformInfo) {
        const uniformName = uniformInfo.name.replace('[0]', '');
        const location = gl.getUniformLocation(this._program, uniformName);
        if (location) {
          this.uniformMap[uniformName] = location;
        }
      }
    }
  }

  use(gl: WebGL2RenderingContext) {
    gl.useProgram(this._program);
  }

  private _makeShader(gl: WebGL2RenderingContext,
    src: string, type: number): WebGLShader {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Error compiling shader: ${gl.getShaderInfoLog(shader)} ${src}`);
    }
    return shader;
  }
}

export class Vbo {
  buffer: WebGLBuffer;
  constructor(gl: WebGL2RenderingContext, buffer: Float32Array, public stride: number) {
    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
}

export class Ibo {
  buffer: WebGLBuffer;
  constructor(gl: WebGL2RenderingContext, buffer: Uint16Array) {
    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }
}

type VertexAttribute = {
  location: number,
  vbo: Vbo,
  offset: number,
  size: number,
  type: number,
};

export class Vao {
  vao: WebGLVertexArrayObject;
  constructor(gl: WebGL2RenderingContext,
    attributes: VertexAttribute[], ibo: Ibo,
    instanceAttributes: VertexAttribute[]) {
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    for (const attribute of attributes) {
      gl.bindBuffer(gl.ARRAY_BUFFER, attribute.vbo.buffer);
      gl.enableVertexAttribArray(attribute.location);
      gl.vertexAttribPointer(
        attribute.location,
        attribute.size,
        attribute.type,
        false,
        attribute.vbo.stride,
        attribute.offset,
      );
    }

    for (const attribute of instanceAttributes) {
      gl.bindBuffer(gl.ARRAY_BUFFER, attribute.vbo.buffer);
      gl.enableVertexAttribArray(attribute.location);
      gl.vertexAttribPointer(
        attribute.location,
        attribute.size,
        attribute.type,
        false,
        attribute.vbo.stride,
        attribute.offset,
      );
      gl.vertexAttribDivisor(attribute.location, 1)
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo.buffer);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  draw(gl: WebGL2RenderingContext, count: number) {
    gl.bindVertexArray(this.vao);
    // gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
    gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, count);
    gl.bindVertexArray(null);
  }
}

export class Ubo {
  buffer: WebGLBuffer;
  constructor(gl: WebGL2RenderingContext) {
    this.buffer = gl.createBuffer()!;
  }
}

export class Texture {
  texture: WebGLTexture;
  constructor(gl: WebGL2RenderingContext) {
    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  async loadAsync(gl: WebGL2RenderingContext, url: string) {
    const response = await fetch(url);
    const imageBlob = await response.blob();
    const imageBitmap = await createImageBitmap(imageBlob);
    console.log(imageBitmap);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageBitmap);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}
