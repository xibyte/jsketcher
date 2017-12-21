import React from 'react';
import Section from "./section";
import {
  ActiveLabel, Controls, getEdgeViewObjects, getFaceViewObjects, getLoopViewObjects, getVertexViewObjects, mapIterable,
  TAB
} from "./utils";

export default class ShellExplorer extends React.PureComponent {

  render() {
    let {shell, group3d} = this.props;
    
    return <div className='shell-explorer'>
      <Section name={`shell ${shell.refId}`} closable>
        {shell.faces.map(face => <FaceExplorer key={face.refId} {...{face, group3d}} category='default' />)}
      </Section>
    </div>;
  }
}

export function FaceExplorer({face, group3d, customName, category}) {
  if (!category) throw 'no category';
  let ctrlProps = {
    viewObjectsProvider: getFaceViewObjects, topoObj: face, group3d, category
  };
  let controls = <Controls {...ctrlProps} />;
  let name = <ActiveLabel {...ctrlProps}>{getName('face', customName, face)}</ActiveLabel>
  return <Section name={name} tabs={TAB} closable defaultClosed={true} controls={controls}>
    {mapIterable(face.loops, loop => <LoopExplorer key={loop.refId} {...{loop, group3d, category}} />)}    
  </Section>
}

export function LoopExplorer({loop, group3d, customName, category}) {
  if (!category) throw 'no category';
  let ctrlProps = {
    viewObjectsProvider: getLoopViewObjects, topoObj: loop, group3d, category
  };
  let controls = <Controls {...ctrlProps} />;
  let name = <ActiveLabel {...ctrlProps}>{getName('loop', customName, loop)}</ActiveLabel>;
  
  return <Section name={name} tabs={TAB} closable defaultClosed={true} controls={controls}>
    {mapIterable(loop.halfEdges, edge => <EdgesExplorer key={edge.refId} {...{edge, group3d, category}}/>)}    
  </Section>
}

export function EdgesExplorer({edge, group3d, customName, category}) {
  if (!category) throw 'no category';
  let ctrlProps = {
    viewObjectsProvider: getEdgeViewObjects, topoObj: edge, group3d, category
  };
  let controls = <Controls {...ctrlProps} />;
  let name = <ActiveLabel {...ctrlProps}>{getName('edge', customName, edge)}</ActiveLabel>;
  let twin = edge.twin();
  
  return <Section name={name} tabs={TAB} closable defaultClosed={true} controls={controls}>
    {twin && [
      twin.loop && [<LoopExplorer loop={twin.loop} customName='t-loop' {...{group3d, category}} />,
      twin.loop.face &&<FaceExplorer face={twin.loop.face} customName='t-face' {...{group3d, category}} />],
      <EdgesExplorer edge={twin} customName='twin' {...{group3d, category}} />
    ]}
    <VertexExplorer vertex={edge.vertexA} customName='vertex A' {...{group3d, category}} />
    <VertexExplorer vertex={edge.vertexB} customName='vertex B' {...{group3d, category}} />

  </Section>
}

export function VertexExplorer({vertex, group3d, customName, category}) {
  if (!category) throw 'no category';
  let ctrlProps = {
    viewObjectsProvider: getVertexViewObjects, topoObj: vertex, group3d, category
  };
  let controls = <Controls {...ctrlProps} />;
  let name = <ActiveLabel {...ctrlProps}>{getName('vertex', customName, vertex)}</ActiveLabel>;

  return <Section name={name} closable tabs={TAB} controls={controls} />
}


function getName(name, customName, topoObj) {
  return (customName || name) + ' ' + topoObj.refId;
}


