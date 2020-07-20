import React from 'react';

import 'ui/styles/global/index.less';
import AppTabs from "./AppTabs";
import {StreamsContext} from "ui/streamsContext";
import {AppContext} from "./AppContext";

export default function WebApplication(props) {
  const {appContext} = props;
  return <StreamsContext.Provider value={appContext}>
    <AppContext.Provider value={appContext}>
      <AppTabs/>
    </AppContext.Provider>
  </StreamsContext.Provider>
}
