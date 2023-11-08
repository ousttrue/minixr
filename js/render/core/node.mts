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

import Transform from './transform.mjs';
import { Renderer, RenderPrimitive } from './renderer.mjs'
import { Ray } from '../math/ray.mjs';
import { mat4, vec3, quat } from '../math/gl-matrix.mjs';

let tmpRayMatrix = mat4.create();

type NodeIntersection = {
  node: Node,
  intersection: vec3,
  distance: number,
};

export class Node {
  children: Node[] = [];
  parent: Node | null = null;
  visible: boolean = true;
  selectable: boolean = false;
  local: Transform = new Transform();
  private _activeFrameId: number = -1;
  _hoverFrameId: number = -1;
  private _renderPrimitives: RenderPrimitive[] = [];
  _renderer: Renderer | null = null;
  private _selectHandler: Function | null = null;
  private _worldMatrix: mat4 | null = null;
  private _dirtyWorldMatrix = false;
  constructor(public name: string) {
    this.local.onInvalidated.push(() => {
      this.setMatrixDirty();
    });
  }

  _setRenderer(renderer: Renderer) {
    if (this._renderer == renderer) {
      return;
    }

    if (this._renderer) {
      // Changing the renderer removes any previously attached renderPrimitives
      // from a different renderer.
      this.clearRenderPrimitives();
    }

    this._renderer = renderer;
    if (renderer) {
      this.onRendererChanged(renderer);

      for (let child of this.children) {
        child._setRenderer(renderer);
      }
    }
  }

  onRendererChanged(renderer: Renderer) {
    // Override in other node types to respond to changes in the renderer.
  }

  // Create a clone of this node and all of it's children. Does not duplicate
  // RenderPrimitives, the cloned nodes will be treated as new instances of the
  // geometry.
  clone(): Node {
    let cloneNode = new Node(this.name);
    cloneNode.visible = this.visible;
    cloneNode._renderer = this._renderer;
    cloneNode.local = this.local.clone();

    this.waitForComplete().then(() => {
      for (let primitive of this._renderPrimitives) {
        cloneNode.addRenderPrimitive(primitive);
      }
      for (let child of this.children) {
        cloneNode.addNode(child.clone());
      }
    });

    return cloneNode;
  }

  markActive(frameId: number) {
    this._activeFrameId = frameId;
    for (let primitive of this._renderPrimitives) {
      primitive.markActive(frameId);
    }

    for (let child of this.children) {
      if (child.visible) {
        child.markActive(frameId);
      }
    }
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

    if (this._renderer) {
      value._setRenderer(this._renderer);
    }
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

  setMatrixDirty() {
    if (!this._dirtyWorldMatrix) {
      this._dirtyWorldMatrix = true;
      for (let child of this.children) {
        child.setMatrixDirty();
      }
    }
  }

  get worldMatrix(): mat4 {
    if (!this._worldMatrix) {
      this._dirtyWorldMatrix = true;
      this._worldMatrix = mat4.create();
    }

    if (this._dirtyWorldMatrix) {
      this._dirtyWorldMatrix = false;
      const local = this.local.matrix;
      if (this.parent) {
        // TODO: Some optimizations that could be done here if the node matrix
        // is an identity matrix.
        mat4.mul(this._worldMatrix, this.parent.worldMatrix, local);
      } else {
        this._worldMatrix.copyFrom(local);
      }
    }

    return this._worldMatrix;
  }

  async waitForComplete() {
    let childPromises = [];
    for (let child of this.children) {
      childPromises.push(child.waitForComplete());
    }
    if (this._renderPrimitives) {
      for (let primitive of this._renderPrimitives) {
        childPromises.push(primitive.waitForComplete());
      }
    }
    await Promise.all(childPromises);
  }

  get renderPrimitives() {
    return this._renderPrimitives;
  }

  addRenderPrimitive(primitive: RenderPrimitive) {
    if (!this._renderPrimitives) {
      this._renderPrimitives = [primitive];
    } else {
      this._renderPrimitives.push(primitive);
    }
    primitive._instances.push(this);
  }

  removeRenderPrimitive(primitive: RenderPrimitive) {
    if (!this._renderPrimitives) {
      return;
    }

    let index = this._renderPrimitives.indexOf(primitive);
    if (index > -1) {
      this._renderPrimitives.splice(index, 1);

      index = primitive._instances.indexOf(this);
      if (index > -1) {
        primitive._instances.splice(index, 1);
      }
    }
  }

  clearRenderPrimitives() {
    if (this._renderPrimitives) {
      for (let primitive of this._renderPrimitives) {
        let index = primitive._instances.indexOf(this);
        if (index > -1) {
          primitive._instances.splice(index, 1);
        }
      }
    }
  }

  _hitTestSelectableNode(rigidTransform: XRRigidTransform): vec3 | null {
    let localRay = null;
    for (let primitive of this._renderPrimitives) {
      if (primitive._min) {
        if (!localRay) {
          mat4.invert(tmpRayMatrix, this.worldMatrix);
          mat4.multiply(tmpRayMatrix, tmpRayMatrix, rigidTransform.matrix);
          localRay = new Ray(tmpRayMatrix);
        }
        let intersection = localRay.intersectsAABB(primitive._min, primitive._max);
        if (intersection) {
          intersection.transformMat4(this.worldMatrix);
          return intersection;
        }
      }
    }
    for (let child of this.children) {
      let intersection = child._hitTestSelectableNode(rigidTransform);
      if (intersection) {
        return intersection;
      }
    }
    return null;
  }

  hitTest(rigidTransform: XRRigidTransform): NodeIntersection | null {
    if (this.selectable && this.visible) {
      let intersection = this._hitTestSelectableNode(rigidTransform);

      if (intersection) {
        let ray = new Ray(rigidTransform.matrix);
        let origin = vec3.fromValues(ray.origin.x, ray.origin.y, ray.origin.z);
        return {
          node: this,
          intersection: intersection,
          distance: vec3.distance(origin, intersection),
        };
      }
      return null;
    }

    let result = null;
    for (let child of this.children) {
      let childResult = child.hitTest(rigidTransform);
      if (childResult) {
        if (!result || result.distance > childResult.distance) {
          result = childResult;
        }
      }
    }
    return result;
  }

  onSelect(value: Function) {
    this._selectHandler = value;
  }

  get selectHandler() {
    return this._selectHandler;
  }

  // Called when a selectable node is selected.
  handleSelect() {
    if (this._selectHandler) {
      this._selectHandler();
    }
  }

  // Called when a selectable element is pointed at.
  onHoverStart() {

  }

  // Called when a selectable element is no longer pointed at.
  onHoverEnd() {

  }

  _update(timestamp: number, frameDelta: number) {
    this.onUpdate(timestamp, frameDelta);

    for (let child of this.children) {
      child._update(timestamp, frameDelta);
    }
  }

  // Called every frame so that the nodes can animate themselves
  onUpdate(timestamp: number, frameDelta: number) {

  }
}
