import React from 'react';
import {FaceExplorer} from "./shellExplorer";
import {
  getCurveViewObjects, getEdgesViewObjects, getFacesViewObjects, getPointViewObjects,
  InteractiveSection
} from "./utils";


export function FaceIntersectionsExplorer({faceIntersection, id, group3d}) {
  const category='face-intersections';
  const context = faceIntersection;
  const {faceA, faceB, curve, nodes} = faceIntersection;
  
  return <InteractiveSection name={`intersection ${id}`} closable defaultClosed={true}
                             {...{viewObjectsProvider: faceIntersectionsViewer, topoObj: faceIntersection, group3d, category, context}}>

    <FaceExplorer customName='Face A' face={faceA} {...{group3d, category, context}} />
    <FaceExplorer customName='Face B' face={faceB} {...{group3d, category, context}} />

    <InteractiveSection name='curve' closable
                        {...{viewObjectsProvider: getCurveViewObjects, topoObj: curve, group3d, category, context}} />

    <InteractiveSection name='nodes' closable defaultClosed={true}
                        {...{viewObjectsProvider: nodesViewer, topoObj: nodes, group3d, category, context}}>
      {nodes.map((node, i) => <InteractiveSection key={i} name='node' closable defaultClosed={true}
                                                  {...{viewObjectsProvider: nodeViewer, topoObj: node, group3d, category, context}}>

        <div><i>Enters: </i> {node.enters[0] && 'A' } {node.enters[1] && 'B' }</div>
        <div><i>Leaves: </i> {node.leaves[0] && 'A' } {node.leaves[1] && 'B' }</div>
      </InteractiveSection>)}
    </InteractiveSection>

  </InteractiveSection>
}

function faceIntersectionsViewer(group3d, category, context, out, {faceA, faceB, curve, nodes}) {
  getFacesViewObjects(group3d, category, context, out, [faceA, faceB]);
  getCurveViewObjects(group3d, category, context, out, curve);
  nodesViewer(group3d, category, context, out, nodes);
}

function nodesViewer(group3d, category, context, out, nodes) {
  nodes.forEach(n => nodeViewer(group3d, category, context, out, n));
}

function nodeViewer(group3d, category, context, out, nodes) {
  getPointViewObjects(group3d, category, context, out, nodes.point);
}
