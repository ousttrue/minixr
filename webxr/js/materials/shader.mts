// export class ProgramFactory {
//   private _programCache: { [key: string]: Program } = {};
//   private _uboMap: Map<Material, UboMap> = new Map();
//
//   constructor(
//     private readonly gl: WebGL2RenderingContext,
//     private readonly multiview: boolean,
//   ) {
//   }
//
//   getOrCreateUbo(gl: WebGL2RenderingContext,
//     program: Program, material: Material): UboMap {
//     let uboMap = this._uboMap.get(material);
//     if (uboMap) {
//       return uboMap;
//     }
//
//     uboMap = {}
//     if (material._uboMap) {
//       for (const name in material._uboMap) {
//         const ubo = new Ubo(gl, material._uboMap[name]);
//         uboMap[name] = ubo;
//       }
//     }
//     this._uboMap.set(material, uboMap);
//     return uboMap;
//   }
//
//   getOrCreateProgram(gl: WebGL2RenderingContext, primitive: Mesh, submesh: SubMesh): [Program, UboMap] {
//     const material = submesh.material;
//
//     // determine shader defines by material & primitive combination 
//     const attributeMask = getAttributeMask(primitive.attributes);
//     const defines = material.getProgramDefines(attributeMask);
//     let key = this._getProgramKey(material.shader.name, defines);
//
//     let program = this._programCache[key];
//     if (!program) {
//       program = new Program(this.gl,
//         key, material.shader, defines, this.multiview);
//       this._programCache[key] = program;
//     }
//
//     const uboMap = this.getOrCreateUbo(gl, program, submesh.material);
//
//     return [program, uboMap];
//   }
//
//   private _getProgramKey(name: string, defines: ProgramDefine[]) {
//     if (!name) {
//       throw new Error('no material name');
//     }
//     let str = `${name}:`;
//     for (const [key, value] of defines) {
//       str += `${key}=${value},`;
//     }
//     return str;
//   }
// }
export type Shader = {
  name: string;
  vertexSource: string;
  fragmentSource: string;
  uniforms?: UniformDefaultValue[];
  ubos?: UboDefinition[],
}
