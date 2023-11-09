import { PbrMaterial } from './pbr.mjs';
import { Program } from './program.mjs';
import { ATTRIB, ATTRIB_MASK } from './material.mjs';


const PRECISION_REGEX = new RegExp('precision (lowp|mediump|highp) float;');

const VERTEX_SHADER_SINGLE_ENTRY = `
uniform mat4 PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX;

void main() {
  gl_Position = vertex_main(PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX);
}
`;

const VERTEX_SHADER_MULTI_ENTRY = `
uniform mat4 LEFT_PROJECTION_MATRIX, LEFT_VIEW_MATRIX, RIGHT_PROJECTION_MATRIX, RIGHT_VIEW_MATRIX, MODEL_MATRIX;
void main() {
  gl_Position = vertex_main(LEFT_PROJECTION_MATRIX, LEFT_VIEW_MATRIX, RIGHT_PROJECTION_MATRIX, RIGHT_VIEW_MATRIX, MODEL_MATRIX);
}
`;

const FRAGMENT_SHADER_ENTRY = `
void main() {
  gl_FragColor = fragment_main();
}
`;

const FRAGMENT_SHADER_MULTI_ENTRY = `
out vec4 color;
void main() {
  color = fragment_main();
}
`;

export class MaterialFactory {
  private _programCache: { [key: string]: Program } = {};
  private _defaultFragPrecision: string;

  constructor(
    private _gl: WebGL2RenderingContext,
    private _multiview: boolean
  ) {
    const gl = this._gl;
    const fragHighPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    this._defaultFragPrecision = fragHighPrecision!.precision > 0 ? 'highp' : 'mediump';
  }

  private _getProgramKey(name: string, defines: any) {
    let key = `${name}:`;
    for (let define in defines) {
      key += `${define}=${defines[define]},`;
    }
    return key;
  }

  getMaterialProgram(material: PbrMaterial, renderPrimitive: RenderPrimitive): Program {
    let materialName = material.materialName;
    let vertexSource = (!this._multiview) ? material.vertexSource : material.vertexSourceMultiview;
    let fragmentSource = (!this._multiview) ? material.fragmentSource : material.fragmentSourceMultiview;

    // These should always be defined for every material
    if (materialName == null) {
      throw new Error('Material does not have a name');
    }
    if (vertexSource == null) {
      throw new Error(`Material "${materialName}" does not have a vertex source`);
    }
    if (fragmentSource == null) {
      throw new Error(`Material "${materialName}" does not have a fragment source`);
    }

    let defines = material.getProgramDefines(renderPrimitive);
    let key = this._getProgramKey(materialName, defines);

    if (key in this._programCache) {
      return this._programCache[key];
    }

    let fullVertexSource = vertexSource;
    fullVertexSource += this._multiview ? VERTEX_SHADER_MULTI_ENTRY :
      VERTEX_SHADER_SINGLE_ENTRY;

    let precisionMatch = fragmentSource.match(PRECISION_REGEX);
    let fragPrecisionHeader = precisionMatch ? '' : `precision ${this._defaultFragPrecision} float;\n`;

    let fullFragmentSource = fragPrecisionHeader + fragmentSource;
    fullFragmentSource += this._multiview ? FRAGMENT_SHADER_MULTI_ENTRY :
      FRAGMENT_SHADER_ENTRY

    let program = new Program(this._gl, fullVertexSource, fullFragmentSource, ATTRIB, defines);
    this._programCache[key] = program;

    program.onNextUse((program: Program) => {
      // Bind the samplers to the right texture index. This is constant for
      // the lifetime of the program.
      for (let i = 0; i < material._samplers.length; ++i) {
        let sampler = material._samplers[i];
        let uniform = program.uniform[sampler._uniformName];
        if (uniform) {
          this._gl.uniform1i(uniform, i);
        }
      }
    });

    return program;
  }
}

