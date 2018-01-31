import React, {Fragment} from 'react';
import ObjectExplorer from './ObjectExplorer';
import OperationHistory from './OperationHistory';
import Folder from 'ui/components/Folder';
import Fa from '../../../../../modules/ui/components/Fa';

export default function PartPanel() {
  return <Fragment>
    <Folder title={<span> <Fa fw icon='cubes' /> Model</span>}>
      <ObjectExplorer/>
    </Folder>
    <Folder title={<span> <Fa fw icon='history' /> Modifications</span>}>
      <OperationHistory/>
    </Folder>
  </Fragment>;
}