import { Component } from './component.mjs';
import { Node } from '../nodes/node.mjs';
import { vec3, mat4 } from '../../math/gl-matrix.mts';

export class Rotater extends Component {

  constructor(private readonly _node: Node) {
    super()
  }

  update(timestamp: number, _frameDelta: number,
    _refsp: XRReferenceSpace, _frame: XRFrame) {
    const matrix = this._node.local.matrix;
    mat4.fromRotation(timestamp / 2000, vec3.fromValues(0, 1, 0), { out: matrix });
    this._node.local.invalidate();
  }
}
