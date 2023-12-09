import { World } from '../../../lib/uecs/index.mjs';


export const now = (window.performance && performance.now) ? performance.now.bind(performance) : Date.now;

export class Stats {
  startTime: number = now();
  prevFrameTime: number = this.startTime;
  frames: number = 0;
  fpsMin: number = 0;

  constructor(public readonly updater: (time: number, stats: Stats) => boolean) {

  }

  update(time: number) {
    let frameFps = 1000 / (time - this.prevFrameTime);
    this.prevFrameTime = time;

    this.fpsMin = this.frames
      ? Math.min(this.fpsMin, frameFps)
      : frameFps;
    this.frames++;

    if (this.updater(time, this)) {
      this.frames = 0;
      this.fpsMin = 0;
    }
  }
};


export class StatsViewer {
  begin(world: World) {
    const time = now();
    world.view(Stats).each((_, stats) => {
      stats.startTime = time;
    });
  }

  end(world: World) {
    let time = now();
    world.view(Stats).each((_, stats) => {
      stats.update(time);
    });
  }
}
