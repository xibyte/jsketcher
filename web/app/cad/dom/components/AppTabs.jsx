import React, {useContext} from 'react';

import View3d from './View3d';

import ls from './AppTabs.less';

import TabSwitcher, {Tab} from 'ui/components/TabSwticher';
import Card from "ui/components/Card";
import {useStreamWithUpdater} from "ui/effects";
import {ReactApplicationContext} from "../ReactApplicationContext";

export default function AppTabs() {

  const [{tabs, activeTab}, updateTabs] = useStreamWithUpdater(ctx => ctx.appTabsService.tabs$);
  const ctx = useContext(ReactApplicationContext);

  const switchTo = index => updateTabs(({tabs}) => ({tabs, activeTab: index}));

  const close = index => updateTabs(({activeTab, tabs}) => {
    tabs.splice(index, 1);
    return {
      activeTab: (activeTab === index ? -1 : activeTab),
      tabs
    };
  });

  const detach = index => ctx.appTabsService.detach(index);

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

    <TabSwitcher className={ls.contentSwitcher + ' small-typography'}>

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

export function FrameView({url}) {
  return <iframe src={url} style={{width: '100%', height: '100%'}}/>
}