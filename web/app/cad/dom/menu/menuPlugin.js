import {createToken} from 'bus';

export function activate({bus, services}) {

  bus.enableState(TOKENS.MENUS, []);
  bus.enableState(TOKENS.OPENED, []);
  
  function registerMenus(menus) {
    let menusToAdd = [];
    let showMenuActions = [];
    menus.forEach(({id, actions, ...appearance}) => {
      let stateToken = TOKENS.menuState(id);
      bus.enableState(stateToken, {
        visible: false,
        orientationUp: false,
        x: undefined,
        y: undefined
      });
      if (!appearance.label) {
        appearance.label = id;
      }
      showMenuActions.push({
        id: 'menu.' + id,
        appearance,
        invoke: (ctx, hints) => bus.updateStates([stateToken, TOKENS.OPENED], 
          ([state, opened]) => [Object.assign(state, {visible: true}, hints), [id, ...opened]]
        )
      });
      
      menusToAdd.push({id, actions});
    });
    services.action.registerActions(showMenuActions);
    bus.updateState(TOKENS.MENUS, menus => [...menus, ...menusToAdd]);
  }

  bus.subscribe(TOKENS.CLOSE_ALL, () => {
    bus.state[TOKENS.OPENED].forEach(openedMenu => bus.setState(TOKENS.menuState(openedMenu), {visible: false}));
    bus.updateState(TOKENS.OPENED, () => []);
  });
  
  services.menu = { registerMenus }
}

export const TOKENS = {
  menuState: id => createToken('menu', 'state', id),
  MENUS: createToken('menus'),
  CLOSE_ALL: createToken('menus', 'closeAll'),
  OPENED: createToken('menus', 'opened')
};

