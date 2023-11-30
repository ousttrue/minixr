import { describe, test, expect } from "vitest";
import { vec3, Ray } from "./gl-matrix.mjs";

describe("Ray", () => {

  test('origin', () => {
    expect(
      new Ray().origin
    ).toEqual(vec3.fromValues(0, 0, 0));
  })

})

