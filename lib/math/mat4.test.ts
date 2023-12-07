import { describe, test, expect } from "vitest";
import { mat4, vec3 } from "./gl-matrix.mjs";

describe("mat4", () => {
  test('zero', () => {
    expect(new mat4()).toEqual(mat4.fromValues(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
    expect(mat4.zero()).toEqual(mat4.fromValues(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
  });
  test('one', () => {
    expect(mat4.identity()).toEqual(mat4.fromValues(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1));
  });
  test('translation', () => {
    const m = mat4.fromTranslation(1, 2, 3);
    const t = m.getTranslation()
    expect(t).toEqual(vec3.fromValues(1, 2, 3));
    t.x = 2
    expect(m.m30).toEqual(2);
  });
  test('mul', () => {
    const l = mat4.fromTranslation(3, 2, 1);
    const r = mat4.fromTranslation(1, 2, 3);
    expect(l.mul(r, { out: r })).toEqual(mat4.fromTranslation(4, 4, 4));
    expect(r).toEqual(mat4.fromTranslation(4, 4, 4));
    expect(l).toEqual(mat4.fromTranslation(3, 2, 1));
  });
})

