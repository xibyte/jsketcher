
export function roundValueForPresentation(value) {
  return value.toPrecision(4).replace(/\.0$/, '');
}
