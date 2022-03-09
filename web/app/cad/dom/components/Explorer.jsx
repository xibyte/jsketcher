import React from 'react';
import ObjectExplorer from '../../craft/ui/ObjectExplorer';
import ls from './Explorer.less';

export function Explorer() {
  return <div className={ls.root}>
    <ObjectExplorer />
  </div>;
}