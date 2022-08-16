import React from 'react';
import {FaceExplorer} from "./shellExplorer";
import Section from './section';
import {
  getFacesViewObjects, InteractiveSection, TAB,
} from "./utils";


export function FaceFilterExplorer({connectedToAffectedFaces, allFaces, group3d}) {
  connectedToAffectedFaces = connectedToAffectedFaces || [];
  allFaces = allFaces || [];
  const notConnectedToAffectedFaces = allFaces.filter(f => connectedToAffectedFaces.indexOf(f) === -1);
  const category = 'face-filter';
  const context = {connectedToAffectedFaces, notConnectedToAffectedFaces};
  return <InteractiveSection name='analyzed faces' closable defaultClosed={false} 
                      {...{viewObjectsProvider: getFacesViewObjects, topoObj: allFaces, group3d, category, context}}>

    <Section name='connected to affected' tabs={TAB} accent>
      {connectedToAffectedFaces.length  === 0 ? '<empty>' : null }
      {connectedToAffectedFaces.map((face, i) => <FaceExplorer key={i} {...{face, group3d, category, context}} />)}
    </Section>
    <Section name='not connected to affected' tabs={TAB} accent>
      {notConnectedToAffectedFaces.length  === 0 ? '<empty>' : null }
      {notConnectedToAffectedFaces.map((face, i) => <FaceExplorer key={i} {...{face, group3d, category, context}} />)}
    </Section>
  </InteractiveSection>

}
