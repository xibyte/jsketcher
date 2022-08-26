import {DigraphABPointPair, DigraphABSegment} from "./sided_ab_graphs/digraph_ab_elements.js"

export function makeTestGridGraph(width, height, straightWeight, diagonalWeight, includeDiagonals) {
  straightWeight = parseFloat(straightWeight);
  diagonalWeight = parseFloat(diagonalWeight);
  const g = {};
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const node = {};
      if (i < height - 1) {
        node[vertex(i + 1, j)] = straightWeight;
      }
      if (j < width - 1) {
        node[vertex(i, j + 1)] = straightWeight;
      }
      if (i < height - 1 && j < width - 1 && includeDiagonals) {
        node[vertex(i + 1, j + 1)] = diagonalWeight;
      }
      g[vertex(i, j)] = node;
    }
  }
  return g;
}

export function makeTestGridAbGraph(width, height, straightWeight, diagonalWeight, includeDiagonals) {
  straightWeight = parseFloat(straightWeight);
  diagonalWeight = parseFloat(diagonalWeight);
  const g = [];
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const v = vertex(i, j);
      if (i < height - 1) {
        g.push(new DigraphABSegment("Down-" + i + "-" + j, v, "B", vertex(i + 1, j), "A", straightWeight));
      }
      if (j < width - 1) {
        g.push(new DigraphABSegment("Right-" + i + "-" + j, v, "B", vertex(i, j + 1), "A", straightWeight));
      }
      if (i < height - 1 && j < width - 1 && includeDiagonals) {
        g.push(new DigraphABSegment("Diag-" + i + "-" + j, v, "B", vertex(i + 1, j + 1), "A", diagonalWeight));
      }
    }
  }
  return g;
}

export function makeTestGridAbPointPairs(width, height, numberOfPairs, seed) {
  const pairs = [];
  const rnd = mulberryRandom32(seed ?? 157);
  pairs.push(new DigraphABPointPair(vertex(0, 0), vertex(height - 1, width - 1)));
  for (let k = 1; k < numberOfPairs; k++) {
    const i1 = randomInt(0, height, rnd);
    const i2 = randomInt(0, height, rnd);
    const j1 = randomInt(0, width, rnd);
    const j2 = randomInt(0, width, rnd);
    pairs.push(new DigraphABPointPair(vertex(i1, j1), vertex(i2, j2)));
  }
  return pairs;
}

function vertex(y, x) {
  return "V" + x + "|" + y;
}

function randomInt(min, max, rnd) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(rnd() * (max - min)) + min;
}

// Allows to specify start seed, unlike Math.random
function mulberryRandom32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
