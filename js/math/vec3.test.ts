import { describe, test, expect } from "vitest";
import { vec3 } from "./gl-matrix.mjs";

describe("vec3", () => {
  test('zero', () => {
    expect(new vec3()).toEqual(vec3.fromValues(0, 0, 0));
  });
  test('a + b', () => {
    const a = vec3.fromValues(1, 2, 3)
    expect(a.add(a)).toEqual(vec3.fromValues(2, 4, 6))
    expect(a).toEqual(vec3.fromValues(1, 2, 3))
  });
  test('a += b', () => {
    const a = vec3.fromValues(1, 2, 3)
    const expected = vec3.fromValues(2, 4, 6)
    expect(a.add(a, { out: a })).toEqual(expected)
    expect(a).toEqual(expected);
  });
  test('a + b * c', () => {
    const a = vec3.fromValues(1, 2, 3)
    const expected = vec3.fromValues(3, 6, 9)
    expect(a.muladd(a, 2)).toEqual(expected)
    expect(a).toEqual(vec3.fromValues(1, 2, 3))
  });
  test('normalize', () => {
    const a = vec3.fromValues(2, 0, 0)
    const expected = vec3.fromValues(1, 0, 0)
    expect(a.normalize()).toEqual(expected)
    expect(a).toEqual(vec3.fromValues(2, 0, 0));
  })
  test('normalize(inplace)', () => {
    const a = vec3.fromValues(2, 0, 0)
    const expected = vec3.fromValues(1, 0, 0)
    expect(a.normalize({ out: a })).toEqual(expected)
    expect(a).toEqual(expected);
  })
})
