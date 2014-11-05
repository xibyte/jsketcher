TCAD.workbench = {};

TCAD.workbench.readSketchGeom = function(sketch) {
  var out = {lines : [], circles : [], arcs : []};
  if (sketch.layers !== undefined) {
    for (var l = 0; l < sketch.layers.length; ++l) {
      for (var i = 0; i < sketch.layers[l].length; ++i) {
        var obj = sketch.layers[l][i];
        if (obj._class === 'TCAD.TWO.Segment') {
          out.lines.push([
            obj.points[0][1][1], obj.points[0][2][1], //x,y 
            obj.points[1][1][1], obj.points[1][2][1]  //x,y
          ]);
        } else if (obj._class === 'TCAD.TWO.Arc') {
        } else if (obj._class === 'TCAD.TWO.Circle') {
        }
      }
    }
    return out;
  }
};  