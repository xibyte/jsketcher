import {EndPoint} from '../shapes/point'

export class Tool {
  
  constructor(name, viewer) {
    this.name = name;
    this.viewer = viewer;
  }

  restart() {}

  cleanup() {}

  mousemove(e) {}
  
  mousedown(e) {}
  
  mouseup(e) {}
  
  dblclick(e) {}
  
  keydown(e) {}
  
  keypress(e) {}
  
  keyup(e) {}

  sendMessage(text) {
    this.viewer.streams.tool.$message.next(text);
  }
  
  sendHint(hint) {
    this.viewer.streams.tool.$hint.next(hint);
  }

  sendSpecifyPointHint() {
    this.sendHint('specify point');
  }

  pointPicked(x, y) {
    this.sendMessage('picked: ' + this.viewer.roundToPrecision(x) + " : " + this.viewer.roundToPrecision(y));
    this.viewer.referencePoint.x = x;
    this.viewer.referencePoint.y = y;
  }

  snapIfNeed(p) {
    if (this.viewer.snapped != null) {
      const snapWith = this.viewer.snapped;
      this.viewer.cleanSnap();
      p.setFromPoint(snapWith);
      this.viewer.parametricManager.coincidePoints(p, snapWith);
      this.viewer.parametricManager.refresh();
    }
  }

  static dumbMode(e) {
    return e.ctrlKey || e.metaKey || e.altKey;
  }
}

Tool.ParseNumber = function(str) {
  let val;
  try {
    val = eval(str);
  } catch(e) {
    return e.toString();
  }
  const valNumber = parseFloat(val);
  if (isNaN(valNumber)) return "wrong input for number: "  + str;
  return valNumber;
};


Tool.ParseNumberWithRef = function(str, ref) {
  const rel = str.startsWith('@');
  if (rel) {
    str = str.substring(1);
  }
  let val = Tool.ParseNumber(str);
  if(typeof val === 'string') return val;
  if (rel) {
    val += ref;
  }
  return val;
};

const VECTOR_PATTERN = /^(@)?(.+)(,|<)(.+)$/;

Tool.ParseVector = function(referencePoint, command) {
  command = command.replace(/\s+/g, '');

  const match = command.match(VECTOR_PATTERN);
  if (match) {
    const ref = match[1] !== undefined;
    let x = Tool.ParseNumber(match[2]);
    if(typeof x === 'string') return x;
    const polar = match[3] == '<';
    let y = Tool.ParseNumber(match[4]);
    if(typeof y === 'string') return y;
    if (polar) {
      const angle = y / 180 * Math.PI;
      const radius = x;
      x = radius * Math.cos(angle);
      y = radius * Math.sin(angle);
    }
    if (ref) {
      x += referencePoint.x;
      y += referencePoint.y;
    }
    return {x, y};
  }

  return "wrong input, point is expected: x,y | @x,y | r<polar | @r<polar ";
};

Tool.ParseNumberSequence = function(command, refs, length) {
  command = command.replace(/\s+/g, '');
  const parts = command.split(',');
  const result = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const val = refs && refs[i] ? Tool.ParseNumberWithRef(part, refs[i]) : Tool.ParseNumberWithRef(part);
    result.push(val);
  }
  if (length !== undefined && result.length != length) {
    return "wrong input, sequence of length " + length + " is expected: x1,x2...";
  }
  return result;
};



