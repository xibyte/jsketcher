
export default class Joints {
  
  constructor() {
    this.map = new Map();
  }
  
  connect(a, b) {
    let tuple = this.map.get(a);
    if (!tuple) {
      tuple = this.map.get(b);
      if (!tuple) {
        tuple = {
          master: a,
          linked: new Set()
        };
        this.map.set(b, tuple);
      }
      this.map.set(a, tuple);
    }
    tuple.linked.add(a);
    tuple.linked.add(b);
  }

  connected(a, b) {
    let set = this.map.get(a);
    if (!set) {
      return false;
    }
    return set.has(b);
  }
  
  master(node) {
    let tuple = this.map.get(node);
    if (!tuple) {
      return node;
    }
    return tuple.master;
  }
}