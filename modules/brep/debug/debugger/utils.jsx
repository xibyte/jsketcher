import React from 'react';
import {
  AQUA, BLACK, BLUE, cycleColor, DETECTED_EDGE, DISCARDED_EDGE, GREEN, RED, SALMON, WHITE,
  YELLOW
} from "./colors";
import Section from "./section";
import {distanceAB3} from "math/distance";

export function getFacesViewObjects(group3d, category, context, out, faces) {
  forEach(faces, getFaceViewObjects.bind(null, group3d, category, context, out));
}

export function getFaceViewObjects(group3d, category, context, out, face) {
  return getLoopsViewObjects(group3d, category, context, out, face.loops);
}

export function getLoopsViewObjects(group3d, category, context, out, loops) {
  forEach(loops, getLoopViewObjects.bind(null, group3d, category, context, out));
}

export function getLoopViewObjects(group3d, category, context, out, loop) {
  return getEdgesViewObjects(group3d, category, context, out, loop.halfEdges);
}

export function getEdgesViewObjects(group3d, category, context, out, edges) {
  forEach(edges, getEdgeViewObjects.bind(null, group3d, category, context, out));
}

export function getViewObjectsComposite(providers) {
  return function (group3d, category, context, out, objects) {
    for (let i = 0; i < providers.length; i++) {
      const obj = objects[i];
      if (obj) {
        const provider = providers[i];
        provider(group3d, category, context, out, obj);
      }
    }
  }
}

export const getEdgeViewObjects = findOrCreate.bind(null, (edge, color) => {
  const points = edge.edge.curve.tessellate();
  if (edge.inverted) {
    points.reverse();
  }
  return createDirectedCurve(points, edge.tangentAtEnd(), points[points.length - 1], color)
});

export const getCurveViewObjects = findOrCreate.bind(null, (curve, color) => {
  const points = curve.tessellate();
  const end = curve.point(curve.uMax);
  return createDirectedCurve(points, curve.tangentAtPoint(end), end, color)
});

function createDirectedCurve(points, arrowDir, arrowTipPos, color) {
  
  const obj = new THREE.Object3D();
  obj.__tcad_debug_materials = [];

  const material = new THREE.LineBasicMaterial({color, linewidth: 10});
  const vertices = [];

  let edgeLength = 0;
  for (let i = 1; i < points.length; ++i) {
    const a = points[i - 1];
    const b = points[i];
    vertices.push(a.three());
    vertices.push(b.three());
    edgeLength += distanceAB3(a, b);
  }
  const lg = new THREE.BufferGeometry().setFromPoints( vertices );

  obj.__tcad_debug_materials.push(material);
  obj.add(new THREE.Line(lg, material));

  
  
  let arrowLength = 15;
  const arrowWidth = 0.2 * arrowLength;
  if (arrowLength > edgeLength * 0.5) {
    arrowLength = edgeLength * 0.5;
  }
  const dir = arrowDir;
  const pos = arrowTipPos.minus(dir.multiply(arrowLength * 0.5));
  const cone = new THREE.CylinderGeometry( 0, arrowWidth, arrowLength, 10, 1 );
  const arrow = new THREE.Mesh( cone, new THREE.MeshBasicMaterial( { color} ) );
  if ( dir.y > 0.99999 ) {
    arrow.quaternion.set( 0, 0, 0, 1 );
  } else if ( dir.y < - 0.99999 ) {
    arrow.quaternion.set( 1, 0, 0, 0 );
  } else {
    arrow.quaternion.setFromAxisAngle( new THREE.Vector3().set( dir.z, 0, - dir.x ).normalize(), Math.acos( dir.y ) );
  }
  arrow.position.set(pos.x, pos.y, pos.z);
  
  obj.__tcad_debug_materials.push(arrow.material);
  obj.add(arrow);
  return obj;
}

export const getVertexViewObjects = findOrCreate.bind(null, ({point: {x,y,z}}, color) => {
  return createPoint(x,y,z, color)
});

export const getPointViewObjects = findOrCreate.bind(null, ({x,y,z}, color) => {
  return createPoint(x,y,z, color)
});

function createPoint(x,y,z, color) {
  const geometry = new THREE.SphereGeometry( 5, 16, 16 );
  const material = new THREE.MeshBasicMaterial( {color} );
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.x = x;
  sphere.position.y = y;
  sphere.position.z = z;

  sphere.__tcad_debug_materials = [material];
  return sphere;
}

export function findOrCreate(creator, group3d, category, context, out, topoObj) {
  let obj = group3d.children.find(obj => obj.__tcad_debug_category === category && obj.__tcad_debug_topoObj === topoObj);
  if (!obj) {
    obj = creator(topoObj, getInitColor(category, topoObj, context));
    group3d.add(obj);
    obj.__tcad_debug_category = category;
    obj.__tcad_debug_topoObj = topoObj;
    obj.visible = false;
  }
  out.push(obj);
}

