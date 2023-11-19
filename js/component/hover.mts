import { mat4, Transform } from '../math/gl-matrix.mjs';
import { World, Entity } from '../third-party/uecs-0.4.2/index.mjs';
import { Primitive } from '../geometry/primitive.mjs';

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
  status = new HoverStatus();
}

export class HoverPassive {
  constructor(
    public readonly onStart?: Function,
    public readonly onEnd?: Function,
  ) { }
}

export function hoverSystem(world: World) {
  const actives = world.view(HoverActive, Transform);
  const passives = world.view(HoverPassive, Transform);

  const _toLocal = new mat4();

  actives.each((activeEntity, active, activeTransform) => {
    const worldPoint = activeTransform.matrix.getTranslation();
    const hitList: Entity[] = []

    passives.each((passiveEntity, passive, passiveTransform) => {
      passiveTransform.matrix.invert({ out: _toLocal });
      const local = worldPoint.transformMat4(_toLocal);

      const prim = world.get(passiveEntity, Primitive);
      if (prim) {
        if (prim.hitTest(local)) {
          hitList.push(passiveEntity);
        }
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
