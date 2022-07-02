import React from 'react';
import connect from 'ui/connect';
import Toolbar from 'ui/components/Toolbar';
import {ConnectedActionButton, ToolbarActionButtons} from './PlugableToolbar';
import ls from './HeadsUpToolbar.less';
import {combine} from 'lstream';

export const HeadsUpToolbar = connect(streams => combine(
    streams.ui.toolbars.headsUp,
    streams.ui.toolbars.headsUpShowTitles,
    streams.ui.toolbars.headsUpQuickActions).map(([actions, showTitles, quickActions]) => ({actions, showTitles, quickActions})))(
  function HeadsUpToolbar({actions, showTitles, quickActions}) {
    return <Toolbar flat>
      <div className={ls.quickButtons}>
        {quickActions.map(actionId => <ConnectedActionButton size='small' key={actionId} actionId={actionId} />)}
      </div>
      <div className={ls.mainActions}>
        <ToolbarActionButtons actions={actions} showTitles={showTitles}/>
      </div>
    </Toolbar>
  }
);
