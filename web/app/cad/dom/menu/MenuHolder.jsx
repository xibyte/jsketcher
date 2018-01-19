import React, {Fragment} from 'react';
import connect from 'ui/connect';
import {TOKENS as MENU_TOKENS} from './menuPlugin';
import {TOKENS as ACTION_TOKENS} from '../../actions/actionSystemPlugin';
import Menu, {MenuItem, MenuSeparator} from "../../../../../modules/ui/components/Menu";
import Fa from "../../../../../modules/ui/components/Fa";
import Filler from "../../../../../modules/ui/components/Filler";
import {TOKENS as KeyboardTokens} from "../../keyboard/keyboardPlugin";

function MenuHolder({menus}) {
  return menus.map(({id, actions}) => {
    let menuToken = MENU_TOKENS.menuState(id);
    let connectedMenu = connect(ActionMenu, [menuToken, KeyboardTokens.KEYMAP], {
      staticProps: {actions},
      mapProps: [,keymap => ({keymap})]
    });
    return React.createElement(connectedMenu, {key: id});
  }); 
}

function ActionMenu({actions, keymap, ...props}) {
  return <Menu {...props}>
    {actions.map((action, index)=> {
      if (action === '-') {
        return <MenuSeparator key={index} />
      }
      const runToken = ACTION_TOKENS.actionRun(action);
      return React.createElement(
        connect(ActionMenuItem, [ACTION_TOKENS.actionState(action), ACTION_TOKENS.actionAppearance(action)], { 
          staticProps: {hotKey: keymap[action]}, 
          mapActions: dispatch => ({
            onClick: () => dispatch(runToken) 
          })
        }), {key: action});  
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


export default connect(MenuHolder, MENU_TOKENS.MENUS, {
  mapProps: ([menus]) => ({menus})
});



