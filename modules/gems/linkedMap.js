export class OrderedMap {

  constructor() {
    this.order = [];
    this.map = new Map();
  }

  forEach(cb) {
    this.order.forEach(key => cb(this.map.get(key), key));
  }

  set(key, value) {
    if (!this.map.has(key)) {
      this.map.set(key, value);
      this.order.push(key)
    }
  }

  get(key) {
    return this.map(key);
  }
  
  has(key) {
    return this.map.has(key);
  }

  delete(key) {
    this.map.delete(key);
    const index = this.order.indexOf(key);
    if (index !== -1) {
      this.order.splice(index, 1);
    }
  }

  clear() {
    this.map.clear();
    this.order.length = 0;
  }

  get size() {
    return this.map.size;
  }

}
