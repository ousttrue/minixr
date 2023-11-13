// Copyright 2018 The Immersive Web Community Group
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Node } from './node.mjs';
import { Material } from '../materials/material.mjs';
import { Texture } from '../materials/texture.mjs';
import { BoxBuilder } from '../geometry/box-builder.mjs';
import { vec3, mat4 } from '../../math/gl-matrix.mjs';


const GL = WebGLRenderingContext; // For enums


class CubeSeaMaterial extends Material {
  baseColor: import("../material.mjs").MaterialSampler;
  constructor(public heavy = false) {
    super();
    this.baseColor = this.defineSampler('baseColor');
  }

  get materialName() {
    return 'CUBE_SEA';
  }

  get vertexSource() {
    return `
    attribute vec3 POSITION;
    attribute vec2 TEXCOORD_0;
    attribute vec3 NORMAL;

    varying vec2 vTexCoord;
    varying vec3 vLight;

    const vec3 lightDir = vec3(0.75, 0.5, 1.0);
    const vec3 ambientColor = vec3(0.5, 0.5, 0.5);
    const vec3 lightColor = vec3(0.75, 0.75, 0.75);

    vec4 vertex_main(mat4 proj, mat4 view, mat4 model) {
      vec3 normalRotated = vec3(model * vec4(NORMAL, 0.0));
      float lightFactor = max(dot(normalize(lightDir), normalRotated), 0.0);
      vLight = ambientColor + (lightColor * lightFactor);
      vTexCoord = TEXCOORD_0;
      return proj * view * model * vec4(POSITION, 1.0);
    }`;
  }

  get vertexSourceMultiview() {
    return `#version 300 es
    #extension GL_OVR_multiview2 : require
    #define NUM_VIEWS 2
    layout(num_views=NUM_VIEWS) in;
    #define VIEW_ID gl_ViewID_OVR
    in vec3 POSITION;
    in vec2 TEXCOORD_0;
    in vec3 NORMAL;

    out vec2 vTexCoord;
    out vec3 vLight;

    const vec3 lightDir = vec3(0.75, 0.5, 1.0);
    const vec3 ambientColor = vec3(0.5, 0.5, 0.5);
    const vec3 lightColor = vec3(0.75, 0.75, 0.75);

    vec4 vertex_main(mat4 left_proj, mat4 left_view, mat4 right_proj, mat4 right_view, mat4 model) {
      vec3 normalRotated = vec3(model * vec4(NORMAL, 0.0));
      float lightFactor = max(dot(normalize(lightDir), normalRotated), 0.0);
      vLight = ambientColor + (lightColor * lightFactor);
      vTexCoord = TEXCOORD_0;
      return (VIEW_ID == 0u) ? left_proj * left_view * model * vec4(POSITION, 1.0) :
                               right_proj * right_view * model * vec4(POSITION, 1.0);
    }`;
  }

  get fragmentSourceMultiview() {
    if (!this.heavy) {
      return `#version 300 es
      precision mediump float;
      uniform sampler2D baseColor;
      in vec2 vTexCoord;
      in vec3 vLight;

      vec4 fragment_main() {
        return vec4(vLight, 1.0) * texture(baseColor, vTexCoord);
      }`;
    } else {
      // NOT IMPLEMENTED
      console.log("Multiview HEAVY case is not implemented");
    }
  }
  get fragmentSource() {
    if (!this.heavy) {
      return `
      precision mediump float;
      uniform sampler2D baseColor;
      varying vec2 vTexCoord;
      varying vec3 vLight;

      vec4 fragment_main() {
        return vec4(vLight, 1.0) * texture2D(baseColor, vTexCoord);
      }`;
    } else {
      // Used when we want to stress the GPU a bit more.
      // Stolen with love from https://www.clicktorelease.com/code/codevember-2016/4/
      return `
      precision mediump float;

      uniform sampler2D diffuse;
      varying vec2 vTexCoord;
      varying vec3 vLight;

      vec2 dimensions = vec2(64, 64);
      float seed = 0.42;

      vec2 hash( vec2 p ) {
        p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));
        return fract(sin(p)*18.5453);
      }

      vec3 hash3( vec2 p ) {
          vec3 q = vec3( dot(p,vec2(127.1,311.7)),
                 dot(p,vec2(269.5,183.3)),
                 dot(p,vec2(419.2,371.9)) );
        return fract(sin(q)*43758.5453);
      }

      float iqnoise( in vec2 x, float u, float v ) {
        vec2 p = floor(x);
        vec2 f = fract(x);
        float k = 1.0+63.0*pow(1.0-v,4.0);
        float va = 0.0;
        float wt = 0.0;
        for( int j=-2; j<=2; j++ )
          for( int i=-2; i<=2; i++ ) {
            vec2 g = vec2( float(i),float(j) );
            vec3 o = hash3( p + g )*vec3(u,u,1.0);
            vec2 r = g - f + o.xy;
            float d = dot(r,r);
            float ww = pow( 1.0-smoothstep(0.0,1.414,sqrt(d)), k );
            va += o.z*ww;
            wt += ww;
          }
        return va/wt;
      }

      // return distance, and cell id
      vec2 voronoi( in vec2 x ) {
        vec2 n = floor( x );
        vec2 f = fract( x );
        vec3 m = vec3( 8.0 );
        for( int j=-1; j<=1; j++ )
          for( int i=-1; i<=1; i++ ) {
            vec2  g = vec2( float(i), float(j) );
            vec2  o = hash( n + g );
            vec2  r = g - f + (0.5+0.5*sin(seed+6.2831*o));
            float d = dot( r, r );
            if( d<m.x )
              m = vec3( d, o );
          }
        return vec2( sqrt(m.x), m.y+m.z );
      }

      vec4 fragment_main() {
        vec2 uv = ( vTexCoord );
        uv *= vec2( 10., 10. );
        uv += seed;
        vec2 p = 0.5 - 0.5*sin( 0.*vec2(1.01,1.71) );

        vec2 c = voronoi( uv );
        vec3 col = vec3( c.y / 2. );

        float f = iqnoise( 1. * uv + c.y, p.x, p.y );
        col *= 1.0 + .25 * vec3( f );

        return vec4(vLight, 1.0) * texture2D(diffuse, vTexCoord) * vec4( col, 1. );
      }`;
    }
  }
}

