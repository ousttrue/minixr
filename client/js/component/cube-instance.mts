import { Shader } from '../../../lib/materials/shader.mjs';
import { Material } from '../../../lib/materials/material.mjs';
import { vec2, vec3, vec4, mat4 } from '../../../lib/math/gl-matrix.mjs';
import { Mesh, MeshVertexAttribute, SubMesh, Instancing } from '../../../lib/buffer/mesh.mjs';
import { BufferSource } from '../../../lib/buffer/buffersource.mjs';
import { World } from '../../../lib/uecs/index.mjs';
import { AnimationComponent } from '../component/animation.mjs';


const GL = WebGL2RenderingContext;
const CCW = true;

const CubeInstanceShader: Shader = {
  name: "cubes",
  vertexSource: `
in vec4 vPosFace;
in vec4 vUvBarycentric;
in vec4 iRow0;
in vec4 iRow1;
in vec4 iRow2;
in vec4 iRow3;
in vec4 iPositive_xyz_flag;
in vec4 iNegative_xyz_flag;
out vec4 oUvBarycentric;
flat out uvec3 o_Palette_Flag_Flag;

mat4 transform(vec4 r0, vec4 r1, vec4 r2, vec4 r3)
{
  return mat4(
    r0.x, r0.y, r0.z, r0.w,
    r1.x, r1.y, r1.z, r1.w,
    r2.x, r2.y, r2.z, r2.w,
    r3.x, r3.y, r3.z, r3.w
  );
}

void main()
{
    gl_Position = ViewProjection() * MODEL_MATRIX * transform(iRow0, iRow1, iRow2, iRow3) * vec4(vPosFace.xyz, 1);
    oUvBarycentric = vUvBarycentric;
    if(vPosFace.w==0.0)
    {
      o_Palette_Flag_Flag = uvec3(iPositive_xyz_flag.x, 
        iPositive_xyz_flag.w,
        iNegative_xyz_flag.w);
    }
    else if(vPosFace.w==1.0)
    {
      o_Palette_Flag_Flag = uvec3(iPositive_xyz_flag.y, 
        iPositive_xyz_flag.w,
        iNegative_xyz_flag.w);
    }
    else if(vPosFace.w==2.0)
    {
      o_Palette_Flag_Flag = uvec3(iPositive_xyz_flag.z, 
        iPositive_xyz_flag.w,
        iNegative_xyz_flag.w);
    }
    else if(vPosFace.w==3.0)
    {
      o_Palette_Flag_Flag = uvec3(iNegative_xyz_flag.x, 
        iPositive_xyz_flag.w,
        iNegative_xyz_flag.w);
    }
    else if(vPosFace.w==4.0)
    {
      o_Palette_Flag_Flag = uvec3(iNegative_xyz_flag.y, 
        iPositive_xyz_flag.w,
        iNegative_xyz_flag.w);
    }
    else if(vPosFace.w==5.0)
    {
      o_Palette_Flag_Flag = uvec3(iNegative_xyz_flag.z, 
        iPositive_xyz_flag.w,
        iNegative_xyz_flag.w);
    }
    else{
      o_Palette_Flag_Flag = uvec3(0, 
        iPositive_xyz_flag.w,
        iNegative_xyz_flag.w);
    }
}
`,

  fragmentSource: `
precision mediump float;
precision highp sampler2DArray;

in vec4 oUvBarycentric;
flat in uvec3 o_Palette_Flag_Flag;
out vec4 FragColor;
layout (std140) uniform palette { 
  vec4 colors[32];
  vec4 textures[32];
} Palette;

uniform sampler2DArray sampler;

// https://github.com/rreusser/glsl-solid-wireframe
float grid (vec2 vBC, float width) {
  vec3 bary = vec3(vBC.x, vBC.y, 1.0 - vBC.x - vBC.y);
  vec3 d = fwidth(bary);
  vec3 a3 = smoothstep(d * (width - 0.5), d * (width + 0.5), bary);
  return min(a3.x, a3.y);
}

void main()
{
    vec4 border = vec4(vec3(grid(oUvBarycentric.zw, 1.0)), 1);
    uint index = o_Palette_Flag_Flag.x;
    vec4 color = Palette.colors[index];

    // float textureIndex=Palette.textures[index].x;
    // vec4 texel = texture(sampler, vec3(oUvBarycentric.xy, textureIndex));
    vec4 texel = vec4(1,1,1,1);
    FragColor = texel * color * border;
}
`,

}


