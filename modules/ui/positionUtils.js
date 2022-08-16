export function aboveElement(el) {
  const r = el.getBoundingClientRect();
  return {
    x: r.left,
    y: r.top
  }
}
