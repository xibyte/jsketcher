import {Generator} from '../id-generator'

export function Ref(value) {
  this.id = Generator.genID();
  this.value = value;
}

Ref.prototype.set = function(value) {
  this.value = value;
};

Ref.prototype.get = function() {
  return this.value;
};
