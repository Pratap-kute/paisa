import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { cosineSimilarity } from "./cosine_similarity.ts";

describe("cosineSimilarity", () => {
  it("calculates similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it("returns zero for empty and zero-magnitude vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it("rejects vectors with unequal lengths", () => {
    expect(() => cosineSimilarity([1], [1, 2])).toThrow(RangeError);
  });
});
