import { mat4, vec3 } from '../math/gl-matrix.mjs';
import { Material, ProgramDefine } from '../materials/material.mjs';
import { MaterialState, CAP } from '../materials/materialstate.mjs';
import { Mesh, SubMesh, MeshVertexAttribute, Skin } from '../buffer/mesh.mjs';
import { Scene } from '../scene.mjs';
import { BufferSource, ElementType } from '../buffer/buffersource.mjs';
import { WglVao, VertexAttribute } from './vao.mjs';
import { WglBuffer, BufferType } from './buffer.mjs';
import { WglShader, ModShader } from './shader.mjs';
import { TextureFactory } from './texturefactory.mjs';

const GL = WebGL2RenderingContext; // For enums

const DEF_LIGHT_DIR = vec3.fromValues(-0.1, -1.0, -0.2);
const DEF_LIGHT_COLOR = vec3.fromValues(3.0, 3.0, 3.0);

const IDENTITY = mat4.identity();


function setCap(gl: WebGL2RenderingContext, glEnum: number, cap: any, prevState: any, state: any) {
  let change = (state & cap) - (prevState & cap);
  if (!change) {
    return;
  }

  if (change > 0) {
    gl.enable(glEnum);
  } else {
    gl.disable(glEnum);
  }
}


class Lighting {
  private _globalLightColor = DEF_LIGHT_COLOR.copy();
  set globalLightColor(value: vec3) {
    value.copy({ out: this._globalLightColor });
  }
  get globalLightColor() {
    return this._globalLightColor;
  }

  private _globalLightDir = DEF_LIGHT_DIR.copy();
  set globalLightDir(value: vec3) {
    value.copy({ out: this._globalLightDir });
  }
  get globalLightDir() {
    return this._globalLightDir;
  }
}


export class Renderer {
  private _lighting = new Lighting();
  private _bufferMap: Map<BufferSource, WglBuffer> = new Map();
  private _primVaoMap: Map<Mesh, WglVao> = new Map();
  private _shaderMap: Map<SubMesh, WglShader> = new Map();

  private _uboMap: Map<ArrayBuffer, WglBuffer> = new Map();
  private _textureFactory: TextureFactory;
  skinningUbo: WglBuffer;

  // layout (std140) uniform uEnv {
  //   mat4 uView[2];
  //   mat4 uProjection[2];
  //   vec4 uLightPosDir;
  //   vec4 uLightColor;
  // };
  envUboBuffer = new Float32Array(16 * 4 + 4 + 4);
  envUbo: WglBuffer;

  constructor(
    public readonly gl: WebGL2RenderingContext,
    public readonly multiview = false,
  ) {
    this._textureFactory = new TextureFactory(gl);
    this.envUbo = new WglBuffer(gl, GL.UNIFORM_BUFFER);
    this.skinningUbo = new WglBuffer(gl, GL.UNIFORM_BUFFER);
  }

  private _getOrCreateUbo(src: ArrayBuffer): WglBuffer {
    let buffer = this._uboMap.get(src);
    if (buffer) {
      return buffer;
    }
    buffer = new WglBuffer(this.gl, GL.UNIFORM_BUFFER);
    buffer.upload(src);
    return buffer;
  }

  private _getOrCreateProgram(submesh: SubMesh,
    meshDefines: ProgramDefine[],
    attributesBinds: string[], hasSkinning: boolean): WglShader {
    let shader = this._shaderMap.get(submesh);
    if (shader) {
      return shader;
    }

    if (meshDefines.length > 0) {
      const a = 0;
    }

    const defines = [...meshDefines, ...submesh.material.defines]
    if (hasSkinning) {
      defines.push(['USE_SKIN', 1])
    }

    shader = new ModShader(
      this.gl, submesh.material.shader,
      defines,
      this.multiview, attributesBinds);
    this._shaderMap.set(submesh, shader);
    return shader;
  }

  private _getOrCreateBuffer(source: BufferSource, buffertype: BufferType, elementtype?: ElementType): WglBuffer {
    let buffer = this._bufferMap.get(source);
    if (buffer) {
      return buffer;
    }

    buffer = new WglBuffer(this.gl, buffertype, elementtype);
    buffer.upload(source.array);
    this._bufferMap.set(source, buffer);
    return buffer;
  }