export function setViewObjectsColor(objectsProvider, group3d, category, context, topoObj, colorGetter) {
  fetchViewObjects(objectsProvider, group3d, category, context, topoObj)
    .forEach(o => o.__tcad_debug_materials.forEach(m => m.color.setHex(colorGetter(o))));
}

export function fetchViewObjects(objectsProvider, group3d, category, context, topoObj) {
  const objs = [];
  objectsProvider(group3d, category, context, objs, topoObj);
  return objs;
}


export function getInitColor(category, obj, context) {
  switch (category) {
    case 'face_intersection_operandA': return GREEN;
    case 'face_intersection_operandB': return BLUE;
    case 'loop-detection': {
      return context.has(obj) ? DETECTED_EDGE : DISCARDED_EDGE;
    }
    case 'edge-transfer': {
      const {edge, face, chosenFace, discardedFace, chosenEdge} = context;
      if (obj === edge) {
        return RED;
      } else if (obj.loop.face === face) {
        return WHITE;
      } else if (obj === chosenEdge) {
        return AQUA;
      } else if (obj.loop.face === chosenFace) {
        return AQUA;
      } else if (obj.loop.face === discardedFace) {
        return BLACK;
      } else {
        return BLACK;
      }
    }
    case 'face-filter': {
      const {connectedToAffectedFaces, notConnectedToAffectedFaces} = context;
      if (connectedToAffectedFaces.indexOf(obj.loop.face) > -1) {
        return WHITE;
      } else {
        return BLACK;
      } 
    }
    case 'marked-edges': {
      const color = context[obj].color;
      return color === undefined ? YELLOW : color;
    }
    case 'face-intersections': {
      const {faceA, faceB} = context;
      if (obj.constructor.name === 'HalfEdge') {
        return faceContainsEdge(faceA, obj) ? AQUA : YELLOW;
      } else if (obj.constructor.name === 'Vector') {
        return GREEN;
      } else {
        return WHITE;
      }
    }
    default:
      switch (obj.constructor.name) {
        case 'HalfEdge': return SALMON;
        case 'Vertex': return GREEN;
      }
  }
  return WHITE;
}

function faceContainsEdge(face, edge) {
  for (const e of face.edges) {
    if (e === edge) {
      return true;
    }
  }
  return false;
}

export function mapIterable(it, fn) {
  const out = [];
  for (const i of it) {
    out.push(fn(i));
  }
  return out;
}

export function forEach(it, fn) {
  for (const i of it) {
    fn(i);
  }
}


export function createObjectsUpdater(viewObjectsProvider, group3d, category, context, topoObj) {
  const getObjects = out => viewObjectsProvider.bind(null, group3d, category, context, out, topoObj)();
  return function (func) {
    const out = [];
    getObjects(out);
    out.forEach(func);
    __DEBUG__.render();
  }
}

export function Controls({viewObjectsProvider, group3d, category, context, topoObj}) {
  const applyToAll = createObjectsUpdater(viewObjectsProvider, group3d, category, context, topoObj);
  function tweak() {
    let toState = null;
    applyToAll(o => {
      if (toState === null) {
        toState = !o.visible
      }
      o.visible = toState
    });
  }
  function _cycleColor() {
    applyToAll(o => o.__tcad_debug_materials.forEach(m =>  m.color.setHex(cycleColor(m.color.getHex()))));
  }
  return <span>
    <i className='fa fa-fw fa-eye-slash clickable' onClick={tweak}/>
    <i className='fa fa-fw fa-paint-brush clickable' onClick={_cycleColor}/>
  </span>;
}

export function ActiveLabel({viewObjectsProvider, group3d, category, context, topoObj, children, ...props}) {
  const applyToAll = createObjectsUpdater(viewObjectsProvider, group3d, category, context, topoObj);
  function onMouseEnter() {
    applyToAll(o => {
      if (o.__tcad_debug_last_visible === undefined) {
        o.__tcad_debug_last_visible = o.visible;
      }
      o.__tcad_debug_materials.forEach(m => {
        m.opacity = 0.7;
        m.transparent = true;
      });
      o.visible = true;
    })
  }
  function onMouseLeave() {
    applyToAll(o => {
      if (o.__tcad_debug_last_visible !== undefined) {
        o.visible = o.__tcad_debug_last_visible;
        o.__tcad_debug_last_visible = undefined;
      }
      o.__tcad_debug_materials.forEach(m => {
        m.opacity = 1;
        m.transparent = false;
      });
    });
  }
  return <span {...{onMouseEnter, onMouseLeave, ...props}}>{children}</span>;
} 

export function InteractiveSection({viewObjectsProvider, topoObj, group3d, category, context, name, closable, defaultClosed, children}) {
  const ctrlProps = {viewObjectsProvider, topoObj, group3d, category, context};
  const controls = <Controls {...ctrlProps} />;
  const nameCtrl = <ActiveLabel {...ctrlProps}>{name}</ActiveLabel>;
  return <Section name={nameCtrl} tabs={TAB} {...{closable, defaultClosed, controls}} >
    {children}
  </Section>

}

export const TAB = '0.5';
