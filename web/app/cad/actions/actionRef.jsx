
export function toIdAndOverrides(ref) {
  if (Array.isArray(ref)) {
    return ref;
  } else {
    return [ref, undefined]
  }
}