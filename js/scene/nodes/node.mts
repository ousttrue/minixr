// Copyright 2018 The Immersive Web Community Group
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Primitive } from '../geometry/primitive.mjs';
import { mat4, vec3, quat, Ray, Transform } from '../../math/gl-matrix.mjs';

export type ActionType = 'active' | 'passive';

export class Node extends EventTarget {
  visible = true;
  action: ActionType | null = null;

  children: Node[] = [];
  parent: Node | null = null;
  local: Transform = new Transform();
  private _worldMatrix = mat4.identity();
  private _dirtyWorldMatrix = false;
  setMatrixDirty() {
    if (!this._dirtyWorldMatrix) {
      this._dirtyWorldMatrix = true;
      for (let child of this.children) {
        child.setMatrixDirty();
      }
    }
  }

  toString(): string {
    return `[node: ${this.name}]`;
  }

  get worldMatrix(): mat4 {
    if (this._dirtyWorldMatrix) {
      this._dirtyWorldMatrix = false;
      const local = this.local.matrix;
      if (this.parent) {
        // TODO: Some optimizations that could be done here if the node matrix
        // is an identity matrix.
        this.parent.worldMatrix.mul(local, { out: this._worldMatrix });
      } else {
        local.copy({ out: this._worldMatrix });
      }
    }
    return this._worldMatrix;
  }

  primitives: Primitive[] = [];

  constructor(public name: string) {
    super();

    this.local.onInvalidated.push(() => {
      this.setMatrixDirty();
    });
  }

  // Create a clone of this node and all of it's children. Does not duplicate
  // RenderPrimitives, the cloned nodes will be treated as new instances of the
  // geometry.
  clone(): Node {
    const cloneNode = new Node(this.name);
    cloneNode.visible = this.visible;
    cloneNode.local = this.local.clone();
    cloneNode.primitives = this.primitives.map(x => x);
    for (let child of this.children) {
      cloneNode.addNode(child.clone());
    }
    return cloneNode;
  }

  addNode(value: Node) {
    if (!value || value.parent == this) {
      return;
    }

    if (value.parent) {
      value.parent.removeNode(value);
    }
    value.parent = this;

    this.children.push(value);
  }

  removeNode(value: Node) {
    let i = this.children.indexOf(value);
    if (i > -1) {
      this.children.splice(i, 1);
      value.parent = null;
    }
  }

  clearNodes() {
    for (let child of this.children) {
      child.parent = null;
    }
    this.children = [];
  }

  update(timestamp: number, frameDelta: number,
    refspace: XRReferenceSpace, frame: XRFrame,
    inputSources: XRInputSourceArray) {
    this._onUpdate(timestamp, frameDelta, refspace, frame, inputSources);
    for (let child of this.children) {
      child.update(timestamp, frameDelta, refspace, frame, inputSources);
    }
  }

  // Called every frame so that the nodes can animate themselves
  protected _onUpdate(_timestamp: number, _frameDelta: number,
    _refsp: XRReferenceSpace, _frame: XRFrame, _inputSources: XRInputSourceArray) {

  }
}

