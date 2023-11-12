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

import { Primitive } from './geometry/primitive.mjs';
import { mat4, vec3, quat, Ray, Transform } from '../math/gl-matrix.mjs';

const tmpRayMatrix = new mat4();

type NodeIntersection = {
  node: Node,
  intersection: vec3,
  distance: number,
};

export class Node {
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
  get worldMatrix(): mat4 {
    if (this._dirtyWorldMatrix) {
      this._dirtyWorldMatrix = false;
      const local = this.local.matrix;
      if (this.parent) {
        // TODO: Some optimizations that could be done here if the node matrix
        // is an identity matrix.
        mat4.mul(this._worldMatrix, this.parent.worldMatrix, local);
      } else {
        local.copy({ out: this._worldMatrix });
      }
    }
    return this._worldMatrix;
  }

  visible = true;
  selectable = false;

  private _activeFrameId: number = -1;
  _hoverFrameId: number = -1;

  primitives: Primitive[] = [];

  // private _selectHandler: Function | null = null;
  constructor(public name: string) {
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

    // TODO: primitives

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

  // _hitTestSelectableNode(rigidTransform: XRRigidTransform): vec3 | null {
  //   let localRay = null;
  //   for (let primitive of this._renderPrimitives) {
  //     if (primitive._min) {
  //       if (!localRay) {
  //         mat4.invert(tmpRayMatrix, this.worldMatrix);
  //         mat4.multiply(tmpRayMatrix, tmpRayMatrix, rigidTransform.matrix);
  //         localRay = new Ray(tmpRayMatrix);
  //       }
  //       let intersection = localRay.intersectsAABB(primitive._min, primitive._max);
  //       if (intersection) {
  //         intersection.transformMat4(this.worldMatrix);
  //         return intersection;
  //       }
  //     }
  //   }
  //   for (let child of this.children) {
  //     let intersection = child._hitTestSelectableNode(rigidTransform);
  //     if (intersection) {
  //       return intersection;
  //     }
  //   }
  //   return null;
  // }
  //
  // hitTest(rigidTransform: XRRigidTransform): NodeIntersection | null {
  //   if (this.selectable && this.visible) {
  //     let intersection = this._hitTestSelectableNode(rigidTransform);
  //
  //     if (intersection) {
  //       let ray = new Ray(rigidTransform.matrix);
  //       let origin = vec3.fromValues(ray.origin.x, ray.origin.y, ray.origin.z);
  //       return {
  //         node: this,
  //         intersection: intersection,
  //         distance: vec3.distance(origin, intersection),
  //       };
  //     }
  //     return null;
  //   }
  //
  //   let result = null;
  //   for (let child of this.children) {
  //     let childResult = child.hitTest(rigidTransform);
  //     if (childResult) {
  //       if (!result || result.distance > childResult.distance) {
  //         result = childResult;
  //       }
  //     }
  //   }
  //   return result;
  // }
  //
  // onSelect(value: Function) {
  //   this._selectHandler = value;
  // }
  //
  // get selectHandler() {
  //   return this._selectHandler;
  // }
  //
  // // Called when a selectable node is selected.
  // handleSelect() {
  //   if (this._selectHandler) {
  //     this._selectHandler();
  //   }
  // }
  //
  // // Called when a selectable element is pointed at.
  // onHoverStart() {
  //
  // }
  //
  // // Called when a selectable element is no longer pointed at.
  // onHoverEnd() {
  //
  // }

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
