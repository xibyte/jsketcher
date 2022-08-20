import React from 'react';

import 'ui/styles/global/index.less';
import AppTabs from "./AppTabs";
import {StreamsContext} from "ui/streamsContext";
import {ReactApplicationContext} from "../ReactApplicationContext";
import {Debugger} from "debugger/Debugger";

export default function WebApplication(props) {
  const {appContext} = props;
  return <StreamsContext.Provider value={appContext}>
    <Debugger />
    <ReactApplicationContext.Provider value={appContext}>
      <AppTabs/>
    </ReactApplicationContext.Provider>
  </StreamsContext.Provider>
}
