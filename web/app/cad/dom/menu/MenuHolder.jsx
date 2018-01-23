import React, {Fragment} from 'react';
import connect from 'ui/connect';
import {TOKENS as MENU_TOKENS} from './menuPlugin';
import {TOKENS as ACTION_TOKENS} from '../../actions/actionSystemPlugin';
import Menu, {MenuItem, MenuSeparator} from "../../../../../modules/ui/components/Menu";
import Fa from "../../../../../modules/ui/components/Fa";
import Filler from "../../../../../modules/ui/components/Filler";
import {TOKENS as KeyboardTokens} from "../../keyboard/keyboardPlugin";
import {DEFAULT_MAPPER} from "../../../../../modules/ui/connect";

function MenuHolder({menus}) {
  return menus.map(({id, actions}) => <ConnectedActionMenu key={id} menuId={id} actions={actions} />); 
}

function ActionMenu({actions, keymap, ...menuState}) {
  return <Menu {...menuState}>
    {actions.map((action, index) => {
      if (action === '-') {
        return <MenuSeparator key={index} />
      }
      return <ConnectedMenuItem key={action} actionId={action} hotKey={keymap[action]} />;  
    })}
  </Menu>;
}

function ActionMenuItem({label, cssIcons, icon32, icon96, onClick, enabled, hotKey, visible}) {
  if (!visible) {
    return null;
  }
  let icon, style;
  if (icon32 || icon96) {
    let size = 16;
    icon = <Filler width={size} height='1.18em'/>;
    style = {
      backgroundImage: `url(${icon32 || icon96})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${size}px ${size}px`,
      backgroundPositionY: 6,
      backgroundPositionX: 5,
    };
    if (!enabled) {
      style.filter = 'grayscale(90%)';
    }
  } else if (cssIcons) {
    icon = <Fa fw fa={cssIcons} />;    
  }
  
  return <MenuItem {...{label, icon,  style, disabled: !enabled, hotKey, onClick}} />;
}

const ConnectedActionMenu = connect(ActionMenu, 
  ({menuId}) => [MENU_TOKENS.menuState(menuId), KeyboardTokens.KEYMAP], 
  {
    mapProps: ([menuState, keymap], {actions}) => Object.assign({keymap, actions}, menuState)
  });


let ConnectedMenuItem = connect(ActionMenuItem, 
  ({actionId}) => [ACTION_TOKENS.actionState(actionId), ACTION_TOKENS.actionAppearance(actionId)], 
  {
    mapActions: ({dispatch}, {actionId}) => ({
      onClick: () => dispatch(ACTION_TOKENS.actionRun(actionId))
    }),
    mapSelfProps: ({hotKey}) => ({hotKey})
  }
);

export default connect(MenuHolder, MENU_TOKENS.MENUS, {
  mapProps: ([menus]) => ({menus})
});



