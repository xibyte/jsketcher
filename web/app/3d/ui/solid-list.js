import {LoadTemplate} from './utils'
import {BindArray} from './bind'

export function SolidList(workGroup) {
  workGroup.addEventListener('added', (e) => this.added(e.target));
  workGroup.addEventListener('removed', (e) => this.removed(e.target));
  this.model = [];
  this.dom = $(LoadTemplate('solid-list')({}));
  this.synchOrder();
}

SolidList.prototype.added = function(obj) {
  if (!obj.__tcad_solid) return;
  this.model.push(obj.__tcad_solid);
  let updateData = this.toOrderList();
  Object.assign(updateData, getDomData(obj.__tcad_solid));
  BindArray(this.dom, updateData);
};

SolidList.prototype.removed = function(obj) {
  if (!obj.__tcad_solid) return;
  const index = this.indexOf(obj.__tcad_solid);
  if (index != -1) {
    this.model.splice( index, 1 );
  }
  this.synchOrder();
};

SolidList.prototype.indexOf = function(solid) {
  for (var i = 0; i < this.model.length; i++) {
    if (this.model[i].tCadId = solid.tCadId) {
      return i;        
    }
  }
  return -1;
};

SolidList.prototype.toOrderList = function() {
  return this.model.map((e) => ({id: e.tCadId}));
};

SolidList.prototype.synchOrder = function() {
  BindArray(this.dom, this.toOrderList());
};

function getDomData(solid) {
  return {
    id: solid.tCadId,
    type: solid.tCadType
  }
}

