import { BitmapFontMaterial } from '../materials/bitmap-font.mjs';
import { Primitive, PrimitiveAttribute } from '../geometry/primitive.mjs';
import { Node } from '../nodes/node.mjs';
import { Component } from '../component/component.mjs';
import { vec3 } from '../../math/gl-matrix.mjs';


const GL = WebGLRenderingContext; // For enums


class TextGrid {
  length = 0;
  fg = 0xFF0000FF;
  bg = 0xFFFF00FF;
  uintView: Uint32Array;

  constructor(private array: Float32Array,
    public cell_width: number = 0.024,
    public cell_height: number = 0.032) {
    this.uintView = new Uint32Array(array.buffer,
      array.byteOffset, array.byteLength / 4);
  }

  puts(x: number, y: number, line: string, option?: { fg: number, bg: number }) {
    let offset = this.length * 8;
    for (const c of line) {
      this.array.set([
        x, y, this.cell_width, this.cell_height,
        c.codePointAt(0)!, 0,
      ], offset);
      this.uintView.set([
        this.fg, this.bg,
      ], offset + 6);

      offset += 8;
      x += this.cell_width;
      this.length += 1;
    }
  }
}


export async function bitmapFontFactory(
): Promise<{ nodes: Node[], components: Component[] }> {

  const material = new BitmapFontMaterial();
  await material.loadTextureAsync();

  // counter clock wise
  const node = new Node('BitmapFont');
  const vertices = new DataView(new Float32Array([
    0, 1, 0, 0,
    0, 0, 0, 1,
    1, 0, 1, 1,
    1, 1, 1, 0,
  ]).buffer);
  const attributes = [
    new PrimitiveAttribute(
      'a_Position', vertices, 2, GL.FLOAT,
      16, 0
    ),
    new PrimitiveAttribute(
      'a_Uv', vertices, 2, GL.FLOAT,
      16, 8
    )]

  const ibo = new Uint16Array([0, 1, 2, /**/ 2, 3, 0]);

  const instances = new Float32Array(65535);
  const instancesView = new DataView(instances.buffer);
  // this.instanceVbo = new Vbo(gl, this.instances, 32);
  const instanceAttributes = [
    new PrimitiveAttribute(
      'i_Cell', instancesView, 4, GL.FLOAT,
      32, 0,
    ),
    new PrimitiveAttribute(
      'i_Unicode_FgBg', instancesView, 4, GL.FLOAT,
      32, 16)
  ];

  const grid = new TextGrid(instances);
  grid.puts(0, 0.1, '0123456789');
  grid.puts(0, 0.2, '~!@#$%^&*()_+=-:;{][]\'"?/<>,.');
  grid.puts(0, 0.3, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  grid.puts(0, 0.4, 'abcdefghijklmnopqrstuvwxyz');

  const primitive = new Primitive(material, attributes, 4, ibo, { instanceAttributes });
  primitive.instanceCount = grid.length;
  node.primitives.push(primitive);

  return Promise.resolve({ nodes: [node], components: [] })
}
