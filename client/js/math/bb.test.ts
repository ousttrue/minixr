import { describe, test, expect } from "vitest";
import { vec3, BoundingBox } from "./gl-matrix.mjs";

describe("BoundingBox", () => {
  test('isFinite', () => {
    const bb = new BoundingBox();
    expect(bb.isFinite()).toBeFalsy();
    bb.expand(vec3.fromValues(1, 2, 3));
    expect(bb.isFinite()).toBeTruthy();
  })

  test('contains', () => {
    const min = vec3.fromValues(-1, -1, -1);
    const max = vec3.fromValues(1, 1, 1);
    const bb = new BoundingBox();
    bb.expand(min);
    bb.expand(max);
    expect(bb.contains(vec3.fromValues(0, 0, 0))).toBeTruthy();
    expect(bb.contains(vec3.fromValues(2, 2, 2))).toBeFalsy();
  });
})

