import React from 'react';
import {
  vec3, vec4, mat4, OrbitView, PerspectiveProjection
} from '../lib/math/gl-matrix.mjs';
import { Mesh, MeshVertexAttribute, Skin } from '../lib/buffer/mesh.mjs';
import { BufferSource } from '../lib/buffer/buffersource.mjs';
import { Material } from '../lib/materials/material.mjs';
import { WglShader, VS, FS, VS_SKINNING } from '../lib/wgl/shader.mjs';
import { WglVao } from '../lib/wgl/vao.mjs';
import { WglBuffer } from '../lib/wgl/buffer.mjs';
import { Animation } from '../lib/animation.mjs';
import { Scene } from '../lib/scene.mjs';
import Stats from 'stats-gl'


// create a new Stats object
const stats = new Stats({
  logsPerSecond: 20,
  samplesLog: 100,
  samplesGraph: 10,
  precision: 2,
  horizontal: true,
  minimal: false,
  mode: 0
});


const GL = WebGL2RenderingContext;


class Env {
  buffer: Float32Array = new Float32Array(16 + 16 + 4 + 4);
  view: OrbitView;
  projection: PerspectiveProjection;
  lightPosDir: vec4;
  lightColor: vec4;

  constructor() {
    this.view = new OrbitView(
      new mat4(this.buffer.subarray(0, 16)),
      vec3.fromValues(0, 0, 5));

    this.projection = new PerspectiveProjection(
      new mat4(this.buffer.subarray(16, 32)));

    this.lightPosDir = new vec4(this.buffer.subarray(32, 36));
    this.lightPosDir.set(1, 1, 1, 0);
    this.lightColor = new vec4(this.buffer.subarray(36, 40));
  }
}


export class Renderer {

  meshVaoMap: Map<Mesh, WglVao> = new Map();
  materialShaderMap: Map<Material, WglShader> = new Map();
  materialSkinningShaderMap: Map<Material, WglShader> = new Map();

  shader: WglShader | null = null;

  env = new Env();
  envUbo: WglBuffer;

  skinningMatrices = new Float32Array(16 * 256);
  skinningUbo: WglBuffer;

  color = vec4.fromValues(0.9, 0.9, 0.9, 1);
  materialUbo: WglBuffer;

  constructor(
    public readonly gl: WebGL2RenderingContext,
    public readonly observer: ResizeObserver,
  ) {
    this.envUbo = WglBuffer.create(gl,
      GL.UNIFORM_BUFFER, this.env.buffer.buffer);
    this.materialUbo = WglBuffer.create(gl,
      GL.UNIFORM_BUFFER, this.color.array);
    this.skinningUbo = WglBuffer.create(gl,
      GL.UNIFORM_BUFFER, this.skinningMatrices);
  }