class CubeMaterial extends Material {
  colors: Float32Array;
  textures: Float32Array;
  constructor() {
    super("cubes", CubeInstanceShader);

    const values = new Float32Array(64 * 4);
    this.colors = values.subarray(0, 32 * 4);
    this.textures = values.subarray(32 * 4, 64 * 4);
    this.textures.fill(-1);
    this.defineUbo('palette', values.buffer);
  }

  setPaletteColor(i: number, rgba: number[]) {
    const index = i * 4;
    this.colors[index] = rgba[0];
    this.colors[index + 1] = rgba[1];
    this.colors[index + 2] = rgba[2];
    this.colors[index + 3] = rgba[3];
  }
}


//   7+-+3
//   / /|
// 6+-+2|
//  |4+-+0
//  |/ /
// 5+-+1
//
//   Y
//   A
//   +-> X
//  /
// L
//
type Uv = [number, number];
type Face = {
  indices: [number, number, number, number];
  uv: [Uv, Uv, Uv, Uv];
};

// CCW
const cube_faces: Face[] = [
  // x+
  {
    indices: [2, 1, 0, 3],
    uv: [[1, 0], [1, 1], [2, 1], [2, 0]],
  },
  // y+
  {
    indices: [2, 3, 7, 6],
    uv: [[1, 0], [1, -1], [0, -1], [0, 0]],
  },
  // z+
  {
    indices: [2, 6, 5, 1],
    uv: [[1, 0], [0, 0], [0, 1], [1, 1]],
  },
  // x-
  {
    indices: [4, 5, 6, 7],
    uv: [[-1, 1], [0, 1], [0, 0], [-1, 0]],
  },
  // y-
  {
    indices: [4, 0, 1, 5],
    uv: [[0, 2], [1, 2], [1, 1], [0, 1]],
  },
  // z-
  {
    indices: [4, 7, 3, 0],
    uv: [[0, 1], [0, 0], [1, 0], [1, 1]],
  },
];

type Vertex = {
  PositionFace: vec4;
  UvBarycentric: vec4;
};

class Builder {
  vertices: number[] = []
  indices: number[] = []

  constructor(private readonly CCW: boolean) {
  }

  Vertex(
    pos: [number, number, number, number],
    uv: [number, number, number, number]) {
    this.vertices.push(...pos)
    this.vertices.push(...uv)
  }

  Quad(face: number,
    p0: [number, number, number], uv0: [number, number],
    p1: [number, number, number], uv1: [number, number],
    p2: [number, number, number], uv2: [number, number],
    p3: [number, number, number], uv3: [number, number]) {
    // 01   00
    //  3+-+2
    //   | |
    //  0+-+1
    // 00   10
    const index = this.vertices.length / 8;
    this.Vertex([p0[0], p0[1], p0[2], face], [uv0[0], uv0[1], 1, 0]);
    this.Vertex([p1[0], p1[1], p1[2], face], [uv1[0], uv1[1], 0, 0]);
    this.Vertex([p2[0], p2[1], p2[2], face], [uv2[0], uv2[1], 0, 1]);
    this.Vertex([p3[0], p3[1], p3[2], face], [uv3[0], uv3[1], 0, 0]);

    if (CCW) {
      // 0, 1, 2
      this.indices.push(index);
      this.indices.push(index + 1);
      this.indices.push(index + 2);
      // 2, 3, 0
      this.indices.push(index + 2);
      this.indices.push(index + 3);
      this.indices.push(index);
    } else {
      // 0, 3, 2
      this.indices.push(index);
      this.indices.push(index + 3);
      this.indices.push(index + 2);
      // 2, 1, 0
      this.indices.push(index + 2);
      this.indices.push(index + 1);
      this.indices.push(index);
    }
  }
};


function position_uv(isCCW: boolean): [Float32Array, Uint16Array] {
  const s = 0.5;
  const positions: [number, number, number][] = [
    [+s, -s, -s], //
    [+s, -s, +s], //
    [+s, +s, +s], //
    [+s, +s, -s], //
    [-s, -s, -s], //
    [-s, -s, +s], //
    [-s, +s, +s], //
    [-s, +s, -s], //
  ];

  const builder = new Builder(isCCW);
  let f = 0;
  for (const face of cube_faces) {
    builder.Quad(f++,
      positions[face.indices[0]],
      face.uv[0],
      positions[face.indices[1]],
      face.uv[1],
      positions[face.indices[2]],
      face.uv[2],
      positions[face.indices[3]],
      face.uv[3]);
  }
  return [
    new Float32Array(builder.vertices),
    new Uint16Array(builder.indices),
  ];
}


