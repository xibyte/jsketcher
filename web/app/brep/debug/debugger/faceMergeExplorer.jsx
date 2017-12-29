import React, {Fragment} from 'react';
import {FaceExplorer} from "./shellExplorer";
import Section from './section';
import {
  getFacesViewObjects, InteractiveSection, TAB,
} from "./utils";


export function FaceMergeExplorer({overlappingFacesGroups, group3d}) {
  let category = 'overlapping-faces';
  let context = {overlappingFacesGroups};
  return <InteractiveSection name='overlapping faces' closable defaultClosed={false}
                             {...{viewObjectsProvider: overlappingFacesViewer, topoObj: overlappingFacesGroups, group3d, category, context}}>

    { overlappingFacesGroups.map((group, groupIndex) => {
      let [groupA, groupB] = group;
      return <InteractiveSection key={groupIndex} name='merge group' closable defaultClosed={true}
                                 {...{viewObjectsProvider: overlappingGroupViewer, topoObj: group, group3d, category, context: group}}>
        <InteractiveSection name='from A' closable defaultClosed={false}
                            {...{viewObjectsProvider: getFacesViewObjects, topoObj: groupA, group3d, category, context}}>
          {groupA.map((face, i) => <FaceExplorer key={i} {...{face, group3d, category, context}} />)}
        </InteractiveSection>
        <InteractiveSection name='from B' closable defaultClosed={false}
                            {...{viewObjectsProvider: getFacesViewObjects, topoObj: groupB, group3d, category, context}}>
          {groupB.map((face, i) => <FaceExplorer key={i} {...{face, group3d, category, context}} />)}
        </InteractiveSection>
      </InteractiveSection>
    })}
  </InteractiveSection>

}

function overlappingFacesViewer(group3d, category, context, out, groups) {
  for (let [groupA, groupB] of groups) {
    getFacesViewObjects(group3d, category, context, out, groupA);
    getFacesViewObjects(group3d, category, context, out, groupB);
  }
}

function overlappingGroupViewer(group3d, category, context, out, [groupA, groupB]) {
  getFacesViewObjects(group3d, category, context, out, groupA);
  getFacesViewObjects(group3d, category, context, out, groupB);
}