  render(width: number, height: number, scene?: Scene) {
    stats.begin();

    if (scene) {
      // update scene
      const world = scene.world;
      const seconds = scene.timeSeconds;
      // console.log(seconds);
      world.view(Animation).each((entity, animation) => {
        animation.update(seconds);
      });

      this.env.projection.resize(width, height);
      this.envUbo.upload(this.env.buffer);
      this.materialUbo.upload(this.color.array);

      {
        const gl = this.gl;
        gl.clearColor(0.2, 0.2, 0.2, 1);

        gl.enable(GL.DEPTH_TEST);
        gl.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

        gl.enable(GL.CULL_FACE);

        gl.clearDepth(1);
        gl.viewport(0, 0, width, height);
      }

      world.view(mat4, Mesh).each((entity, matrix, mesh) => {
        const vao = this._getOrCreateVao(mesh);

        vao.bind();

        const skin = world.get(entity, Skin)
        if (skin) {
          let j = 0
          for (let i = 0; i < skin.joints.length; ++i, j += 16) {
            const { joint, inverseBindMatrix } = skin.getJoint(i)
            const node = scene.nodeMap.get(joint)!

            // world inv skeleton p
            const dst = new mat4(this.skinningMatrices.subarray(j, j + 16))
            node.matrix.mul(inverseBindMatrix, { out: dst })
            if (skin.skeleton) {
              const skeletonNode = scene.nodeMap.get(skin.skeleton)!
              const skeletonMatrix = skeletonNode.matrix;
              skeletonMatrix.mul(dst, { out: dst })
            }
            // mat4.identity({ out: dst })
          }
          this.skinningUbo.upload(this.skinningMatrices);
        }

        let offset = 0
        for (const submesh of mesh.submeshes) {

          const shader = this._getOrCreateShader(submesh.material, skin != null);
          shader.use();

          // update camera matrix
          shader.setUbo('uEnv', this.envUbo, 0);
          shader.setUbo('uMaterial', this.materialUbo, 1);
          if (skin) {
            shader.setUbo('uSkinning', this.skinningUbo, 2);
          }
          shader.setMatrix('uModel', matrix);

          vao.draw(submesh.drawCount, offset);
          offset += submesh.drawCount;
        }

        vao.unbind();
      });
    }

    stats.end();
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
          vbo = WglBuffer.create(this.gl,
            GL.ARRAY_BUFFER, attr.source.array);
          vboMap.set(attr.source, vbo);
        }
      }
      if (mesh.indices) {
        indices = WglBuffer.create(this.gl,
          GL.ELEMENT_ARRAY_BUFFER, mesh.indices.array, mesh.indices.glType);
      }

      const vao = WglVao.create(this.gl, mesh.attributes.map(
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
    material: Material, hasSKinning: boolean): WglShader {
    if (hasSKinning) {
      {
        const shader = this.materialSkinningShaderMap.get(material);
        if (shader) {
          return shader;
        }
      }
      {
        const shader = WglShader.create(this.gl, VS_SKINNING, FS);
        this.materialSkinningShaderMap.set(material, shader);
        return shader;
      }
    }
    else {
      {
        const shader = this.materialShaderMap.get(material);
        if (shader) {
          return shader;
        }
      }
      {
        const shader = WglShader.create(this.gl, VS, FS);
        this.materialShaderMap.set(material, shader);
        return shader;
      }
    }
  }
}


export default function WebGLCanvas(props: {
  scene?: Scene,
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = React.useState<Renderer | null>(null);

  function getOrCreateState(): Renderer {
    if (renderer) {
      return renderer;
    }
    const canvas = ref.current!;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const observer = new ResizeObserver((_) => {
      const canvas = ref.current;
      if (canvas) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
    });
    observer.observe(canvas);
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error('no webgl2');
    }
    const statsParent = document.getElementById('stats')!;
    statsParent.appendChild(stats.container);
    stats.container.style.position = 'absolute';
    statsParent.style.position = 'relative';

    const newRenderer = new Renderer(gl, observer);
    setRenderer(newRenderer);
    return newRenderer;
  }

  React.useEffect(() => {
    if (!ref.current) {
      return;
    }

    const state = getOrCreateState();

    state.render(ref.current.width, ref.current.height, props.scene);
  });

  const [count, setCount] = React.useState(0);
  requestAnimationFrame(() => {
    setCount(count + 1);
  });

  const handleMouseMove: React.MouseEventHandler<HTMLCanvasElement> = (event) => {
    // Only rotate when the left button is pressed
    if (renderer) {
      if (event.buttons & 1) {
        renderer.env.view.rotate(event.movementX, event.movementY);
      }
      if (event.buttons & 4) {
        renderer.env.view.shift(event.movementX, event.movementY);
      }
    }
  };

  const handleWheel: React.WheelEventHandler<HTMLCanvasElement> = (event) => {
    if (renderer) {
      renderer.env.view.dolly(event.deltaY);
    }
  };

  return (<div id="stats" style={{ width: '100%', height: '100%' }}>
    <canvas
      style={{ width: '100%', height: '100%' }}
      ref={ref}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
    />
  </div>)
}
