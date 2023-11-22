

export const MULTIVIEW_VP = `
uniform mat4 PROJECTION_MATRIX;
uniform mat4 VIEW_MATRIX;

uniform mat4 RIGHT_PROJECTION_MATRIX;
uniform mat4 RIGHT_VIEW_MATRIX;

uniform mat4 MODEL_MATRIX;

mat4 ViewProjection()
{
  return gl_ViewID_OVR == 0u 
    ? (PROJECTION_MATRIX * VIEW_MATRIX)
    : (RIGHT_PROJECTION_MATRIX * RIGHT_VIEW_MATRIX)
  ;
}
`;

export const DEFAULT_VP = `
uniform mat4 PROJECTION_MATRIX;
uniform mat4 VIEW_MATRIX;
uniform mat4 MODEL_MATRIX;

mat4 ViewProjection()
{
  return PROJECTION_MATRIX * VIEW_MATRIX;
}
`;


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


export type UniformDefaultValue = [string, any];
export type UboDefinition = {
  name: string;
  byteLength: number;
};


export type Shader = {
  name: string;
  vertexSource: string;
  fragmentSource: string;
  uniforms?: UniformDefaultValue[];
  ubos?: UboDefinition[],
}
