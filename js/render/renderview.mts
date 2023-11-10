import { mat4 } from '../math/gl-matrix.mjs';

export class RenderView {
  viewport: XRViewport | null = null;
  eyeIndex: number = 0;
  constructor(
    public projectionMatrix: mat4,
    public viewMatrix: mat4,
    public eye: XREye = 'left'
  ) {
    this.eyeIndex = eye == 'left' ? 0 : 1;
  }

  static fromXRView(view: XRView): RenderView {
    return new RenderView(
      new mat4(view.projectionMatrix),
      new mat4(view.transform.inverse.matrix),
      view.eye
    );
  }
}
