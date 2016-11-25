
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
  
  mousewheel(e) {};
  
  keydown(e) {};
  
  keypress(e) {};
  
  keyup(e) {};

  sendMessage(text) {
    this.viewer.bus.notify('tool-message', text);
  };

  sendPickedMessage(x, y) {
    this.sendMessage('picked: ' + this.viewer.roundToPrecision(x) + " : " + this.viewer.roundToPrecision(y));
  };

}

const VECTOR_PATTERNS = /^(@)?(.+)(,|<)(.+)$/;

Tool.ParseVector = function(referencePoint, command) {
  command = command.replace(/\s+/g, '');

  const match = command.match(VECTOR_PATTERNS);
  if (match) {
    const ref = match[1] !== undefined;
    let x = parseFloat(eval(match[2]));
    if (isNaN(x)) return "wrong input for number: "  + match[2];
    const polar = match[3] == '<';
    let y = parseFloat(eval(match[4]));
    if (isNaN(y)) return "wrong input for number: "  + match[4];
    if (polar) {
      y = y * Math.sin(x);
      x = x * Math.cos(x);
    }
    if (ref) {
      x += referencePoint.x;
      y += referencePoint.y;
    }
    return {x, y};
  }

  return "wrong input, point is expected: x,y | @x,y | r<polar ";
};


