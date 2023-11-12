import { describe, test, expect } from "vitest";
import { vec2 } from "./gl-matrix.mjs";

describe("vec2", () => {
  test('zero', () => {
    expect(new vec2()).toEqual(vec2.fromValues(0, 0));
  });
});