export function cubeInstancePrimitive(cubes: number, isCCW: boolean = true):
  [Mesh, BufferSource, BufferSource] {
  const [vertices, indices] = position_uv(isCCW);
  const view = new BufferSource(8, vertices);

  const attributes: MeshVertexAttribute[] = [
    new MeshVertexAttribute("vPosFace",
      view, 4, GL.FLOAT, 32, 0),
    new MeshVertexAttribute("vUvBarycentric",
      view, 4, GL.FLOAT, 32, 16),
  ];

  const matrixArray = new Float32Array(16 * cubes);
  const matrixArrayView = new BufferSource(4, matrixArray, GL.DYNAMIC_DRAW);

  const faceInfoArray = new Float32Array(8 * cubes);
  const faceInfoArrayView = new BufferSource(4, faceInfoArray);

  const instanceAttributes: MeshVertexAttribute[] = [
    new MeshVertexAttribute("iRow0",
      matrixArrayView, 4, GL.FLOAT, 64, 0),
    new MeshVertexAttribute("iRow1",
      matrixArrayView, 4, GL.FLOAT, 64, 16),
    new MeshVertexAttribute("iRow2",
      matrixArrayView, 4, GL.FLOAT, 64, 32),
    new MeshVertexAttribute("iRow3",
      matrixArrayView, 4, GL.FLOAT, 64, 48),
    //     //
    new MeshVertexAttribute("iPositive_xyz_flag",
      faceInfoArrayView, 4, GL.FLOAT, 32, 0),
    new MeshVertexAttribute("iNegative_xyz_flag",
      faceInfoArrayView, 4, GL.FLOAT, 32, 16),
  ];


  // palette
  const material = new CubeMaterial();
  const Red = [1, 0, 0, 1];
  const Green = [0, 1, 0, 1];
  const Blue = [0, 0, 1, 1];
  const DarkRed = [0.5, 0, 0, 1];
  const DarkGreen = [0, 0.5, 0, 1];
  const DarkBlue = [0, 0, 0.5, 1];
  const Magenta = [1, 0, 1, 1];
  const White = [0.8, 0.8, 0.9, 1];
  const Black = [0, 0, 0, 1];
  // error
  material.setPaletteColor(0, Magenta);
  //
  material.setPaletteColor(1, Red);
  material.setPaletteColor(2, Green);
  material.setPaletteColor(3, Blue);
  material.setPaletteColor(4, DarkRed);
  material.setPaletteColor(5, DarkGreen);
  material.setPaletteColor(6, DarkBlue);
  material.setPaletteColor(7, White);
  material.setPaletteColor(8, Black);

  const mesh = new Mesh(
    attributes, vertices.length / 8,
    [new SubMesh(material, indices.length)],
    new BufferSource(1, indices),
    new Instancing(instanceAttributes)
  );

  mesh.uboMap.set('palette', new ArrayBuffer(4 * 4 * (32 + 32)));

  return [mesh, matrixArrayView, faceInfoArrayView];
}


export class CubeInstancing {
  matrixIndex = 0;
  faceIndex = 0;
  primitive: Mesh;
  instancing: Instancing;
  matricesView: BufferSource;
  facesView: BufferSource;
  matrices: Float32Array;
  faces: Float32Array;

  private _newIndex = 0;

  constructor(cubes: number, world: World) {
    [this.primitive, this.matricesView, this.facesView] = cubeInstancePrimitive(cubes)
    this.instancing = this.primitive.instancing!;
    this.matrices = this.matricesView.array as Float32Array;
    this.faces = this.facesView.array as Float32Array;
    world.create(mat4.identity(), this.primitive, new AnimationComponent([() => {
      this.matricesView.dirty = true;
    }]));
    this.instancing.instanceCount = 0;
  }

  newInstance(): [number, mat4] {
    const index = this._newIndex++;
    const matrixIndex = index * 16;
    this.instancing.instanceCount = this._newIndex;
    return [index, new mat4(this.matrices.subarray(matrixIndex, matrixIndex + 16))]
  }

  setCubeColor(cubeIndex: number, colorIndex: number) {
    const faceIndex = cubeIndex * 8;
    this.faces[faceIndex] = colorIndex;
    this.faces[faceIndex + 1] = colorIndex;
    this.faces[faceIndex + 2] = colorIndex;

    this.faces[faceIndex + 4] = colorIndex;
    this.faces[faceIndex + 5] = colorIndex;
    this.faces[faceIndex + 6] = colorIndex;

    this.facesView.dirty = true;
  }
}
