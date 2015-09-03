TCAD.toolkit = {};

TCAD.toolkit.add = function(parent, child) {
  parent.content.append(child.root);
};

TCAD.toolkit.Box = function() {
  this.root = this.content = $('<div class="tc-box" />');
  this.root.addClass('tc-box tc-scroll');
  this.root.appendTo('body');
};

TCAD.toolkit.Folder = function(title) {
  this.root = $('<div/>', {class: 'tc-folder'});
  this.content = $('<div/>');
  this.root.append($('<div/>', {text: title, class: 'tc-row tc-title'}));
  this.root.append(this.content);
};

TCAD.toolkit.Button = function(title) {
  this.root = $('<div/>',
    {class: 'tc-row tc-ctrl tc-ctrl-btn', text: title});
};

TCAD.toolkit.propLayout = function(root, name, valueEl) {
  root.append($('<span/>', {class: 'tc-prop-name', text: name}))
    .append($('<div/>', {class: 'tc-prop-value'})
    .append(valueEl));
};

TCAD.toolkit.Number = function(name) {
  this.root = $('<div/>', {class: 'tc-row tc-ctrl tc-ctrl-number'});
  TCAD.toolkit.propLayout(this.root, name, $('<input type="text"/>'))
};

TCAD.toolkit.Text = function(name) {
  this.root = $('<div/>', {class: 'tc-row tc-ctrl tc-ctrl-text'});
  TCAD.toolkit.propLayout(this.root, name, $('<input type="text" />'))
};

TCAD.toolkit.Tree = function() {
  this.root = $('<div/>', {class: 'tc-tree'});
};

TCAD.toolkit.Tree.prototype.set = function(data) {
  this.root.empty();
  this._fill(data, 0);
};

TCAD.toolkit.Tree.prototype._fill = function(data, level) {
  var notLeaf = data.children !== undefined && data.children.length !== 0;
  if (data.name !== undefined) {
    this.root.append($('<div/>', {
      text: data.name, class: 'tc-row' + (notLeaf ? ' tc-chevron-open' : ''),
      css: {'margin-left': level * (notLeaf ? 10 : 16) + 'px'}
    }));
  }
  if (notLeaf) {
    for (var i = 0; i < data.children.length; i++) {
      var child = data.children[i];
      this._fill(child, level + 1);
    }
  }
};
