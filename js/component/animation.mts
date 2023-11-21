import { World } from '../third-party/uecs-0.4.2/index.mjs';


export class Animation {
  stack: Function[] = []
  constructor(animations: Function[] = []) {
    for (const animation of animations) {
      this.stack.push(animation);
    }
  }

  execute() {
    for (const item of this.stack) {
      if (!item()) {
        break;
      }
    }
  }
}


export function animationSystem(world: World) {
  world.view(Animation).each((_, animation) => {
    animation.execute();
  });
}
