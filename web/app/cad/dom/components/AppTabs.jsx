import React, {Fragment} from 'react';

import View3d from './View3d';

import ls from './AppTabs.less';

import TabSwitcher, {Tab} from 'ui/components/TabSwticher';
import connect from 'ui/connect';

import {TOKENS as APP_TABS_TOKENS} from "../appTabsPlugin";
import Card from "../../../../../modules/ui/components/Card";

function AppTabs({activeTab, tabs, switchTo, close, detach}) {
  return <div className={ls.root}>

    <div className={ls.content}>

      <Card visible={activeTab < 0}>
        <View3d/>
      </Card>
      
      {tabs.map(({id, url}, index) =>
        <Card key={id} visible={index === activeTab}>
          <FrameView url={url}/>
        </Card>)}
    </div>

    <TabSwitcher className={ls.contentSwitcher}>

      <Tab label='3D View' active={activeTab < 0} readOnly={true} onSwitch={switchTo.bind(null, -1)}/>

      {tabs.map(({label, id}, index) => {
        const bind = func => e => {
          func(index);
          e.stopPropagation();
        };
        return <Tab label={label} active={index === activeTab}
                    key={id} readOnly={false}
                    onClose={bind(close)}
                    onDetach={bind(detach)}
                    onSwitch={bind(switchTo)}/>
      })}
    </TabSwitcher>
  </div>
}

export default connect(AppTabs, APP_TABS_TOKENS.TABS, {
  mapActions: ({dispatch, updateState}) => ({
    switchTo: index => updateState(APP_TABS_TOKENS.TABS, ({tabs}) => ({tabs, activeTab: index})),
    close: index => updateState(APP_TABS_TOKENS.TABS, ({activeTab, tabs}) => {
      tabs.splice(index, 1);
      return {
        activeTab: (activeTab === index ? -1 : activeTab),
        tabs
      };
    }),
    detach: index => dispatch(APP_TABS_TOKENS.DETACH, index)
  })
});

export function FrameView({url}) {
  return <iframe src={url} style={{width: '100%', height: '100%'}}/>
}