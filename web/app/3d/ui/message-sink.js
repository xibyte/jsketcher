import {fit} from './utils'

export function MessageSink(inputManager) {
  this.inputManager = inputManager;
  this.node = $('<div>', {'class': 'message-sink'});
  $('body').append(this.node);
}

MessageSink.prototype.show = function() {
  this.node.show();
  this.node.offset({left: this.inputManager.mouseInfo.pageX + 10, top: this.inputManager.mouseInfo.pageY + 10});
  fit(this.node, $('body'));
};

MessageSink.prototype.hide = function() {
  this.node.hide();
};

MessageSink.prototype.showContent = function(dom) {
  this.node.children().detach();
  this.node.empty();
  this.node.append(dom);
  this.show();
};

MessageSink.prototype.info = function(text) {
  this.node.children().detach();
  this.node.html(text);
  this.show();
};
