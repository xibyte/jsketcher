
const counters = new Map<string, number>();

export function nextNumber(domain: string) {
  let number = counters.get(domain);
  if (!number) {
    number = 0;
  }
  number++;
  counters.set(domain, number);
  return number;
}