  private _getOrCreateMesh(mesh: Mesh): WglVao {
    let vao = this._primVaoMap.get(mesh);
    if (vao) {
      for (const attrib of mesh.attributes) {
        if (attrib.source.dirty) {
          const vbo = this._bufferMap.get(attrib.source);
          if (vbo) {
            // update vbo
            this.gl.bindVertexArray(null);
            attrib.source.dirty = false;
            vbo.upload(attrib.source.array);
          }
        }
      }
      if (mesh.indices && vao.indices) {
        if (mesh.indices.dirty) {
          // update ibo
          mesh.indices.dirty = false;
          vao.indices.upload(mesh.indices.array);
        }
      }
      if (mesh.instancing) {
        for (const attrib of mesh.instancing.instanceAttributes!) {
          if (attrib.source.dirty || attrib.source.usage == GL.STREAM_DRAW) {
            const vbo = this._bufferMap.get(attrib.source);
            if (vbo) {
              // update instancing
              this.gl.bindVertexArray(null);
              attrib.source.dirty = false;
              vbo.upload(attrib.source.array);
            }
          }
        }
      }
      return vao;
    }

    this.gl.bindVertexArray(null);

    // IBO
    let ibo: WglBuffer | undefined = undefined;
    if (mesh.indices) {
      ibo = this._getOrCreateBuffer(mesh.indices, GL.ELEMENT_ARRAY_BUFFER, mesh.indices.glType);
    }

    const createAttribute = (src: MeshVertexAttribute): VertexAttribute => ({
      name: src.name,
      buffer: this._getOrCreateBuffer(src.source, GL.ARRAY_BUFFER),
      componentType: src.componentType,
      componentCount: src.componentCount,
      bufferStride: src.stride,
      bufferOffset: src.byteOffset,
    });

    // VAO
    vao = new WglVao(this.gl,
      mesh.attributes.map(createAttribute),
      ibo,
      (mesh.instancing) ? mesh.instancing.instanceAttributes.map(createAttribute) : []);
    this._primVaoMap.set(mesh, vao);
    return vao;
  }

  drawScene(
    view: XRView,
    scene: Scene,
    rightView?: XRView,
  ) {
    {
      this.envUboBuffer.set(view.transform.inverse.matrix);
      this.envUboBuffer.set(view.projectionMatrix, 32);
      if (rightView) {
        this.envUboBuffer.set(rightView.transform.inverse.matrix, 16);
        this.envUboBuffer.set(rightView.projectionMatrix, 48);
      }
      this.envUbo.upload(this.envUboBuffer);
    }

    const state = {
      prevProgram: null,
      prevMaterial: null,
      prevVao: null,
    }
    scene.world.view(mat4, Mesh).each((entity, matrix, primitive) => {
      const skin = scene.world.get(entity, Skin)
      this._drawMesh(view, scene, matrix, primitive, state, rightView, skin);
    });
  }

