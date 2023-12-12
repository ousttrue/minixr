import { Mesh, SubMesh, Skin } from '../webxr/js/buffer/mesh.mjs';
import { BufferSource } from '../webxr/js/buffer/buffersource.mjs';
import { Material } from '../webxr/js/materials/material.mjs';
import { WglShader, ModShader } from '../webxr/js/render/shader.mjs';
import { WglVao } from '../webxr/js/render/vao.mjs';
import { WglBuffer } from '../webxr/js/render/buffer.mjs';
import { Animation } from '../webxr/js/animation.mjs';
import { PbrMaterial } from '../webxr/js/gltf2-loader.mjs';
import {
  vec3, vec4, mat4, OrbitView, PerspectiveProjection
} from '../webxr/js/math/gl-matrix.mjs';
import Stats from 'stats-gl'
import { Scene } from '../webxr/js/scene.mjs';


const GL = WebGL2RenderingContext;
const IDENTITY = mat4.identity()



export class Renderer {
  // create a new Stats object
  stats = new Stats({
    logsPerSecond: 20,
    samplesLog: 100,
    samplesGraph: 10,
    precision: 2,
    horizontal: true,
    minimal: false,
    mode: 0
  });

  meshVaoMap: Map<Mesh, WglVao> = new Map();
  materialShaderMap: Map<Material, WglShader> = new Map();
  materialSkinningShaderMap: Map<SubMesh, WglShader> = new Map();

  shader: WglShader | null = null;

  envUbo: WglBuffer;

  skinningUbo: WglBuffer;

  color = vec4.fromValues(0.9, 0.9, 0.9, 1);
  materialUbo: WglBuffer;

  constructor(
    public readonly gl: WebGL2RenderingContext,
    public readonly observer: ResizeObserver,
    statsParent: HTMLElement
  ) {
    this.envUbo = new WglBuffer(gl, GL.UNIFORM_BUFFER);
    this.materialUbo = new WglBuffer(gl, GL.UNIFORM_BUFFER)
    this.materialUbo.upload(this.color.array);
    this.skinningUbo = new WglBuffer(gl, GL.UNIFORM_BUFFER);

    statsParent.appendChild(this.stats.container);
    this.stats.container.style.position = 'absolute';
    statsParent.style.position = 'relative';
  }

  render(env: Float32Array, scene?: Scene) {
    this.stats.begin();

    if (scene) {
      // update scene
      const world = scene.world;
      const seconds = scene.timeSeconds;
      // console.log(seconds);
      world.view(Animation).each((entity, animation) => {
        animation.update(seconds);
      });

      this.envUbo.upload(env);
      this.materialUbo.upload(this.color.array);

      world.view(mat4, Mesh).each((entity, matrix, mesh) => {
        const vao = this._getOrCreateVao(mesh);

        vao.bind();

        const skin = world.get(entity, Skin);
        if (skin) {
          const matrices = skin.updateSkinningMatrix(
            (joint) => scene.nodeMap.get(joint)!.matrix)
          this.skinningUbo.upload(matrices);
        }

        let offset = 0
        for (const submesh of mesh.submeshes) {

          const shader = this._getOrCreateShader(submesh,
            vao.attributeBinds, skin != null);
          shader.use();

          // update camera matrix
          shader.setUbo('uEnv', this.envUbo, 0);
          // shader.setUbo('uMaterial', this.materialUbo, 1);
          if (skin) {
            shader.setUbo('uSkinning', this.skinningUbo, 1);
          }
          shader.setMatrix('MODEL_MATRIX', IDENTITY);

          vao.draw(submesh.mode, submesh.drawCount, offset);
          offset += submesh.drawCount;
        }

        vao.unbind();
      });
    }

    this.stats.end();
  }

  private _getOrCreateVao(mesh: Mesh): WglVao {
    {
      const vao = this.meshVaoMap.get(mesh);
      if (vao) {
        return vao;
      }
    }

    {
      let indices: WglBuffer | undefined = undefined;
      const vboMap: Map<BufferSource, WglBuffer> = new Map();
      for (const attr of mesh.attributes) {
        let vbo = vboMap.get(attr.source);
        if (!vbo) {
          vbo = new WglBuffer(this.gl, GL.ARRAY_BUFFER)
          vbo.upload(attr.source.array);
          vboMap.set(attr.source, vbo);
        }
      }
      if (mesh.indices) {
        indices = new WglBuffer(this.gl, GL.ELEMENT_ARRAY_BUFFER, mesh.indices.glType);
        indices.upload(mesh.indices.array);
      }

      const vao = new WglVao(this.gl, mesh.attributes.map(
        x => {
          return {
            name: x.name,
            buffer: vboMap.get(x.source)!,
            bufferStride: x.stride,
            bufferOffset: x.byteOffset,
            componentCount: x.componentCount,
            componentType: x.componentType,
          }
        }
      ), indices);
      this.meshVaoMap.set(mesh, vao);
      return vao;
    }
  }

  private _getOrCreateShader(
    submesh: SubMesh, attributeBinds: string[], hasSkinning: boolean): WglShader {
    let shader = this.materialSkinningShaderMap.get(submesh);
    if (shader) {
      return shader;
    }

    const defines = [...submesh.material.defines]
    if (hasSkinning) {
      defines.push(['USE_SKIN', 1])
    }

    shader = new ModShader(
      this.gl, submesh.material.shader,
      defines,
      false, attributeBinds);
    this.materialSkinningShaderMap.set(submesh, shader);
    return shader;

  }
}
