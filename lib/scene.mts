import { World } from '../lib/uecs/index.mjs';
import { vec3, quat, mat4 } from '../lib/math/gl-matrix.mjs';
import type { BufferSourceArray } from '../lib/buffer/buffersource.mts';
import { Animation } from '../lib/animation.mjs';
const tmp = new mat4();
import { Glb } from '../lib/glb.mjs';
import { Gltf2Loader } from '../lib/gltf2-loader.mjs';


class TRSNode {
  t: vec3 = vec3.fromValues(0, 0, 0);
  r: quat = quat.fromValues(0, 0, 0, 1);
  s: vec3 = vec3.fromValues(1, 1, 1);
  children: TRSNode[] = []
  constructor(
    public readonly matrix: mat4,
  ) { }

  updateRecursive(parent?: mat4) {
    mat4.fromTRS(this.t, this.r, this.s, { out: this.matrix })
    if (parent) {
      parent.mul(this.matrix, { out: this.matrix })
    }
    for (const child of this.children) {
      child.updateRecursive(this.matrix);
    }
  }
}

type TimeRange = {
  index: number;
  ratio: number;
}

class InputCurve {
  input: Float32Array;
  constructor(
    public readonly _input: BufferSourceArray,
  ) {
    if (!(_input instanceof Float32Array)) {
      throw new Error("input type error");
    }
    this.input = _input;
  }

  getIndex(time: number, componentCount: number): number {
    if (time < this.input[0]) {
      return this.input[0] * componentCount;
    }
    else if (time > this.input[this.input.length - 1]) {
      return this.input[this.input.length - 1] * componentCount;
    }
    for (const v of this.input) {
      if (v > time) {
        return v * componentCount;
      }
    }
    throw new Error("invalid");
  }

  getRange(time: number, componentCount: number): number | TimeRange {
    if (time <= this.input[0]) {
      return 0;
    }
    if (time >= this.input[this.input.length - 1]) {
      return (this.input.length - 1) * componentCount;
    }

    let end = this.input[0];
    for (let i = 0; i < this.input.length - 1; ++i) {
      const begin = end;
      end = this.input[i + 1];
      if (end >= time) {
        return {
          index: i * componentCount,
          ratio: (time - begin) / (end - begin)
        }
      }
    }
    throw new Error("invalid");
  }

  get lastTime(): number {
    return this.input[this.input.length - 1];
  }
}

function lerp(b: number, e: number, r: number) {
  return b + (e - b) * r;
}


class Vec3Curve {
  input: InputCurve;
  output: Float32Array;
  constructor(
    public readonly _input: BufferSourceArray,
    public readonly _output: BufferSourceArray
  ) {
    this.input = new InputCurve(_input);
    if (!(_output instanceof Float32Array)) {
      throw new Error("output type error");
    }
    if (_input.length * 3 != _output.length) {
      throw new Error("invalid length");
    }
    this.output = _output;
  }

  get(time: number): Float32Array | [number, number, number] {
    const t = this.input.getRange(time, 3);
    if (typeof (t) == 'number') {
      return this.output.subarray(t, t + 3);
    }
    const { index, ratio } = t;
    const values = this.output.subarray(index, index + 6);
    return [
      lerp(values[0], values[3], ratio),
      lerp(values[1], values[4], ratio),
      lerp(values[2], values[5], ratio),
    ];
  }
}


class QuatCurve {
  input: InputCurve;
  output: Float32Array;
  tmp = new quat();
  constructor(
    public readonly _input: BufferSourceArray,
    public readonly _output: BufferSourceArray
  ) {
    this.input = new InputCurve(_input);
    if (!(_output instanceof Float32Array)) {
      throw new Error("output type error");
    }
    if (_input.length * 4 != _output.length) {
      throw new Error("invalid length");
    }
    this.output = _output;
  }

  get(time: number): Float32Array {
    const t = this.input.getRange(time, 4);
    if (typeof (t) == 'number') {
      return this.output.subarray(t, t + 4);
    }
    const { index, ratio } = t;
    const b = this.output.subarray(index, index + 4);
    const e = this.output.subarray(index + 4, index + 8);
    new quat(b).slerp(new quat(e), ratio, { out: this.tmp })
    return this.tmp.array;
  }
}


class NodeAnimation {
  translation: Vec3Curve | null = null;
  rotation: QuatCurve | null = null;
  scale: Vec3Curve | null = null;

  updateLocalValue(time: number, node: TRSNode) {
    if (this.translation) {
      const value = this.translation.get(time);
      node.t.array.set(value);
    }
    if (this.rotation) {
      const value = this.rotation.get(time);
      node.r.array.set(value);
    }
    if (this.scale) {
      const value = this.scale.get(time);
      node.s.array.set(value);
    }
  }

  get lastTime(): number {
    let endTime = 0;
    if (this.translation) {
      const lastTime = this.translation.input.lastTime;
      if (lastTime > endTime) {
        endTime = lastTime;
      }
    }
    if (this.rotation) {
      const lastTime = this.rotation.input.lastTime;
      if (lastTime > endTime) {
        endTime = lastTime;
      }
    }
    if (this.scale) {
      const lastTime = this.scale.input.lastTime;
      if (lastTime > endTime) {
        endTime = lastTime;
      }
    }
    return endTime;
  }
}


