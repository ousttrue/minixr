export const now = (window.performance && performance.now) ? performance.now.bind(performance) : Date.now;

export class Stats {
  startTime: number = now();
  prevFrameTime: number = this.startTime;
  frames: number = 0;
  fpsMin: number = 0;

  constructor() {

  }

  update(time: number) {
    let frameFps = 1000 / (time - this.prevFrameTime);
    this.prevFrameTime = time;

    this.fpsMin = this.frames
      ? Math.min(this.fpsMin, frameFps)
      : frameFps;
    this.frames++;
  }
};

type Updater = { updateStats: (time: number, stats: Stats) => boolean };

export class StatsViewer {
  updatersMap: Map<Updater, Stats> = new Map();// { updateStats: Updater }[] = []

  constructor() {
    // this.stats.prevFrameTime = this.stats.startTime;
  }

  pushUpdater(updater: Updater) {
    this.updatersMap.set(updater, new Stats);
  }

  begin() {
    const time = now();
    this.updatersMap.forEach(stats => {
      stats.startTime = time;
    });
  }

  end() {
    let time = now();
    this.updatersMap.forEach((stats, updater) => {
      stats.update(time);
      if (updater.updateStats(time, stats)) {
        stats.frames = 0;
        stats.fpsMin = 0;
      }
    });
  }
}
