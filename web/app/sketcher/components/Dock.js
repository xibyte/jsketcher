import {createElement} from "../../utils/domUtils";

export class Dock {

  constructor(dockEl, switcherEl, viewDefinitions) {
    this.views = {};
    this.dockEl = dockEl;
    function bindClick(dock, switchEl, viewName) {
      switchEl.addEventListener('click', e => {
        if (dock.isVisible(viewName)) {
          dock.hide(viewName);
        } else {
          dock.show(viewName);
        }
      });
    }
    for (let i = 0; i < viewDefinitions.length; i++) {
      const viewDef = viewDefinitions[i];
      const view = {};
      this.views[viewDef.name] = view;
      view.node = createElement('div', undefined, 'dock-node');
      const caption = createElement('div', undefined, 'tool-caption');
      caption.appendChild(createElement('span', undefined, 'txt', viewDef.name.toUpperCase()));
      caption.appendChild(createElement('i', undefined, 'fa fa-'+viewDef.icon));
      view.node.appendChild(caption);
      // view.node.style.display = 'none';
      this.dockEl.appendChild(view.node);
      view.switchBtn = dockBtn(viewDef.name, viewDef.icon);
      bindClick(this, view.switchBtn, viewDef.name);
      switcherEl.appendChild(view.switchBtn);
    }
  }

  show(viewName) {
    const view = this.views[viewName];
    if (view.switchBtn.classList.contains('selected')) {
      return;
    }
    if (this.dockEl.style.display === 'none') {
      this.dockEl.style.display = 'block';
      document.body.dispatchEvent(new Event('layout'));
    }
    view.node.style.display = 'block';
    view.switchBtn.classList.add('selected');
  }

  hide(viewName) {
    const view = this.views[viewName];
    if (!view.switchBtn.classList.contains('selected')) {
      return;
    }
    view.node.style.display = 'none';
    view.switchBtn.classList.remove('selected');
    if (Array.from(this.dockEl.querySelectorAll('.dock-node').values()).findIndex(node => node.style.display !== 'none') === -1) {
      this.dockEl.style.display = 'none';
      document.body.dispatchEvent(new Event('layout'));
    }
  }


  isVisible(viewName) {
    return this.views[viewName].switchBtn.classList.contains('selected');
  }

  setState(state) {
    state.forEach(viewName => this.show(viewName));
  }

  getState() {
    const state = [];
    Object.keys(this.views).forEach(viewName => {
      if (this.isVisible(viewName)) {
        state.push(viewName);
      }
    });
    return state;
  }

}

export function dockBtn(name, icon) {
  const btn = createElement('span', undefined, 'dock-btn');
  btn.appendChild(createElement('i', undefined, 'fa fa-' + icon));
  btn.appendChild(createElement('span', undefined, 'txt', name));
  return btn;
}


