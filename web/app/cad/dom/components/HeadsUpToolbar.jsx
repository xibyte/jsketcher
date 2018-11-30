import React from 'react';
import connect from 'ui/connect';
import Toolbar from 'ui/components/Toolbar';
import {ConnectedActionButton, ToolbarActionButtons} from './PlugableToolbar';
import ls from './HeadsUpToolbar.less';
import {combine} from '../../../../../modules/lstream';

export const HeadsUpToolbar = connect(streams => combine(
    streams.ui.toolbars.headsUp, 
    streams.ui.toolbars.headsUpQuickActions).map(([actions, quickActions]) => ({actions, quickActions})))(
  function HeadsUpToolbar({actions, quickActions}) {
    return <Toolbar flat>
      <div className={ls.mainActions}>
        <ToolbarActionButtons actions={actions} />
      </div>

      <div className={ls.quickButtons}>
        {quickActions.map(actionId => <ConnectedActionButton size='small' key={actionId} actionId={actionId} />)}
      </div>
    </Toolbar>
  }
);