  private _drawMesh(
    view: XRView,
    scene: Scene,
    matrix: mat4, mesh: Mesh,
    state: {
      prevProgram: WglShader | null,
      prevMaterial: Material | null,
    },
    rightView?: XRView,
    skin?: Skin,
  ) {
    let gl = this.gl;


    // update ubo
    mesh.uboMap.forEach((value, key) => {
      const ubo = this._getOrCreateUbo(value);
      ubo.upload(value);
    });
    if (skin) {
      const matrices = skin.updateSkinningMatrix(
        (joint) => scene.nodeMap.get(joint)!.matrix)
      this.skinningUbo.upload(matrices);
    }


    const vao = this._getOrCreateMesh(mesh);
    vao.bind();
    let drawOffset = 0
    for (const submesh of mesh.submeshes) {
      const program = this._getOrCreateProgram(
        submesh, mesh.defines, vao.attributeBinds, skin != null)
      const programChanged = state.prevProgram != program
      if (programChanged) {
        state.prevProgram = program;
        if (!state.prevProgram) {
          throw new Error("arienai");
        }
        program.use();

        if (program.uniformMap.LIGHT_DIRECTION) {
          gl.uniform3fv(program.uniformMap.LIGHT_DIRECTION, this._lighting.globalLightDir.array);
        }

        if (program.uniformMap.LIGHT_COLOR) {
          gl.uniform3fv(program.uniformMap.LIGHT_COLOR, this._lighting.globalLightColor.array);
        }

      }

      if (programChanged || state.prevMaterial != submesh.material) {
        this._bindMaterialState(submesh.material.state, state.prevMaterial?.state);
        program.bindMaterial(submesh.material,
          (src) => this._textureFactory.getOrCreateTexture(src));
        state.prevMaterial = submesh.material;
      }

      if (skin) {
        program.setMatrix('MODEL_MATRIX', IDENTITY);
      }
      else {
        gl.uniformMatrix4fv(program.uniformMap.MODEL_MATRIX, false, matrix.array);
      }

      // bind ubo
      for (const key in submesh.material._uboMap) {
        const value = submesh.material._uboMap[key];
        const ubo = this._getOrCreateUbo(value);
        ubo.upload(value);
        const uboInfo = program.uboIndexMap[key];
        if (uboInfo) {
          program.setUbo(key, ubo, uboInfo.index);
        }
      }
      mesh.uboMap.forEach((value, key) => {
        const ubo = this._getOrCreateUbo(value);
        const uboInfo = program.uboIndexMap[key];
        if (uboInfo) {
          program.setUbo(key, ubo, uboInfo.index);
        }
      });
      {
        const uboInfo = program.uboIndexMap['uEnv'];
        if (uboInfo) {
          program.setUbo('uEnv', this.envUbo, uboInfo.index);
        }
      }
      {
        const uboInfo = program.uboIndexMap['uSkinning'];
        if (uboInfo) {
          program.setUbo('uSkinning', this.skinningUbo, uboInfo.index);
        }
      }

      if (mesh.instancing) {
        vao.drawInstancing(submesh.mode, submesh.drawCount,
          drawOffset, mesh.instancing.instanceCount);
      }
      else {
        vao.draw(submesh.mode, submesh.drawCount,
          drawOffset);
      }
      drawOffset += submesh.drawCount;
    }
    vao.unbind();
  }

  _colorMaskNeedsReset = false;
  _depthMaskNeedsReset = false;
  private _bindMaterialState(materialState: MaterialState, prevMaterialState?: MaterialState) {
    let state = materialState.state;
    let prevState: number = prevMaterialState ? prevMaterialState.state : ~state;

    // Return early if both materials use identical state
    if (state == prevState) {
      return;
    }

    let gl = this.gl;

    // Any caps bits changed?
    if (materialState._capsDiff(prevState)) {

      setCap(gl, gl.CULL_FACE, CAP.CULL_FACE, prevState, state);
      setCap(gl, gl.BLEND, CAP.BLEND, prevState, state);
      setCap(gl, gl.DEPTH_TEST, CAP.DEPTH_TEST, prevState, state);
      setCap(gl, gl.STENCIL_TEST, CAP.STENCIL_TEST, prevState, state);

      let colorMaskChange = (state & CAP.COLOR_MASK) - (prevState & CAP.COLOR_MASK);
      if (colorMaskChange) {
        let mask = colorMaskChange > 1;
        this._colorMaskNeedsReset = !mask;
        gl.colorMask(mask, mask, mask, mask);
      }

      let depthMaskChange = (state & CAP.DEPTH_MASK) - (prevState & CAP.DEPTH_MASK);
      if (depthMaskChange) {
        this._depthMaskNeedsReset = !(depthMaskChange > 1);
        gl.depthMask(depthMaskChange > 1);
      }

      let stencilMaskChange = (state & CAP.STENCIL_MASK) - (prevState & CAP.STENCIL_MASK);
      if (stencilMaskChange) {
        gl.stencilMask(stencilMaskChange > 1 ? 0xff : 0x00);
      }
    }

    // Blending enabled and blend func changed?
    if (materialState._blendDiff(prevState)) {
      gl.blendFunc(materialState.blendFuncSrc, materialState.blendFuncDst);
    }

    // Depth testing enabled and depth func changed?
    if (materialState._depthFuncDiff(prevState)) {
      gl.depthFunc(materialState.depthFunc);
    }
  }
}
