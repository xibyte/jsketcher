/** @constructor */
export function ReferencePointTool(viewer) {
  this.viewer = viewer;
}

ReferencePointTool.prototype.keydown = function(e) {};
ReferencePointTool.prototype.keypress = function(e) {};
ReferencePointTool.prototype.keyup = function(e) {};

ReferencePointTool.prototype.cleanup = function(e) {
  this.viewer.cleanSnap();
};

ReferencePointTool.prototype.mousemove = function(e) {
  var p = this.viewer.screenToModel(e);
  this.viewer.snap(p.x, p.y, []);
  this.viewer.refresh();
};

ReferencePointTool.prototype.mouseup = function(e) {
};

ReferencePointTool.prototype.mousedown = function(e) {
  const needSnap = this.viewer.snapped.length != 0;
  let p = needSnap ? this.viewer.snapped.pop() : this.viewer.screenToModel(e);
  this.viewer.referencePoint.x = p.x;
  this.viewer.referencePoint.y = p.y;
  this.viewer.refresh();
  this.viewer.toolManager.releaseControl();
};

ReferencePointTool.prototype.mousewheel = function(e) {
};

ReferencePointTool.prototype.hint = function(e) {
  return "specify point"
};

ReferencePointTool.prototype.processCommand = function(command) {
  var referencePoint = this.viewer.referencePoint;
  let point = ParseVector(referencePoint, command);
  referencePoint.x += point.x;
  referencePoint.y += point.y;
  this.viewer.refresh();
};

const VECTOR_PATTERNS = /^(@)?(.+)(,|<)(.+)$/;

function ParseVector(referencePoint, command) {
  command = str.replace(/\s+/g, '');

  const match = command.match(VECTOR_PATTERNS);
  if (match) {
    const ref = !match[1];
    let x = parseFloat(match[2]);
    if (isNaN(x)) return "wrong input for number: "  + match[2];
    const polar = match[3] == '<';
    let y = parseFloat(match[4]);
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
}
