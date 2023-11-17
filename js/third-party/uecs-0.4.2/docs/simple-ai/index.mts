// some randomizers to spice things up
function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}
function randomDir() {
  let signX = Math.random() < 0.5 ? -1 : 1;
  let signY = Math.random() < 0.5 ? -1 : 1;
  let x = Math.random();
  return {
    x: x * signX,
    y: (1 - x) * signY
  };
}
function randomRGB() {
  let R = randomInt(0, 255).toString(16);
  if (R.length < 2) R = "0" + R;
  let G = randomInt(0, 255).toString(16);
  if (G.length < 2) G = "0" + G;
  let B = randomInt(0, 255).toString(16);
  if (B.length < 2) B = "0" + B;
  return `#${R}${G}${B}`;
}

// the only requirement for components 
// is that they *MUST* be classes.
class Position {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
}
class Velocity {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
}
class Body {
  constructor(
    type,
    color,
    dims
  ) {
    this.type = type;
    this.color = color;
    this.dims = dims;
    console.log(this.type, this.color, this.dims);
  }
}
class AI {
  state = "idle"; // "idle" or "walk"
  time = { start: 0, duration: 0 };
  walkDir = { x: 0, y: 0 };
}

import { World } from '../../index.mjs';
// initialize the world
const world = new World;
// create the player entity, this one will be controlled by the user with the WASD keys
let player = world.create(
  new Position(window.innerWidth / 2, window.innerHeight / 2),
  new Velocity,
  new Body("square", "#AA0080", { w: 32, h: 32 }));
// now create some AI entities
// these will be controlled by a simple state machine
for (let i = 0; i < 100; ++i) {
  let radius = randomInt(8, 32);
  let x = randomInt(radius, window.innerWidth - radius);
  let y = randomInt(radius, window.innerHeight - radius);
  world.create(
    new Position(x, y),
    new Velocity,
    new Body("circle", randomRGB(), radius),
    new AI
  )
}

let keys = {};
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);
// input changes the player's velocity
function input(player) {
  const velocity = world.get(player, Velocity);
  velocity.x = 0;
  velocity.y = 0;
  if (keys["KeyW"]) velocity.y -= 1;
  if (keys["KeyS"]) velocity.y += 1;
  if (keys["KeyA"]) velocity.x -= 1;
  if (keys["KeyD"]) velocity.x += 1;
}

function ai(world) {
  const now = Date.now();

  // this state machine switches between  the "walk" and "idle" states at a random interval

  // if the entity is in the "walk" state, it should walk straight ahead, 
  // and  turn around if it hits a wall

  // if the entity is in the "idle" state, it should only stand still

  world.view(Position, Velocity, Body, AI).each((entity, position, velocity, body, ai) => {
    switch (ai.state) {
      case "idle": {
        // stand still
        velocity.x = 0;
        velocity.y = 0;

        // check if we should swap states
        if (now - ai.time.start >= ai.time.duration) {
          ai.state = "walk";
          ai.walkDir = randomDir();
          ai.time.start = now;
          // the AI will walk for 1 to 8 seconds
          ai.time.duration = randomInt(1000, 8000) /* ms */;
        }
        break;
      }
      case "walk": {
        // don't walk into walls
        if (position.x + velocity.x < body.dims ||
          position.x + velocity.x > window.innerWidth - body.dims)
          ai.walkDir.x *= -1;
        if (position.y + velocity.y < body.dims ||
          position.y + velocity.y > window.innerHeight - body.dims)
          ai.walkDir.y *= -1;

        // walk
        velocity.x = ai.walkDir.x;
        velocity.y = ai.walkDir.y;

        // check if we should swap states
        if (now - ai.time.start >= ai.time.duration) {
          ai.state = "idle";
          ai.time.start = now;
          // the AI will stand for 2 to 5 seconds
          ai.time.duration = randomInt(2000, 5000) /* ms */;
        }
        break;
      }
    }
  });
}

// move anything that has a Position and Velocity component
function movement(world, dt) {
  world.view(Position, Velocity).each((entity, position, velocity) => {
    position.x += velocity.x * 5 * dt;
    position.y += velocity.y * 5 * dt;
  });
}

/** @type {CanvasRenderingContext2D} */
const ctx = document.querySelector("canvas#game").getContext("2d");
function draw(world) {
  // resize and clear the canvas
  if (ctx.canvas.width !== ctx.canvas.clientWidth || ctx.canvas.height !== ctx.canvas.clientHeight) {
    ctx.canvas.width = ctx.canvas.clientWidth;
    ctx.canvas.height = ctx.canvas.clientHeight;
  }
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // draw each entity with a Position and Body component
  world.view(Position, Body).each((entity, position, body) => {
    switch (body.type) {
      case "circle": {
        ctx.beginPath();
        ctx.arc(position.x, position.y, body.dims, 0, 2 * Math.PI);
        ctx.fillStyle = body.color;
        ctx.fill();
        break;
      }
      case "square": {
        let hw = body.dims.w / 2;
        let hh = body.dims.h / 2;
        ctx.fillStyle = body.color;
        ctx.fillRect(position.x - hw, position.y - hh, body.dims.w, body.dims.h);
        break;
      }
    }
  });
}

function collision(world) {
  // collide against the world boundaries, which are the screen dimensions
  world.view(Position, Body).each((entity, position, body) => {
    let size;
    switch (body.type) {
      case "circle": size = { w: body.dims, h: body.dims }; break;
      case "square": size = body.dims; break;
    }

    if (position.x < size.w) position.x = size.w;
    if (position.x > window.innerWidth - size.w) position.x = window.innerWidth - size.w;
    if (position.y < size.h) position.y = size.h;
    if (position.y > window.innerHeight - size.h) position.y = window.innerHeight - size.h;
  });
}

// our main loop
let last = window.performance.now();
const target = 1000 / 30;
function update(time) {
  let dt = (time - last) / (1000 / 30);
  last = time;

  input(player);
  ai(world);
  movement(world, dt);
  collision(world);
  draw(world);

  requestAnimationFrame(update);
}
requestAnimationFrame(update);

