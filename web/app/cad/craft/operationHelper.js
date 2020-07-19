
export function roundValueForPresentation(value) {
  return value.toPrecision ? value.toPrecision(4).replace(/\.0$/, '') : value;
}
