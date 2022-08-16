import React from 'react';
import connect from 'ui/connect';
import {Section} from 'ui/components/Section';
import {constant} from 'lstream';
import ls from './ObjectExplorer.less';
import cx from 'classnames';
import {MShell} from 'cad/model/mshell';
import {MDatum} from 'cad/model/mdatum';
import mapContext from 'ui/mapContext';
import decoratorChain from 'ui/decoratorChain';
import {MOpenFaceShell} from "cad/model/mopenFace";

export default connect(streams => streams.craft.models.map(models => ({models})))
(function ObjectExplorer({models}) { // eslint-disable-line no-unexpected-multiline

  return <div> {models.map(m => {
    if (m instanceof MOpenFaceShell) {
      return <OpenFaceSection shell={m}/>
    } else if (m instanceof MShell) {
      return <ModelSection type='shell' model={m} key={m.id}>
        <Section label='faces' defaultOpen={true}>
          {
            m.faces.map(f => <FaceSection face={f} key={f.id}/>)
          }
        </Section>
        <Section label='edges' defaultOpen={true}>
          {m.edges.map(e => <EdgeSection edge={e} key={e.id}/>)}
        </Section>

      </ModelSection>
    } else if (m instanceof MDatum) {
      return <ModelSection type='datum' model={m} key={m.id}/>;
    } else {
      return null;
    }
  })}
  </div>
});

function EdgeSection({edge}) {
  return <ModelSection type='edge' model={edge} key={edge.id}>
    {edge.adjacentFaces.map(f => <FaceSection face={f} key={f.id}/>)}
  </ModelSection>
}

function FaceSection({face}) {
  return <ModelSection type='face' model={face} key={face.id}>

    {(face.productionInfo && face.productionInfo.role) &&
    <Section label={<span>role: {face.productionInfo.role}</span>}/>}
    {(face.productionInfo && face.productionInfo.originatedFromPrimitive) &&
    <Section label={<span>origin: {face.productionInfo.originatedFromPrimitive}</span>}/>}
    <SketchesList face={face}/>
    {face.edges && <Section label='edges' defaultOpen={false}>
      {face.edges.map(e => <EdgeSection edge={e} key={e.id}/>)}
    </Section>}
  </ModelSection>;
}

function SketchesList({face}) {
  return <Section
    label={face.sketchObjects.length ? 'sketch' : <span className={ls.hint}>{'<no sketch assigned>'}</span>}>
    {face.sketchObjects.map(o => <div key={o.id}>{o.id + ':' + o.sketchPrimitive.constructor.name}</div>)}
  </Section>;
}

const ModelSection = decoratorChain(
  mapContext((ctx, props) => ({
    select: () => ctx.services.pickControl.pick(props.model)
  })),
  connect((streams, props) => (streams.selection[props.type] || constant([])).map(selection => ({selection}))))
( // eslint-disable-line no-unexpected-multiline
  function ModelSection({model, type, typeLabel, selection, select, ...props}) {
    const labelClasses = cx(ls.modelLabel, {
      [ls.selected]: selection.indexOf(model.id) !== -1
    });
    const label = <span className={labelClasses}>
      <span onClick={select}>{typeLabel||type} {model.id}</span>
    </span>;
    return <Section label={label} {...props}/>;
  }
);

function OpenFaceSection({shell}) {
  return <ModelSection type='face' model={shell.face} key={shell.face.id} typeLabel='surface'>
    <SketchesList face={shell.face}/>
  </ModelSection>;
}

