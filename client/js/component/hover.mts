import { vec3, mat4 } from '../../../lib/math/gl-matrix.mjs';
import { World, Entity } from '../third-party/uecs-0.4.2/index.mjs';
import { Shader } from '../../../lib/materials/shader.mjs';
import { Material, MaterialUniform4f } from '../../../lib/materials/material.mjs';


const HoverShader: Shader = {

  name: 'Hover',

  vertexSource: `
in vec3 POSITION;
in vec3 NORMAL;
out vec3 vLight;

const vec3 lightDir = vec3(0.75, 0.5, 1.0);
const vec3 ambientColor = vec3(0.5, 0.5, 0.5);
const vec3 lightColor = vec3(0.75, 0.75, 0.75);

void main() {
  vec3 normalRotated = vec3(MODEL_MATRIX * vec4(NORMAL, 0.0));
  float lightFactor = max(dot(normalize(lightDir), normalRotated), 0.0);
  vLight = ambientColor + (lightColor * lightFactor);
  gl_Position = ViewProjection() * MODEL_MATRIX * vec4(POSITION, 1.0);
}`,

  fragmentSource: `
precision mediump float;
in vec3 vLight;
out vec4 _Color;
uniform vec4 uColor;

void main() {
  // _Color = vec4(vLight, 1.0) * uColor;
  _Color = vec4(vLight, 1.0) * uColor;
}`,

  uniforms: [
    ['uColor', [1, 1, 1, 1]],
  ],
}


export class HoverMaterial extends Material {
  constructor() {
    super("HoverMaterial", HoverShader);
  }

  // uniform
  setColor(r: number, g: number, b: number, a: number) {
    (this._uniformMap.uColor as MaterialUniform4f).value.set(r, g, b, a)
  }
}


class HoverStatus {
  _last: Set<Entity> = new Set();
  _current: Set<Entity> = new Set();

  update(active: Entity, hitList: readonly Entity[],
    onStart: Function, onEnd: Function) {
    this._current.clear();
    for (const passive of hitList) {
      if (this._last.delete(passive)) {
      }
      else {
        onStart(active, passive);
      }
      this._current.add(passive);
    }

    // not hit. hover end
    this._last.forEach(passive => {
      onEnd(active, passive);
    });

    // swap
    const tmp = this._last;
    this._last = this._current;
    this._current = tmp;
  }
}

export class HoverActive {
  status = new HoverStatus(
  );
}

export class HoverPassive {
  constructor(
    public readonly onStart?: Function,
    public readonly onEnd?: Function,
  ) { }
}

function hitTest(local: vec3, s: number) {
  if (local.x < -s) return false;
  if (local.x > s) return false;
  if (local.y < -s) return false;
  if (local.y > s) return false;
  if (local.z < -s) return false;
  if (local.z > s) return false;
  return true;
}

export function hoverSystem(world: World) {
  const actives = world.view(HoverActive, mat4);
  const passives = world.view(HoverPassive, mat4);

  const _toLocal = new mat4();

  actives.each((activeEntity, active, activeMatrix) => {
    const worldPoint = activeMatrix.getTranslation();
    const hitList: Entity[] = []

    passives.each((passiveEntity, passive, passiveMatrix) => {
      passiveMatrix.invert({ out: _toLocal });
      const local = worldPoint.transformMat4(_toLocal);
      if (hitTest(local, 0.5)) {
        hitList.push(passiveEntity);
      }
    });

    active.status.update(activeEntity, hitList,
      (active: Entity, passive: Entity) => {
        const hoverPassive = world.get(passive, HoverPassive)
        if (hoverPassive && hoverPassive.onStart) {
          hoverPassive.onStart();
        }
      },
      (active: Entity, passive: Entity) => {
        const hoverPassive = world.get(passive, HoverPassive)
        if (hoverPassive && hoverPassive.onEnd) {
          hoverPassive.onEnd();
        }
      });
  });
}
