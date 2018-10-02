import {Face3, Geometry, Vector3} from 'three';

export default function facetedCube(size, w) {
  let d = size * 0.5;
  let l = d - w;
  const v = (x,y,z) => new Vector3(x,y,z); 
  let geom = new Geometry();

  //front
  geom.vertices.push(v(-l, -l, d));
  geom.vertices.push(v(l, -l, d));
  geom.vertices.push(v(l, l, d));
  geom.vertices.push(v(-l, l, d));

  //top
  geom.vertices.push(v(-l, d, l));
  geom.vertices.push(v(l, d, l));
  geom.vertices.push(v(l, d, -l));
  geom.vertices.push(v(-l, d, -l));

  //back
  geom.vertices.push(v(-l, -l, -d));
  geom.vertices.push(v(l, -l, -d));
  geom.vertices.push(v(l, l, -d));
  geom.vertices.push(v(-l, l, -d));

  //bottom
  geom.vertices.push(v(-l, -d, l));
  geom.vertices.push(v(l, -d, l));
  geom.vertices.push(v(l, -d, -l));
  geom.vertices.push(v(-l, -d, -l));

  //left
  geom.vertices.push(v(-d, -l, -l));
  geom.vertices.push(v(-d, -l, l));
  geom.vertices.push(v(-d, l, l));
  geom.vertices.push(v(-d, l, -l));

  //right
  geom.vertices.push(v(d, -l, -l));
  geom.vertices.push(v(d, -l, l));
  geom.vertices.push(v(d, l, l));
  geom.vertices.push(v(d, l, -l));

  //front
  geom.faces.push( new Face3( 0, 1, 2 ) );
  geom.faces.push( new Face3( 2, 3, 0 ) );
  
  //top
  geom.faces.push( new Face3( 4, 5, 6 ) );
  geom.faces.push( new Face3( 6, 7, 4 ) );

  //back
  geom.faces.push( new Face3( 10, 9, 8) );
  geom.faces.push( new Face3( 8, 11, 10 ) );

  //bottom
  geom.faces.push( new Face3( 14, 13, 12) );
  geom.faces.push( new Face3( 12, 15, 14 ) );

  //left
  geom.faces.push( new Face3( 16, 17, 18 ) );
  geom.faces.push( new Face3( 18, 19, 16 ) );

  // right
  geom.faces.push( new Face3( 22, 21, 20 ) );
  geom.faces.push( new Face3( 20, 23, 22 ) );
  
  //front-top
  geom.faces.push( new Face3( 4, 3, 2) );
  geom.faces.push( new Face3( 2, 5, 4 ) );

  //top-back
  geom.faces.push( new Face3( 7, 6, 10) );
  geom.faces.push( new Face3( 10, 11, 7 ) );

  // back-bottom
  geom.faces.push( new Face3( 8, 9, 14) );
  geom.faces.push( new Face3( 14, 15, 8 ) );

  //bottom-left
  geom.faces.push( new Face3( 15, 12, 17) );
  geom.faces.push( new Face3( 17, 16, 15 ) );

  //bottom-right
  geom.faces.push( new Face3( 20, 21, 13) );
  geom.faces.push( new Face3( 13, 14, 20 ) );

  //top-right
  geom.faces.push( new Face3( 6, 5, 22) );
  geom.faces.push( new Face3( 22, 23, 6 ) );

  //top-left
  geom.faces.push( new Face3( 19, 18, 4) );
  geom.faces.push( new Face3( 4, 7, 19 ) );

  //front-left
  geom.faces.push( new Face3( 18, 17, 0) );
  geom.faces.push( new Face3( 0, 3, 18 ) );

  //front-bottom
  geom.faces.push( new Face3( 12, 13, 1) );
  geom.faces.push( new Face3( 1, 0, 12 ) );

  //right-back
  geom.faces.push( new Face3( 9, 10, 23) );
  geom.faces.push( new Face3( 23, 20, 9 ) );

  //front-right
  geom.faces.push( new Face3( 21, 22, 2) );
  geom.faces.push( new Face3( 2, 1, 21 ) );

  //back-left
  geom.faces.push( new Face3( 16, 19, 11) );
  geom.faces.push( new Face3( 11, 8, 16 ) );


  //front-top-left
  geom.faces.push( new Face3( 4, 18, 3 ) );

  //front-top-right
  geom.faces.push( new Face3( 2, 22, 5 ) );

  //top-right-back
  geom.faces.push( new Face3( 23, 10, 6 ) );

  // top-left-back
  geom.faces.push( new Face3( 7, 11, 19 ) );

  // front-left-bottom
  geom.faces.push( new Face3( 17, 12, 0 ) );

  // front-right-bottom
  geom.faces.push( new Face3( 1, 13, 21 ) );

  // back-right-bottom
  geom.faces.push( new Face3( 20, 14, 9 ) );

  // back-left-bottom
  geom.faces.push( new Face3( 8, 15, 16 ) );

  geom.computeFaceNormals();

  return geom;
}