class SceneAnimation {
  endTime = 0;
  constructor(
    public readonly nodeAnimationMap: Map<number, NodeAnimation>,
    public readonly nodeMap: Map<number, TRSNode>,
    public readonly root: TRSNode,
  ) {
    nodeAnimationMap.forEach((value: NodeAnimation) => {

      const lastTime = value.lastTime;
      if (lastTime > this.endTime) {
        this.endTime = lastTime;
      }

    });

    console.log(this.endTime);
  }

  update(time: number) {
    while (time > this.endTime) {
      // loop
      time -= this.endTime;
    }

    this.nodeAnimationMap.forEach((value, key) => {
      value.updateLocalValue(time, this.nodeMap.get(key)!);
    });
    this.root.updateRecursive();
  }
}


export class Scene {
  world = new World();
  root = new TRSNode(mat4.identity());
  nodeMap: Map<number, TRSNode> = new Map();
  startTime = Date.now();

  constructor(
    public readonly glb: Glb,
    public readonly loader: Gltf2Loader,
  ) {
  }

  get timeSeconds(): number {
    const t = Date.now() - this.startTime;
    // ms to seconds
    return t * 0.001;
  }

  async load() {
    const gltf = this.glb.json;
    if (gltf.scenes) {
      for (const scene of gltf.scenes) {
        if (scene.nodes) {
          for (const i of scene.nodes) {
            this.root.children.push(this.loadNode(i));
          }
        }
      }
    }

    if (gltf.animations) {
      for (const animation of gltf.animations) {
        const nodeAnimationMap: Map<number, NodeAnimation> = new Map();

        function getOrCreateNodeAnimation(node?: number): NodeAnimation {
          if (node == null) {
            throw new Error(`no node`);
          }
          {
            const animation = nodeAnimationMap.get(node);
            if (animation) {
              return animation;
            }
          }
          {
            const animation = new NodeAnimation();
            nodeAnimationMap.set(node, animation);
            return animation;
          }
        }

        for (const channel of animation.channels) {
          // if (channel.target.path == 'translation') {
          //   const nodeAnimation = getOrCreateNodeAnimation(channel.target.node);
          //   const sampler = animation.samplers[channel.sampler];
          //   const inputAccessor = this.glb.json.accessors![sampler.input];
          //   const input = await this.loader.bufferSourceFromAccessor(inputAccessor);
          //   const ouputAccessor = this.glb.json.accessors![sampler.output];
          //   const output = await this.loader.bufferSourceFromAccessor(ouputAccessor);
          //   nodeAnimation.translation = new Vec3Curve(input.array, output.array);
          // } else
          if (channel.target.path == 'rotation') {
            const nodeAnimation = getOrCreateNodeAnimation(channel.target.node);
            const sampler = animation.samplers[channel.sampler];
            const inputAccessor = this.glb.json.accessors![sampler.input];
            const input = await this.loader.bufferSourceFromAccessor(inputAccessor);
            const ouputAccessor = this.glb.json.accessors![sampler.output];
            const output = await this.loader.bufferSourceFromAccessor(ouputAccessor);
            nodeAnimation.rotation = new QuatCurve(input.array, output.array);
          }
          // if (channel.target.path == 'scale') {
          //   const nodeAnimation = getOrCreateNodeAnimation(channel.target.node);
          //   const sampler = animation.samplers[channel.sampler];
          //   const inputAccessor = this.glb.json.accessors![sampler.input];
          //   const input = await this.loader.bufferSourceFromAccessor(inputAccessor);
          //   const ouputAccessor = this.glb.json.accessors![sampler.output];
          //   const output = await this.loader.bufferSourceFromAccessor(ouputAccessor);
          //   nodeAnimation.scale = new Vec3Curve(input.array, output.array);
          // }
          else {
            throw new Error(`${channel.target.path} not implemented`);
          }
        }

        console.log(nodeAnimationMap);

        const sceneAnimation = new SceneAnimation(
          nodeAnimationMap,
          this.nodeMap,
          this.root,
        );

        this.world.create(new Animation((time) => sceneAnimation.update(time)));
      }
    }
  }

  loadNode(i: number, parent?: mat4): TRSNode {
    const gltf = this.glb.json;
    if (!gltf.nodes) {
      throw new Error("no nodes");
    }
    const node = gltf.nodes[i];

    const matrix = mat4.identity();
    const trsNode = new TRSNode(matrix);
    this.nodeMap.set(i, trsNode);
    if (node.matrix) {
      matrix.array.set(node.matrix);
    }
    else {
      if (node.translation) {
        trsNode.t.array.set(node.translation);
      }
      if (node.rotation) {
        trsNode.r.array.set(node.rotation);
      }
      if (node.scale) {
        trsNode.s.array.set(node.scale);
      }
      mat4.fromTRS(trsNode.t, trsNode.r, trsNode.s, { out: matrix })
    }
    if (parent) {
      parent.mul(matrix, { out: matrix })
    }

    if (node.mesh != null) {
      const mesh = this.loader.meshes[node.mesh]
      this.world.create(matrix, mesh);
      // console.log(i, mesh);
    }
    if (node.children) {
      for (const child of node.children) {
        trsNode.children.push(this.loadNode(child, matrix));
      }
    }
    return trsNode;
  }
}
