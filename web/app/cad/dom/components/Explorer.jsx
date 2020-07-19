import React from 'react';
import decoratorChain from 'ui/decoratorChain';
import connect from 'ui/connect';
import mapContext from 'ui/mapContext';
import {combine} from 'lstream';
import ObjectExplorer from '../../craft/ui/ObjectExplorer';
import ls from './Explorer.less';

function Explorer() {
  return <div className={ls.root}>
    <ObjectExplorer />
  </div>;
}

export default decoratorChain(
  connect(streams => combine(
    
  )),
  mapContext(ctx => ({}))
)(Explorer);