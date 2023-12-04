import { vec3 } from './vec3.mjs';
import { mat4 } from './mat4.mjs';


export class PerspectiveProjection {
  constructor(public readonly matrix: mat4,
    public fovy = (30.0 / 180.0) * 3.14,
    public zNear = 0.01,
    public zFar = 100.0,
    public width = 300.0,
    public height = 300.0,
  ) {
    this.update();
  }

  update() {
    const aspect = this.width / this.height;
    mat4.perspective(this.fovy, aspect,
      this.zNear, this.zFar, { out: this.matrix });
    console.log(this.matrix);
    // mat4.identity({out: this.matrix})
  }

  resize(width: number, height: number) {
    if (width == this.width && height == this.height) {
      return;
    }
    this.width = width;
    this.height = height;
    this.update();
  }
}


export class OrbitView {

  yawMatrix = new mat4();
  pitchMatrix = new mat4();

  constructor(public readonly matrix: mat4,
    public readonly position = vec3.fromValues(0, 0, 0),
    public pitch = 0,
    public yaw = 0,
  ) {
    this.update();
  }

  update() {
    mat4.fromXRotation(this.pitch, { out: this.pitchMatrix })
    mat4.fromYRotation(this.yaw, { out: this.yawMatrix })

    this.pitchMatrix.mul(this.yawMatrix, { out: this.matrix })
    this.matrix.m30 = -this.position.x;
    this.matrix.m31 = -this.position.y;
    this.matrix.m32 = -this.position.z;
  }

  rotate(dx: number, dy: number) {
    const LOOK_SPEED = -0.01;
    this.yaw -= dx * LOOK_SPEED;
    this.pitch -= dy * LOOK_SPEED;
    this.update();
  }

  shift(dx: number, dy: number) {
    const d = -0.005;
    {
      this.position.x += dx * d;
    }
    {
      this.position.y -= dy * d;
    }
    this.update();
  }

  dolly(delta: number) {
    let d = 0.1;
    if (delta > 0) {
      d = -d;
    }
    else if (delta < 0) {
    }
    else {
      // 0
      return;
    }
    this.position.z -= d;
    this.update();
  }
}
