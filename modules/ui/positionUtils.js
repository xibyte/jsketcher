export function aboveElement(el) {
  let r = el.getBoundingClientRect();
  return {
    x: r.left,
    y: r.top
  }
}
