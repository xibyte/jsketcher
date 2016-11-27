
export class Tool {
  
  constructor(name, viewer) {
    this.name = name;
    this.viewer = viewer;
  }

  restart() {};

  cleanup() {};

  mousemove(e) {};
  
  mousedown(e) {};
  
  mouseup(e) {};
  
  dblclick(e) {};
  
  keydown(e) {};
  
  keypress(e) {};
  
  keyup(e) {};

  sendMessage(text) {
    this.viewer.bus.notify('tool-message', text);
  };
  
  sendHint(hint) {
    this.viewer.bus.notify('tool-hint', hint);
  };

  sendSpecifyPointHint() {
    this.sendHint('specify point');
  };

  pointPicked(x, y) {
    this.sendMessage('picked: ' + this.viewer.roundToPrecision(x) + " : " + this.viewer.roundToPrecision(y));
    this.viewer.referencePoint.x = x;
    this.viewer.referencePoint.y = y;
  };
}

const VECTOR_PATTERNS = /^(@)?(.+)(,|<)(.+)$/;

Tool.ParseNumber = function(str) {
  let val;
  try { 
    val = eval(str);
  } catch(e) {
    return e.toString();
  }
  let valNumber = parseFloat(val);
  if (isNaN(valNumber)) return "wrong input for number: "  + str;
  return valNumber;
};

Tool.ParseVector = function(referencePoint, command) {
  command = command.replace(/\s+/g, '');

  const match = command.match(VECTOR_PATTERNS);
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


