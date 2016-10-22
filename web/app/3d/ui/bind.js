import {sprintf} from 'sprintf'

export const BINDING_CALLBACK = 'OnBind';

export function Bind(node, data, policy) {
  if (!policy) policy = DEFAULT_POLICY;
  const props = Object.getOwnPropertyNames(data);
  const scope = getScope(node);
  for (let prop of props) {
    if (prop == BINDING_CALLBACK) continue;
    let value = data[prop];
    let bindFunc, subNode;
    if (Array.isArray(value)) {
      bindFunc = BindArray;
      subNode = scope.nestedScopes[prop];
    } else if (typeof value === 'object') {
      bindFunc = Bind;
      subNode = scope.nestedScopes[prop];
    } else {
      bindFunc = BindContent;
      subNode = scope.bindings[prop];
    }
    if (!subNode) continue;
    bindFunc(subNode, value, policy);
  }
  var callback = data[BINDING_CALLBACK];
  if (callback) {
    callback(node, data, policy)
  }
}

export function BindArray(node, array, policy, path) {
  let template = node.data("BindingTemplate");
  if (!template) {
    template = node.children();
    template.detach();
    node.data("BindingTemplate", template);
  }
  let scope = getScope(node);
  node.children().detach();
  clearScope(node);

  for (let value of array) {
    let child = scope.nestedScopes[value.id];
    if (!child) {
      child = template.clone();
    } else {
      delete scope.nestedScopes[value.id];
    }
    child.attr('data-bind-scope', value.id);
    Bind(child, value, policy);
    node.append(child);
  }
  for (let toDelete of Object.getOwnPropertyNames(scope.nestedScopes)) {
    scope.nestedScopes[toDelete].remove();
  }
}

export function BindContent(node, value, policy) {
  if (!policy.hideEmptyValue || value || value === 0) {
    var format = node.attr('data-bind-format');
    if (format == '') {
      format = node.text();
      node.attr('data-bind-format', format);
    }
    if (format) {
      value = sprintf(format, value);
    }
    node.text(value);
    node.show();
  } else {
    node.text('');
    node.hide();
  }
}


function clearScope(dom) {
  dom.removeData('BindingScope');
}

function getScope(dom) {
  let scope = dom.data('BindingScope');
  if (!scope) {
    scope = index(dom);
    dom.data('BindingScope', scope);
  }
  return scope;
}

function index(dom) {
  const scope = new Scope();
  //do bfs
  const queue = [];
  function advance(node) {
    var binding = node.attr('data-bind');
    if (binding) {
      scope.bindings[binding] = node;
    }
    node.children().each((i, e) => queue.push($(e)))
  }
  advance(dom);  
  while (queue.length != 0) {
    let node = queue.shift();
    var nestedScope = node.attr('data-bind-scope');
    if (nestedScope) {
      scope.nestedScopes[nestedScope] = node;
    } else {
      advance(node); 
    }
  }
  
  return scope;
}

const DEFAULT_POLICY = {
  hideEmptyValue: true
};

export function Scope() {
  this.bindings = {};
  this.nestedScopes = {};
}

function example(dom) {
  let initState = {
    title : 'this is title',
    users : [
      {id: 1, name: 'Peach', email: 'Peach@ooo.com'},
      {id: 2, name: 'Melon', email: 'Melon@ooo.com'},
      {id: 3, name: 'Berry', email: 'Berry@ooo.com'},
      {id: 4, name: 'Apple', email: 'Apple@ooo.com'},
      {id: 5, name: 'Banana', email: 'Banana@ooo.com'}
    ]
  };

  Bind(dom, initState);
  //reordering, removing, updating provided attributes
  Bind(dom, {users: [ {id:3}, {id:1, name: 'Peach-Beach'}, {id:2} ]});
  //only content update
  Bind(dom, {users: {
    '3' : {name: 'updated', email: 'light@update.com'}
  }});
}