import { describe, test, expect } from "vitest";
import { quat } from "./gl-matrix.mjs";

describe("quat", () => {
  test('zero', () => {
    expect(new quat()).toEqual(quat.fromValues(0, 0, 0, 1));
  });
})

