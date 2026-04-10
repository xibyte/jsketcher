/**
 * Scalar numeric parameter with observable value.
 */
export class Param {

  value: number;

  constructor(value: number = 0) {
    this.value = value;
  }

  set(value: number): void {
    this.value = value;
  }
}
