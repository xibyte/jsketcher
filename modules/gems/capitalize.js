export default function capitalize(str) {
  if (!str) return;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function decapitalize(str) {
  if (!str) return;
  return str.charAt(0).toLowerCase() + str.slice(1);
}
