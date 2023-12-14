import { describe, test, expect } from "vitest";
import { vec4 } from "./gl-matrix.mjs";

describe("vec4", () => {
  test('zero', () => {
    expect(new vec4()).toEqual(vec4.fromValues(0, 0, 0, 0));
  });
})

