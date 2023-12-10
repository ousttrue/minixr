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
import { vec3, mat4, BoundingBox } from '../math/gl-matrix.mjs';
import { Material, DefaultMaterial } from '../materials/material.mjs';
import { BufferSource, BufferSourceArray } from './buffersource.mjs';


const GL = WebGL2RenderingContext; // For enums


function getComponentSize(componentType: number) {
  switch (componentType) {
    case GL.FLOAT: return 4;
    case GL.UNSIGNED_BYTE: return 1;
    case GL.UNSIGNED_SHORT: return 2;
    case GL.UNSIGNED_INT: return 4;
    default: throw new Error(`unknown component type: ${componentType}`);
  }
}


const TypeMap = {
  [GL.FLOAT]: 'f32',
  [GL.UNSIGNED_BYTE]: 'u8',
  [GL.UNSIGNED_SHORT]: 'u16',
  [GL.UNSIGNED_INT]: 'u32',
}


export class MeshVertexAttribute {
  constructor(
    public readonly name: string,
    /** may sharing from multi PrimitiveAttributes */
    public readonly source: BufferSource,
    public readonly componentCount: number = 3,
    public readonly componentType: number = GL.FLOAT,
    public readonly stride: number = 0,
    public readonly byteOffset: number = 0,
    public readonly normalized = false) {
    if (this.stride == 0) {
      // console.warn(name, 'stride=0');
    }
  }

  toString(): string {
    return `${TypeMap[this.componentType]}[${this.componentCount}]`;
  }

  calcStride(): number {
    return getComponentSize(this.componentType) * this.componentCount;
  }

  getItem(index: number) {
    const size = getComponentSize(this.componentType);
    return this.source.getItem(index, this.byteOffset / size, this.componentCount);
  }

  setItem(index: number, src: BufferSourceArray) {
    const size = getComponentSize(this.componentType);
    this.source.setItem(index, this.byteOffset / size, src);
  }
}


// POINTS: 0x0000;
// LINES: 0x0001;
// LINE_LOOP: 0x0002;
// LINE_STRIP: 0x0003;
// TRIANGLES: 0x0004;
// TRIANGLE_STRIP: 0x0005;
// TRIANGLE_FAN: 0x0006;
export type DrawMode = 0 | 1 | 2 | 3 | 4 | 5 | 6;


export class SubMesh {
  constructor(
    public material: Material,
    public drawCount: number,
    public mode: DrawMode = GL.TRIANGLES,
  ) { }
}


export class Instancing {
  instanceCount: number = 0;

  constructor(
    public readonly instanceAttributes: MeshVertexAttribute[]
  ) {
  }
}


export class Mesh {
  bb = new BoundingBox();
  uboMap: Map<string, ArrayBuffer> = new Map();

  constructor(
    public readonly attributes: MeshVertexAttribute[],
    public readonly vertexCount: number,
    public readonly submeshes: SubMesh[] = [],
    public readonly indices?: BufferSource,
    public readonly instancing?: Instancing,
  ) {
    // if (options?.min && options?.max) {
    //   this.bb.expand(vec3.fromValues(
    //     options.min[0], options.min[1], options.min[2]));
    //   this.bb.expand(vec3.fromValues(
    //     options.max[0], options.max[1], options.max[2]));
    // }
    // else {
    //   for (const attr of attributes) {
    //     if (attr.name == 'POSITION') {
    //       attr.source.updateBBFromPositions(this.bb);
    //     }
    //   }
    // }

    // if (this.submeshes.length == 0) {
    //   if (indices) {
    //     this.submeshes.push(new SubMesh(DefaultMaterial, indices.length));
    //   }
    //   else {
    //     this.submeshes.push(new SubMesh(DefaultMaterial, vertexCount));
    //   }
    // }
  }

  setVertices(offset: number, attribute: MeshVertexAttribute) {
    for (const lhs of this.attributes) {
      if (lhs.name == attribute.name) {
        const lStride = lhs.calcStride();
        const rStride = attribute.calcStride();
        // if (lStride != rStride) {
        //   console.log(`${lhs.name}: ${lStride} => ${rStride}`)
        // }
        for (let i = 0; i < attribute.source.length; ++i) {
          const src = attribute.getItem(i);
          lhs.setItem(offset + i, src);
        }
        return;
      }
    }
    console.warn(`skip: ${attribute.name}`)
  }

  setIndices(vertexOffset: number, indexOffset: number, indices: BufferSource) {
    if (!this.indices) {
      throw new Error("no indices");
    }
    for (let i = 0; i < indices.length; ++i) {
      const index = indices.getItem(i, 0, 1)[0];
      this.indices.array[indexOffset + i] = vertexOffset + index;
    }
  }

  // calcStrideFor(attribute: MeshVertexAttribute) {
  //   let stride = 0;
  //   for (const a of this.attributes) {
  //     if (a.source == attribute.source) {
  //       stride += a.calcStride();
  //     }
  //   }
  //   return stride;
  // }

  hitTest(p: vec3): boolean {
    if (!this.bb.isFinite()) {
      for (const attr of this.attributes) {
        if (attr.name == 'POSITION') {
          attr.source.updateBBFromPositions(this.bb);
        }
      }
    }
    return this.bb.contains(p);
  }
}


export class Skin {
  skinningMatrices = new Float32Array(16 * 256);

  constructor(
    public readonly joints: number[],
    public readonly inverseBindMatrices: Float32Array,
    public readonly skeleton?: number
  ) {
    if (joints.length * 16 != inverseBindMatrices.length) {
      throw new Error("invalid");
    }
  }

  getJoint(i: number): { joint: number, inverseBindMatrix: mat4 } {
    return {
      joint: this.joints[i],
      inverseBindMatrix: new mat4(this.inverseBindMatrices.subarray(i * 16, i * 16 + 16))
    }
  }

  updateSkinningMatrix(getJointMatrix: (index: number) => mat4): Float32Array {
    let j = 0
    for (let i = 0; i < this.joints.length; ++i, j += 16) {
      const { joint, inverseBindMatrix } = this.getJoint(i)

      const jointMatrix = getJointMatrix(joint);

      // model (inversedSkeleton) joint inversedBindMatrices p
      const dst = new mat4(this.skinningMatrices.subarray(j, j + 16))
      jointMatrix.mul(inverseBindMatrix, { out: dst })

      // if (skin.skeleton) {
      //   const skeletonNode = scene.nodeMap.get(skin.skeleton)!
      //   const skeletonMatrix = skeletonNode.matrix.invert()!;
      //   skeletonMatrix.mul(dst, { out: dst })
      // }

      // mat4.identity({ out: dst })
    }
    return this.skinningMatrices;
  }
}
