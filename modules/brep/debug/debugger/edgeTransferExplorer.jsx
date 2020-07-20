import React from 'react';
import {EdgeExplorer, FaceExplorer} from "./shellExplorer";
import {
  getEdgesViewObjects, getEdgeViewObjects,
  getFaceViewObjects,
  getViewObjectsComposite,
  InteractiveSection
} from "./utils";


export function EdgeTransferExplorer({edge, face, chosenEdge, index, group3d}) {
  let category='edge-transfer';

  let chosenFace = chosenEdge ? chosenEdge.loop.face : null;
  let discardedFace = chosenEdge ? chosenEdge.twin().loop.face : null;
  let context = {edge, face, chosenEdge, chosenFace, discardedFace};
  
  return <InteractiveSection name={`transfer ${index}`} closable defaultClosed={true}
                                                                     {...{viewObjectsProvider: getEdgeTransferViewObjects, topoObj: context, group3d, category, context}}>
    <EdgeExplorer customName='edge' {...{edge, group3d, category, context}} />
    <FaceExplorer customName='on face' {...{face, group3d, category, context}} />
    <EdgeExplorer customName='chosen edge' edge={chosenEdge} {...{group3d, category, context}} />
    {chosenFace && <FaceExplorer customName='chosen face' {...{face: chosenFace, group3d, category, context}} />}
    {discardedFace && <FaceExplorer customName='discarded face' {...{face: discardedFace, group3d, category, context}} />}
  </InteractiveSection>
  
} 

function getEdgeTransferViewObjects(group3d, category, context, out, {edge, face, chosenFace, discardedFace}) {
  getEdgeViewObjects(group3d, category, context, out, edge);
  getFaceViewObjects(group3d, category, context, out, face);
  if (chosenFace) {
    getFaceViewObjects(group3d, category, context, out, chosenFace);
  }
  if (discardedFace) {
    getFaceViewObjects(group3d, category, context, out, discardedFace);
  }
} 