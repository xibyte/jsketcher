export function twoPoints(objs) {
  var points = [];
  for (var i = 0; i < objs.length; ++i) {
    if (objs[i]._class == 'TCAD.TWO.EndPoint') {
      points.push(objs[i]);
    } else if (objs[i]._class == 'TCAD.TWO.Segment') {
      points.push(objs[i].a);
      points.push(objs[i].b);
    }
  }
  if (points.length < 2) {
    throw "Illegal Argument. Constraint requires 2 points or 1 line."
  }
  return points;
}

export function points(objs) {
  var points = [];
  for (var i = 0; i < objs.length; ++i) {
    objs[i].accept(function(o) {
      if (o._class === 'TCAD.TWO.EndPoint')  {
        points.push(o);
      }
      return true;
    });
  }
  if (points.length == 0) {
    throw "Illegal Argument. Constraint requires at least 1 point/line/arc/circle."
  }
  return points;
}

export function arkCirc(objs, min) {
  var arcs = [];
  for (var i = 0; i < objs.length; ++i) {
    if (objs[i]._class === 'TCAD.TWO.Arc' || objs[i]._class === 'TCAD.TWO.Circle') {
      arcs.push(objs[i]);
    }
  }
  if (arcs.length < min) {
    throw "Illegal Argument. Constraint requires at least " + min + " arcs/circles."
  }
  return arcs;
}

export function generic(objs, types, min) {
  var result = [];
  for (var i = 0; i < objs.length; ++i) {
    if (types.indexOf(objs[i]._class)  > -1 ) {
      result.push(objs[i]);
    }
  }
  if (result.length < min) {
    throw "Illegal Argument. Constraint requires at least " + min + " of " + types;
  }
  return result;
}

export function pointAndLine(objs) {

  var point = null;
  var line = null;

  for (var i = 0; i < objs.length; ++i) {
    if (objs[i]._class == 'TCAD.TWO.EndPoint') {
      point = objs[i];
    } else if (objs[i]._class == 'TCAD.TWO.Segment') {
      line = objs[i];
    }
  }
  if (point == null || line == null) {
    throw "Illegal Argument. Constraint requires point and line."
  }

  return [point, line];
}

export function line(objs) {
  for (var i = 0; i < objs.length; ++i) {
    if (objs[i]._class == 'TCAD.TWO.Segment') {
      return objs[i];
    }
  }
  throw "Illegal Argument. Constraint requires a line."
}

export function lines(objs) {
  return objs.filter(o => o._class == 'TCAD.TWO.Segment')
}

export function arcCircAndLine(objs) {

  var arc = null;
  var line = null;

  for (var i = 0; i < objs.length; ++i) {
    if (objs[i]._class === 'TCAD.TWO.Arc' || objs[i]._class === 'TCAD.TWO.Circle') {
      arc = objs[i];
    } else if (objs[i]._class == 'TCAD.TWO.Segment') {
      line = objs[i];
    }
  }
  if (arc == null || line == null) {
    throw "Illegal Argument. Constraint requires arc and line."
  }

  return [arc, line];
}

export function twoLines(objs) {
  var lines = [];
  for (var i = 0; i < objs.length; ++i) {
    if (objs[i]._class == 'TCAD.TWO.Segment') {
      lines.push(objs[i]);
    }
  }
  if (lines.length < 2) {
    throw "Illegal Argument. Constraint requires 2 lines."
  }
  return lines;
}

export function sketchObjects(objs, silent, matching) {
  var fetched = [];
  for (var i = 0; i < objs.length; ++i) {
    for (var j = 0; j < matching.length; j++) {
      if (objs[i]._class ==  matching[j]) {
        fetched[j] = objs[i]; 
        matching[j] = null;
      }
    }
  }
  if (fetched.length != matching.length) {
    if (silent) {
      return null;
    } else {
      throw "Illegal Argument. " + matching + " required";
    }
  }
  return fetched;
}

