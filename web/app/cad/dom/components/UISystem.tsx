import React, {useContext} from 'react';
import MenuHolder from '../menu/MenuHolder';

import ActionInfo from '../actionInfo/ActionInfo';
import {stream} from 'lstream';
import {DocumentationWindow} from 'doc/DocumentationWindow';
import {Scope} from "../../../sketcher/components/Scope";
import {ReactApplicationContext} from "../ReactApplicationContext";


const onCloseAll = stream<void>();

export const UISystemContext = React.createContext(null);

export default function UISystem({children, ...props}) {

  const ctx = useContext(ReactApplicationContext);

  const uiCxt = {
    closeAllUpPopups: () => {
      ctx.services.menu.closeAll();
      ctx.actionService.showHintFor(null);
      onCloseAll.next();
    },
    onCloseAll
  };

  return <UISystemContext.Provider value={uiCxt}>
    <div {...props} onMouseDown={uiCxt.closeAllUpPopups}>
      <MenuHolder/>
      <ActionInfo/>
        {children}
      <Scope><DocumentationWindow/></Scope>
    </div>
  </UISystemContext.Provider>;
}

