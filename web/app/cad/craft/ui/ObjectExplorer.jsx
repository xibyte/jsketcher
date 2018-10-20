import React from 'react';
import connect from 'ui/connect';
import {Section} from 'ui/components/Section';
import Fa from '../../../../../modules/ui/components/Fa';
import {constant} from '../../../../../modules/lstream';
import ls from './ObjectExplorer.less';
import cx from 'classnames';
import {MShell} from '../../model/mshell';
import {MDatum} from '../../model/mdatum';

export default connect(streams => streams.craft.models.map(models => ({models})))
(function ObjectExplorer({models}) {

  return models.map(m => (m instanceof MShell) ? <ModelSection type='shell' model={m} defaultOpen={true}>
    <Section label='faces' defaultOpen={true}>
      {
        m.faces.map(f => <ModelSection type='face' model={f}>
          <Section label={f.sketchObjects.length ? 'sketch' : <span className={ls.hint}>{'<no sketch assigned>'}</span>}>
            {f.sketchObjects.map(o => <div>{o.id + ':' + o.sketchPrimitive.constructor.name}</div>)}
          </Section>
        </ModelSection>)
      }
    </Section>
    <Section label='edges' defaultOpen={true}>
      {m.edges.map(e => <ModelSection type='edge' model={e} />)}
    </Section>

  </ModelSection> : (m instanceof MDatum) ? <ModelSection type='datum' model={m} defaultOpen={true}/> : null);

});

const ModelSection = connect((streams, props) => (streams.selection[props.type]||constant([])).map(selection => ({selection})))
(
  function ModelSection({model, type, selection, ...props}) {
    let labelClasses = cx(ls.modelLabel, {
      [ls.selected]: selection.indexOf(model.id) !== -1
    });
    let label = <span className={labelClasses}><CommonControls /> 
      {type} {model.id}
    </span>;
    return <Section label={label} {...props}/> 
  }
);

function CommonControls() {
  return <React.Fragment>
    <Fa fw icon='crosshairs'/>
  </React.Fragment>;
}
