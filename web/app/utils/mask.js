
export function type(n) {
  return 1 << (n - 1);
}

export function is(mask, value) {
  return (mask & value) === value;
}
