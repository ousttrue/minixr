import { vec3, mat4 } from '../math/gl-matrix.mjs';
import { Rotater } from '../component/rotater.mjs';
import { World } from '../third-party/uecs-0.4.2/index.mjs';
import { HoverPassive } from '../component/hover.mjs';
import { cubeInstancePrimitive } from './cube-instance.mjs';
import { Animation } from './animation.mjs';


const defaultIndex = 7;
const hoverIndex = 1;

export async function cubeSeaFactory(
  world: World,
  cubeCount: number = 10,
  cubeScale: number = 1.0,
): Promise<void> {

  const [primitive, matricesView, facesView] = cubeInstancePrimitive()
  const matrices = matricesView.array as Float32Array;
  const faces = facesView.array as Float32Array;
  world.create(mat4.identity(), primitive, new Animation([() => {
    matricesView.dirty = true;
  }]));
  primitive.instanceCount = 0;

  function setCubeColor(faceIndex: number, colorIndex: number) {
    faces[faceIndex] = colorIndex;
    faces[faceIndex + 1] = colorIndex;
    faces[faceIndex + 2] = colorIndex;

    faces[faceIndex + 4] = colorIndex;
    faces[faceIndex + 5] = colorIndex;
    faces[faceIndex + 6] = colorIndex;

    facesView.dirty = true;
  }

  let matrixIndex = 0;
  let faceIndex = 0;

  function createHover(faceIndex: number): HoverPassive {
    const hover = new HoverPassive(
      () => {
        setCubeColor(faceIndex, hoverIndex);
      },
      () => {
        setCubeColor(faceIndex, defaultIndex);
      },
    )
    return hover;
  }

  const positions = [
    [0, 0.25, -0.8],
    [0.8, 0.25, 0],
    [0, 0.25, 0.8],
    [-0.8, 0.25, 0],
  ]
  for (let i = 0; i < positions.length; ++i
  ) {
    const pos = positions[i];
    setCubeColor(faceIndex, defaultIndex);

    const matrix = new mat4(matrices.subarray(matrixIndex, matrixIndex + 16))
    mat4.fromScaling(vec3.fromValues(0.1, 0.1, 0.1), { out: matrix })
    matrix.m30 = pos[0]
    matrix.m31 = pos[1]
    matrix.m32 = pos[2]
    matrix.m33 = 1
    world.create(matrix, new Rotater(() => {
    }), createHover(faceIndex));

    ++primitive.instanceCount;
    matrixIndex += 16, faceIndex += 8
  }

  {
    // Build the cube sea
    let halfGrid = cubeCount * 0.5;
    for (let x = 0; x < cubeCount; ++x) {
      for (let y = 0; y < cubeCount; ++y) {
        for (let z = 0; z < cubeCount; ++z) {
          let pos = [x - halfGrid, y - halfGrid, z - halfGrid];
          // Only draw cubes on one side. Useful for testing variable render
          // cost that depends on view direction.
          if (pos[2] > 0) {
            continue;
          }

          // Don't place a cube in the center of the grid.
          if (pos[0] == 0 && pos[1] == 0 && pos[2] == 0) {
            continue;
          }

          setCubeColor(faceIndex, defaultIndex);

          let size = 0.4 * cubeScale;
          const matrix = new mat4(
            matrices.subarray(matrixIndex, matrixIndex + 16))
          mat4.fromScaling(vec3.fromValues(size, size, size), { out: matrix })
          matrix.m30 = pos[0]
          matrix.m31 = pos[1]
          matrix.m32 = pos[2]
          matrix.m33 = 1
          world.create(matrix, createHover(faceIndex));

          ++primitive.instanceCount;
          matrixIndex += 16, faceIndex += 8
        }
      }
    }
  }

  return Promise.resolve();
}
