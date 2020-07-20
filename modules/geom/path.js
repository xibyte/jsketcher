import {Point} from './point'
import {defineIterable} from '../../web/app/utils/utils'

class Path {
  
  constructor(head) {
    this.head = head;
    defineIterable(this, 'segments', () => segmentsGenerator(this));
  }
  
  isClosed() {
    return this.head.prev != null;
  }
}

export class PathBuilder {
  constructor(head) {
    this.head = null;
    this.tail = null;
    defineIterable(this, 'segments', () => segmentsGenerator(this));
  }

  addSegment(segment) {
    if (this.tail == null) {
      this.head = segment;
    } else {
      this.tail.next = segment;
    }
    segment.prev = this.tail;
    this.tail = segment;
  }

  close() {
    this.tail.next = this.head;
    this.head.prev = this.tail;
    return this.head;
  }  
  
  unclosed() {
    return this.head;
  }
  
}

export class Segment {
  constructor(curve, point) {
    this.curve = curve;
    this.point = point;
    this.next = null;
    this.prev = null;
    this.data = {};
  }
}

export function* segmentsGenerator(path) {
  let node = path.head;
  while (node != null) {
    yield node;
    node = node.next;
    if (node == path.node) break;
  }
}
