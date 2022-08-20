import React from 'react';
import {EdgeExplorer, EdgesExplorer, FaceExplorer} from "./shellExplorer";
import {
  getEdgesViewObjects, getEdgeViewObjects,
  getFaceViewObjects,
  getViewObjectsComposite,
  InteractiveSection
} from "./utils";


export function MarkedEdgesExplorer({markedEdges, group3d}) {
  const category='marked-edges';
  const context = markedEdges.reduce((acc, v) => {acc[v.edge] = v; return acc}, {});
  const edges = markedEdges.map(e => e.edge);
  
  return <InteractiveSection name='marked edges' closable defaultClosed={false}
                             {...{viewObjectsProvider: getEdgesViewObjects, topoObj: edges, group3d, category, context}}>
    {edges.map(edge => <EdgeExplorer key={edge.refId} {...{edge, group3d, category, context}}/>)}
  </InteractiveSection>
}
