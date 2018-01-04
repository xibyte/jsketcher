//import {DefaultMouseEvent} from '../app/3d/ui/utils'

export class Menu {
  
  constructor(actions) {
    //this.mouseInfo = new DefaultMouseEvent();
    this.actions = actions;
    this.popup = $('#popup-menu');
    $(document)
      .on('mousemove', (e) => this.mouseInfo = e)
      .on('click', (e) => this.popup.hide())
      .on('contextmenu', (e) => {
        const target = $(e.target).closest('.right-click-menu');
        if (target.length == 0) return true;
        return this.onShowMenu(e, target);
      });
  }
  
  onShowMenu(e, target) {
    const popup = this.popup;
    popup.empty();
    const actions = target.data('menu').split(',').map(s => s.trim());
    for (let actionId of actions) {
      const action = this.actions[actionId];
      if (action) {
        popup.append($('<div>', {text: action.label, 'class': 'menu-item'}).click(() => {
          popup.hide();
          action.invoke(target)
        }))
      }
    }
    popup.show();
    popup.offset({
      left: e.pageX,
      top: e.pageY
    });
    return false;
  }
}
