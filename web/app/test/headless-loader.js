TCAD = {};

require("../engine.js");
require("../math/vector.js");
require("../math/math.js");
require("../workbench.js");
require("../math/graph.js");
require("../3d/hashmap.js");
CSG = require("../../lib/csg.js").CSG;

require("./craft-fixtures.js");

var assert = require('assert');
viz = function(name, polygons, segments) {
  var colors =  ['aqua', 'black', 'blue', 'brown', 'crimson', 'gray', 'green', 'lemon', 'lime', 'olive', 'orange', 'peach', 'pink', 'purple', 'salmon', 'tan', 'teal', 'violet', 'violet', 'blue', 'white', 'yellow'];
  var bbox = new TCAD.BBox();
  var fs = require('fs');
  var builder = require('xmlbuilder');
  var svg = builder.create('html')
    .ele('body')
      .ele('svg', {width: 800, height: 600});
  for (var pi = 0; pi < polygons.length; ++ pi) {
    var poly = polygons[pi];
    var pointsStr = "";
    for (var pointIdx = 0; pointIdx < poly.length; ++ pointIdx) {
      pointsStr += " " + poly[pointIdx].x + "," + poly[pointIdx].y;
      bbox.checkBounds(poly[pointIdx].x, poly[pointIdx].y);
    }
    svg.ele('polygon', {points: pointsStr, style:"fill:"+colors[pi % colors.length]});
  }
  for (var si = 0; si < segments.length; ++ si) {
    var s = segments[si];
    svg.ele('line', {x1 : s[0].x, y1 : s[0].y, x2 : s[1].x, y2 : s[1].y, stroke:'magenta', 'stroke-width':'2'});
    svg.ele('ellipse', {cx : s[0].x, cy : s[0].y, rx:3, ry:2, fill : "red"});
    svg.ele('ellipse', {cx : s[1].x, cy : s[1].y, rx:2, ry:3, fill : "red"});
  }
  var length = Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY) + 100;
  svg.att('viewBox', (bbox.minX - 100) + " " + (bbox.minY - 100) + " " + length + " " + length)
  var htmlText = svg.end({ pretty: true});
  if (!fs.existsSync('viz')) fs.mkdirSync('viz', function(err) {});
  fs.writeFile("viz/" + name + ".html", htmlText);
}

vertToPoint = function(v) {
  return {x : v.pos._x, y : v.pos._y, z : v.pos._z};
}

csgPolyToSimple = function(p) {
  return p.vertices.map(vertToPoint);
}

basisTransformation = function(basis) {
  var tr = new TCAD.Matrix().setBasis(basis).invert();
  return function(p) {
    return tr.apply(p);
  }
}

polygonTransform = function(tr) {
  return function(polygon) {
    return polygon.map(tr);
  }
};

