import { mat4 } from './mat4.mjs';


export class Camera {
  view = mat4.identity();
  projection = mat4.identity();

  public constructor(
    public x: number,
    public y: number,
    public z: number,
    public fovy = 30 / 180 * 3.14,
    public zNear = 0.01,
    public zFar = 100,
    public width = 300,
    public height = 300,
  ) {
    mat4.fromTranslation(x, y, z, { out: this.view }),
      this._updateProjection();
  }

  private _updateProjection() {
    const aspect = this.width / this.height;
    mat4.perspective(this.fovy, aspect,
      this.zNear, this.zFar, { out: this.projection });
  }

  resize(width: number, height: number) {
    if (width == this.width && height == this.height) {
      return;
    }
    this.width = width;
    this.height = height;
    this._updateProjection();
  }
}
