import type * as GLTF2 from './GLTF.js';


const GLB_MAGIC = 0x46546C67;
const CHUNK_TYPE = {
  JSON: 0x4E4F534A,
  BIN: 0x004E4942,
};

export class Glb {
  constructor(
    public readonly json: GLTF2.GlTf,
    public readonly bin: Uint8Array | null = null,
  ) {
  }

  static parse(bytes: ArrayBuffer): Glb {
    const headerView = new DataView(bytes, 0, 12);
    const magic = headerView.getUint32(0, true);
    const version = headerView.getUint32(4, true);
    const length = headerView.getUint32(8, true);

    if (magic != GLB_MAGIC) {
      throw new Error('Invalid magic string in binary header.');
    }

    if (version != 2) {
      throw new Error('Incompatible version in binary header.');
    }

    let jsonChunk: Uint8Array | null = null;
    let binChunk: Uint8Array | null = null;
    let chunkOffset = 12;
    while (chunkOffset < length) {
      const chunkHeaderView = new DataView(bytes, chunkOffset, 8);
      const chunkLength = chunkHeaderView.getUint32(0, true);
      const chunkType = chunkHeaderView.getUint32(4, true);
      const chunk = new Uint8Array(bytes).subarray(chunkOffset + 8, chunkOffset + 8 + chunkLength);
      switch (chunkType) {
        case CHUNK_TYPE.JSON:
          jsonChunk = chunk;
          break;
        case CHUNK_TYPE.BIN:
          binChunk = chunk;
          break;
        default:
          console.warn(`unknown chunk: ${chunkType}`);
          break;
      }
      chunkOffset += chunkLength + 8;
    }

    if (!jsonChunk) {
      throw new Error('File contained no json chunk.');
    }

    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(jsonChunk);
    const json = JSON.parse(jsonString);

    return new Glb(json, binChunk);
  }
}
