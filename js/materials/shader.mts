export const VS_UNIFORMS = 'uniform mat4 PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX;'


export const RENDER_ORDER = {
  // Render opaque objects first.
  OPAQUE: 0,

  // Render the sky after all opaque object to save fill rate.
  SKY: 1,

  // Render transparent objects next so that the opaqe objects show through.
  TRANSPARENT: 2,

  // Finally render purely additive effects like pointer rays so that they
  // can render without depth mask.
  ADDITIVE: 3,

  // Render order will be picked based on the material properties.
  DEFAULT: 4,
};


export type ProgramDefine = [string, number];


export type Shader = {
  name: string;
  vertexSource: string;
  fragmentSource: string;
  getProgramDefines?: (attributeMask: number) => ProgramDefine[];
  uniforms?: [string, any][];
}
