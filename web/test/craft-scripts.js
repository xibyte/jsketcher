function test1() {

  var face;
  var app = window._TCAD_APP;
  face = app.findFace('0:2');

  app.craft.modify({
    type: 'CUT',
    solids : [face.solid],
    face : face,
    params : {target : face.basis()[2].multiply(-250), expansionFactor : 2.5}
  });

  face = app.findFace('0:4');
  app.craft.modify({
    type: 'CUT',
    solids : [face.solid],
    face : face,
    params : {target : face.basis()[2].multiply(-550), expansionFactor : 1}
  });
}