export class CubeSeaNode extends Node {
  heavyGpu: boolean;
  cubeCount: any;
  cubeScale: any;
  halfOnly: boolean;
  autoRotate: boolean;
  private _material: CubeSeaMaterial;
  heroNode: Node;
  constructor(options: {
    heavyGpu: boolean,
    cubeCount: number,
    cubeScale: number,
    halfOnly: boolean,
    autoRotate: boolean,
    texture: Texture,
  }) {
    super('CubeSeaNode');

    // Test variables
    // If true, use a very heavyweight shader to stress the GPU.
    this.heavyGpu = !!options.heavyGpu;

    // Number and size of the static cubes. Warning, large values
    // don't render right due to overflow of the int16 indices.
    this.cubeCount = options.cubeCount || (this.heavyGpu ? 12 : 10);
    this.cubeScale = options.cubeScale || 1.0;

    // Draw only half the world cubes. Helps test variable render cost
    // when combined with heavyGpu.
    this.halfOnly = !!options.halfOnly;

    // Automatically spin the world cubes. Intended for automated testing,
    // not recommended for viewing in a headset.
    this.autoRotate = !!options.autoRotate;


    this._material = new CubeSeaMaterial(this.heavyGpu);
    this._material.baseColor.texture = options.texture;

    {
      let boxBuilder = new BoxBuilder();
      // Build the spinning "hero" cubes
      boxBuilder.pushCube([0, 0.25, -0.8], 0.1);
      boxBuilder.pushCube([0.8, 0.25, 0], 0.1);
      boxBuilder.pushCube([0, 0.25, 0.8], 0.1);
      boxBuilder.pushCube([-0.8, 0.25, 0], 0.1);
      let heroPrimitive = boxBuilder.finishPrimitive(this._material);
      this.heroNode = new Node("hero");
      this.heroNode.primitives.push(heroPrimitive);
      this.addNode(this.heroNode);
    }

    {
      let boxBuilder = new BoxBuilder();
      let size = 0.4 * this.cubeScale;
      boxBuilder.pushCube([0, 0, 0], size);
      let cubeSeaPrimitive = boxBuilder.finishPrimitive(this._material);

      // Build the cube sea
      let halfGrid = this.cubeCount * 0.5;
      for (let x = 0; x < this.cubeCount; ++x) {
        for (let y = 0; y < this.cubeCount; ++y) {
          for (let z = 0; z < this.cubeCount; ++z) {
            let pos = [x - halfGrid, y - halfGrid, z - halfGrid];
            // Only draw cubes on one side. Useful for testing variable render
            // cost that depends on view direction.
            if (pos[2] > 0) {
              continue;
            }

            // Don't place a cube in the center of the grid.
            if (pos[0] == 0 && pos[1] == 0 && pos[2] == 0) {
              continue;
            }

            const cubeSeaNode = new Node('sea');
            cubeSeaNode.primitives.push(cubeSeaPrimitive);
            cubeSeaNode.local.translation = vec3.fromValues(pos[0], pos[1], pos[2]);

            this.addNode(cubeSeaNode);
          }
        }
      }
    }
  }

  protected _onUpdate(timestamp: number, _frameDelta: number,
    _refsp: XRReferenceSpace, _frame: XRFrame) {
    // if (this.autoRotate) {
    //   const matrix = this.cubeSeaNode.local.matrix;
    //   mat4.fromRotation(timestamp / 500, vec3.fromValues(0, -1, 0), { out: matrix });
    //   this.cubeSeaNode.local.invalidate();
    // }

    {
      const matrix = this.heroNode.local.matrix;
      mat4.fromRotation(timestamp / 2000, vec3.fromValues(0, 1, 0), { out: matrix });
      this.heroNode.local.invalidate();
    }
  }
}
