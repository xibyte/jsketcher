import React from 'react';
import connect from 'ui/connect';
import {Section} from 'ui/components/Section';
import Fa from 'ui/components/Fa';
import {constant} from 'lstream';
import ls from './ObjectExplorer.less';
import cx from 'classnames';
import {MShell} from '../../model/mshell';
import {MDatum} from '../../model/mdatum';
import mapContext from 'ui/mapContext';
import decoratorChain from 'ui/decoratorChain';

export default connect(streams => streams.craft.models.map(models => ({models})))
(function ObjectExplorer({models}) {

  return models.map(m => (m instanceof MShell) ? <ModelSection type='shell' model={m} defaultOpen={true} key={m.id}>
    <Section label='faces' defaultOpen={true}>
      {
        m.faces.map(f => <FaceSection face={f} key={f.id} />)
      }
    </Section>
    <Section label='edges' defaultOpen={true}>
      {m.edges.map(e => <EdgeSection edge={e} key={e.id} />)}
    </Section>

  </ModelSection> : (m instanceof MDatum) ? <ModelSection type='datum' model={m} defaultOpen={true}/> : null);

});

function EdgeSection({edge}) {
  return <ModelSection type='edge' model={edge} key={edge.id}>
    {edge.adjacentFaces.map(f => <FaceSection face={f} key={f.id}/>)}
  </ModelSection>
}

function FaceSection({face}) {
  return <ModelSection type='face' model={face} key={face.id}>

    {(face.productionInfo && face.productionInfo.role) && <Section label={<span>role: {face.productionInfo.role}</span>} />}
    {(face.productionInfo && face.productionInfo.originatedFromPrimitive) && <Section label={<span>origin: {face.productionInfo.originatedFromPrimitive}</span>} />}
    <Section label={face.sketchObjects.length ? 'sketch' : <span className={ls.hint}>{'<no sketch assigned>'}</span>}>
      {face.sketchObjects.map(o => <div key={o.id}>{o.id + ':' + o.sketchPrimitive.constructor.name}</div>)}
    </Section>
    {face.edges && <Section label='edges' defaultOpen={false}>
      {face.edges.map(e => <EdgeSection edge={e} key={e.id}/>)}
    </Section>}
  </ModelSection>;
}

const ModelSection = decoratorChain(
  mapContext((ctx, props) => ({
    select: () => ctx.services.pickControl.pick(props.model)
  })),
  connect((streams, props) => (streams.selection[props.type] || constant([])).map(selection => ({selection}))))
(
  function ModelSection({model, type, selection, select, ...props}) {
    let labelClasses = cx(ls.modelLabel, {
      [ls.selected]: selection.indexOf(model.id) !== -1
    });
    let label = <span className={labelClasses}><CommonControls/>
      <span onClick={select}>{type} {model.id}</span>
    </span>;
    return <Section label={label} {...props}/>;
  }
);

function CommonControls() {
  return <React.Fragment>
    <Fa fw icon='crosshairs'/>
  </React.Fragment>;
}
