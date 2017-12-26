import React, {Fragment as FR} from 'react';
import Section from "./section";
import {
  ActiveLabel, Controls, getEdgesViewObjects, getEdgeViewObjects, getFacesViewObjects, getFaceViewObjects,
  getLoopsViewObjects,
  getLoopViewObjects,
  getVertexViewObjects, InteractiveSection, mapIterable,
  TAB
} from "./utils";

export default class ShellExplorer extends React.PureComponent {

  render() {
    let {shell, group3d} = this.props;

    let category='default';
    let context = null;
    let faces = shell ? shell.faces : [];
    
    return <InteractiveSection name={`shell ${shell ? shell.refId : 'UNAVAILABLE'}`} closable defaultClosed={false}
                               {...{viewObjectsProvider: getFacesViewObjects, topoObj: faces, group3d, category, context}}>
        {faces.map(face => <FaceExplorer key={face.refId} {...{face, group3d, category, context}} />)}
    </InteractiveSection>;
  }
}

export function FaceExplorer({face, group3d, customName, category, context}) {
  return <LoopsExplorer loops={face.loops} {...{group3d, category, context}} name={getName('face', customName, face)} />
}

export function LoopsExplorer({loops, group3d, name, category, context}) {
  let ctrlProps = {
    viewObjectsProvider: getLoopsViewObjects, topoObj: loops, group3d, category, context
  };
  let controls = <Controls {...ctrlProps} />;
  let nameComp = <ActiveLabel {...ctrlProps}>{name}</ActiveLabel>;
  return <Section name={nameComp} tabs={TAB} closable defaultClosed={true} controls={controls}>
    {mapIterable(loops, loop => <LoopExplorer key={loop.refId} {...{loop, group3d, category, context}} />)}
  </Section>
}

export function LoopExplorer({loop, group3d, customName, category, context}) {
  let highlightProps = {
    viewObjectsProvider: getEdgesViewObjects, topoObj: loop.halfEdges, group3d, category, context
  };

  return <InteractiveSection name={getName('loop', customName, loop)} tabs={TAB} closable defaultClosed={true} {...highlightProps}>
    {mapIterable(loop.halfEdges, edge => <EdgeExplorer key={edge.refId} {...{edge, group3d, category, context}}/>)}
    {loop.face && <FaceExplorer face={loop.face} {...{group3d, category, context}} />}
  </InteractiveSection>

}

export function EdgesExplorer({edges, group3d, name, category, context}) {
  let ctrlProps = {
    viewObjectsProvider: getEdgesViewObjects, topoObj: edges, group3d, category, context
  };
  let controls = <Controls {...ctrlProps} />;
  let nameCtrl = <ActiveLabel {...ctrlProps}>{name}</ActiveLabel>;

  return <Section name={nameCtrl} tabs={TAB} closable defaultClosed={true} controls={controls}>
    {mapIterable(edges, edge => <EdgeExplorer key={edge.refId} {...{edge, group3d, category, context}}/>)}
  </Section>
}

export function EdgeExplorer({edge, group3d, customName, category, context}) {
  let ctrlProps = {
    viewObjectsProvider: getEdgeViewObjects, topoObj: edge, group3d, category, context
  };
  let controls = <Controls {...ctrlProps} />;
  let name = <ActiveLabel {...ctrlProps}>{getName('edge', customName, edge)}</ActiveLabel>;
  let twin = edge.twin();
  
  return <Section name={name} tabs={TAB} closable defaultClosed={true} controls={controls}>
    {twin && <FR>
      {twin.loop && <FR>
        <LoopExplorer loop={twin.loop} customName='t-loop' {...{group3d, category, context}} />
        {twin.loop.face && <FaceExplorer face={twin.loop.face} customName='t-face' {...{group3d, category, context}} />}
        <EdgeExplorer edge={twin} customName='twin' {...{group3d, category, context}} />
      </FR>}
    </FR>}
    {edge.loop && <LoopExplorer loop={edge.loop} {...{group3d, category, context}} />}
    <VertexExplorer vertex={edge.vertexA} customName='vertex A' {...{group3d, category, context}} />
    <VertexExplorer vertex={edge.vertexB} customName='vertex B' {...{group3d, category, context}} />
  </Section>
}

export function VertexExplorer({vertex, group3d, customName, category, context}) {
  let ctrlProps = {
    viewObjectsProvider: getVertexViewObjects, topoObj: vertex, group3d, category, context
  };
  let controls = <Controls {...ctrlProps} />;
  let name = <ActiveLabel {...ctrlProps}>{getName('vertex', customName, vertex)}</ActiveLabel>;

  return <Section name={name} closable tabs={TAB} controls={controls} />
}


function getName(name, customName, topoObj) {
  return (customName || name) + ' ' + topoObj.refId;
}


