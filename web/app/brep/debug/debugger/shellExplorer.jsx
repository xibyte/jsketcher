import React from 'react';
import Section from "./section";

export default class ShellExplorer extends React.PureComponent {

  render() {
    let {shell, group3d} = this.props;
    
    return <div className='shell-explorer'>
      <Section name={`shell ${shell.refId}`} closable>
        {shell.faces.map(face => <FaceExplorer key={face.refId} {...{face, group3d}} />)}
      </Section>
    </div>;
  }
}

function FaceExplorer({face, group3d}) {
  let controls = <Controls group3d={group3d} geomProvider={faceGeomProvider(face)}/>
  return <Section name={`face ${face.refId}`} tabs={TAB} closable defaultClosed={true} controls={controls}>
    {mapIterator(face.loops, loop => <LoopExplorer key={loop.refId} {...{loop, group3d}} />)}    
  </Section>
}

function LoopExplorer({loop, group3d}) {
  let controls = <Controls />
  return <Section name={`loop ${loop.refId}`} tabs={TAB} closable defaultClosed={true} controls={controls}>
    {mapIterator(loop.halfEdges, edge => <EdgesExplorer key={edge.refId} {...{edge, group3d}}/>)}    
  </Section>
}

function EdgesExplorer({edge, group3d}) {
  let controls = <Controls />
  return <Section name={`edge ${edge.refId}`} tabs={TAB} closable defaultClosed={true} controls={controls}>
    <Section key={edge.vertexA.refId} name={`vertex A ${edge.vertexA.refId}`} closable tabs={TAB} controls={<Controls />} />
    <Section key={edge.vertexB.refId} name={`vertex B ${edge.vertexB.refId}`} closable tabs={TAB} controls={<Controls />} />
  </Section>
}

function faceGeomProvider(face) {
  let pr = new CompositeGeomProvider();
  for (let loop of face.loop) {
    pr.add(loopGeomPropvider(loop));
  }
  return pr;  
}

function loopGeomProvider(loop) {
  let pr = new CompositeGeomProvider();
  for (let edge of loop.halfEdges) {
    pr.add(edgeGeomPropvider(loop));
  }
  return pr;  
}

function edgeGeomProvider(edge) {
  return GeomProvider(edge.refId, () => );
}



function mapIterator(it, fn) {
  const out = [];
  for (let i of it) {
    out.push(fn(i));
  }
  return out;
}

function Controls({topoObj}) {
  return <span>
    <i className='fa fa-fw fa-eye clickable' onClick={alert}/>
    <i className='fa fa-fw fa-eye-slash clickable' onClick={alert}/>
  </span>;  
}

const TAB = '0.5';

