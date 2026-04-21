// Natural sort — "page2" before "page10".
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
export function naturalCompare(a: string, b: string): number {
  return collator.compare(a, b);
}
