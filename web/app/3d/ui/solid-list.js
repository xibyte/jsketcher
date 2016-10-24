import {LoadTemplate} from './utils'
import {BindArray} from './bind'

export function SolidList(app) {
  this.app = app;
  app.bus.subscribe('solid-list', (data) => this.onChange(data));
  this.dom = $(LoadTemplate('solid-list')({}));
}

SolidList.prototype.onChange = function(data) {
  let domData = data.solids.map(s => ({id: s.id}));
  domData.forEach(s => {
    let toRefresh = data.needRefresh.find(nr => nr.id == s.id);
    if (toRefresh) {
      Object.assign(s, this.getFullInfo(toRefresh));
    }
  });
  BindArray(this.dom, domData);
};

SolidList.prototype.getFullInfo = function(solid) {
  return {
    id: solid.id,
    type: solid.tCadType,
    sketches: this.app.findSketches(solid).map(id => ({id}))
  };
};

