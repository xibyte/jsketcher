import {state} from 'lstream';

export function activate({services, streams}) {

  streams.ui.menu = {
    all: state([]),
    opened: state([]),
    states: {}
  };
  
  function registerMenus(menus) {
    let menusToAdd = [];
    let showMenuActions = [];
    menus.forEach(({id, actions, ...appearance}) => {
      let menuState = state({
        visible: false,
        orientationUp: false,
        x: undefined,
        y: undefined
      });
      streams.ui.menu.states[id] = menuState;
      if (!appearance.label) {
        appearance.label = id;
      }
      showMenuActions.push({
        id: 'menu.' + id,
        appearance,
        invoke: (ctx, hints) => {
          menuState.mutate(v => {
            Object.assign(v, hints);
            v.visible = true;
          });
          streams.ui.menu.opened.mutate(v => v.push(id));
        }
      });
      menusToAdd.push({id, actions});
    });
    services.action.registerActions(showMenuActions);
    streams.ui.menu.all.update(menus => [...menus, ...menusToAdd]);
  }

  function closeAll() {
    if (streams.ui.menu.opened.value.length > 0) {
      streams.ui.menu.opened.value.forEach(id => streams.ui.menu.states[id].mutate(s => s.visible = false));
      streams.ui.menu.opened.mutate(opened => opened.length = 0);
    }
  }
  
  services.menu = { registerMenus, closeAll }
}

export function isMenuAction(actionId) {
  return actionId.startsWith('menu.');
}

