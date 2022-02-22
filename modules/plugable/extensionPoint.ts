
export type ExtensionPlacement = 'before' | 'after';

export interface ExtensionRule<T> {
  placement: ExtensionPlacement;

}

export class ExtensionPoint<T> {

  add(item: T, rule?: ExtensionRule<T>) {

  }

  addAll(...items: T[]) {

  }

}