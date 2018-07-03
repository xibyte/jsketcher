import React from 'react';
import connect from '../../../../../modules/ui/connect';
import {Section} from '../../../../../modules/ui/components/Section';
import {MShell} from '../../model/mshell';

export default connect(streams => streams.craft.models.map(models => ({models})))
(function ObjectExplorer({models}) {

  return models.map(m => <Section label={'shell ' + m.id}>
    <Section label='faces'>
      {
        m.faces.map(f => <Section label={'face ' + f.id}>
          <Section label='sketch'>
            {f.sketchObjects.map(o => <div>{o.id + ':' + o.sketchPrimitive.constructor.name}</div>)}
          </Section>
        </Section>)
      }
    </Section>
    <Section label='edges'>
      {
        m.faces.map(e => <Section label={'edge ' + e.id}>
        </Section>)
      }
    </Section>

  </Section>);

});
