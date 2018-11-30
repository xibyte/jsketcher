import React from 'react';

import {toIdAndOverrides} from '../../actions/actionRef';
import connect from 'ui/connect';
import Toolbar from 'ui/components/Toolbar';
import {ConnectedActionButton, ToolbarActionButtons} from './PlugableToolbar';
import ls from './HeadsUpToolbar.less';

export const HeadsUpToolbar = connect(streams => streams.ui.toolbars.headsUp.map(actions => ({actions})))(
  function HeadsUpToolbar({actions}) {
    return <Toolbar flat>
      <div className={ls.mainActions}>
        <ToolbarActionButtons actions={actions} />
      </div>

      <div className={ls.quickButtons}>
        <ConnectedActionButton size='small' actionId='Save' />
        <ConnectedActionButton size='small' actionId='StlExport' />
      </div>
    </Toolbar>
  }
);
