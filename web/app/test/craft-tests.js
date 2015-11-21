require("./headless-loader.js");

function testReconstruct0() {

}

testReconstruct0();
var face = face4;
var polygons2D = face.polygons.map(csgPolyToSimple).map(polygonTransform(basisTransformation(face.basis)));
var csgPolygons = polygons2D.map(function(p) {return new CSG.Polygon( p.map(function(v) { return new CSG.Vertex(new CSG.Vector3D(v));}) )} );
var outline = TCAD.craft.findOutline(csgPolygons);



viz("1", polygons2D, outline);
