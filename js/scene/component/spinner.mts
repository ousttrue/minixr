import { Component } from './component.mjs';
import { Node } from '../nodes/node.mjs';

export class Spinner extends Component {

  constructor(private readonly _node: Node) {
    super()
  }

  update(timestamp: number, _frameDelta: number,
    _refsp: XRReferenceSpace, _frame: XRFrame) {
    this._node.local.matrix.rotateX(_frameDelta / 1000);
    this._node.local.matrix.rotateY(_frameDelta / 1500);
    this._node.local.invalidate();
  }
}
