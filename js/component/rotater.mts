// @ts-check
import { Component } from './component.mjs';
import { Node } from '../scene/nodes/node.mjs';
import { vec3, mat4 } from '../math/gl-matrix.mts';

export class Rotater extends Component {

  constructor(private readonly _node: Node) {
    super()
  }

  update(timestamp: number, _frameDelta: number,
    _refsp: XRReferenceSpace, _frame: XRFrame) {
    // if (this.autoRotate) {
    //   const matrix = this.cubeSeaNode.local.matrix;
    //   mat4.fromRotation(timestamp / 500, vec3.fromValues(0, -1, 0), { out: matrix });
    //   this.cubeSeaNode.local.invalidate();
    // }

    // for (const heroNode of this.heroNodes) {
    const matrix = this._node.local.matrix;
    mat4.fromRotation(timestamp / 2000, vec3.fromValues(0, 1, 0), { out: matrix });
    this._node.local.invalidate();
    // }
  }
}
