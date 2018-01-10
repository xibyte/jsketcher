import {sprintf} from 'sprintf'

export const BINDING_CALLBACK = 'OnBind';

export function Bind(node, data, policy) {
  const scope = getScope(node);
  const props = Object.getOwnPropertyNames(data);
  for (let prop of props) {
    if (prop == BINDING_CALLBACK) continue;
    let value = data[prop];
    if (Array.isArray(value)) {
      const nodesToBind = scope.nestedScopes[prop];
      if (!nodesToBind) continue;
      for (let nodeToBind of nodesToBind) {
        BindArray(nodeToBind, value, policy);
      }
    } else if (typeof value === 'object') {
      const nodesToBind = scope.nestedScopes[prop];
      if (!nodesToBind) continue;
      for (let nodeToBind of nodesToBind) {
        Bind(nodeToBind, value, policy);
      }
    } else {
      const bindCallbacks = scope.bindings[prop];
      if (!bindCallbacks) continue;
      for (let bindCallback of bindCallbacks) {
        bindCallback(value, policy);
      }
    }
  }
  var callback = data[BINDING_CALLBACK];
  if (callback) {
    callback(node, data, policy)
  }
}

export function BindArray(node, array, policy) {
  let scope = getScope(node);
  let template = detachTemplate(node);

  function createFromTemplate(id) {
    const child = template.clone();
    child.attr('data-bind-scope', id);
    scope.nestedScopes[id] = [child];
    return child;
  }
  
  const children = node.children();
  let domPointer = 0;   
  for (let dataPointer = 0; dataPointer < array.length; dataPointer++) {
    const value = array[dataPointer];
    let domItem;
    if (domPointer == children.length) {
      domItem = createFromTemplate(value.id);
      node.append(domItem);
    } else {
      domItem = children.eq(domPointer);
      var domItemId = domItem.attr('data-bind-scope');
      if (domItemId != value.id) {
        domItem = scope.nestedScopes[value.id];
        if (!domItem) {
          domItem = createFromTemplate(value.id);
        } else {
          domItem = domItem[0];
        }
        if (domPointer == 0) {
          node.prepend(domItem);
        } else {
          children.eq(domPointer - 1).after(domItem);
        }
      } 
      domPointer ++;
    }
    Bind(domItem, value, policy);
  }
  //clean up
  for (; domPointer < children.length; domPointer++) {
    let item =  children.eq(domPointer);
    item.remove();
    delete scope[item.attr('data-bind-scope')];
  }
}

function detachTemplate(node) {
  let template = node.data("BindingTemplate");
  if (!template) {
    template = node.children();
    template.detach();
    node.data("BindingTemplate", template);
  }
  return template;
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

function detectBinder(def) {
  for (let binder of BINDERS) {
    if (def.startsWith(binder.prefix)) {
      return binder;    
    }
  }
  return DEFAULT_BINDER;
}

function setupBindings(bindings, bindingsDefinition, node) {
  bindingsDefinition.split(',').forEach(defStr => {
    defStr = defStr.trim();
    const binder = detectBinder(defStr);
    const def = parseBindDefinition(defStr.substring(binder.prefix.length));
    addToList(bindings, def.dataKey, (value, policy) => {
      policy = adjustPolicyForNode(policy, def.policy);
      const formattedValue = format(def.formatters, value);
      binder.apply(node, formattedValue, policy, def.key);        
    });
    binder.init(node);
  });
}

function index(dom) {
  const scope = new Scope();
  //do bfs
  const queue = [];
  function advance(node) {
    let bindingsDefinition = node.attr('data-bind');
    if (bindingsDefinition) {
      setupBindings(scope.bindings, bindingsDefinition, node)
    }
    node.children().each((i, e) => queue.push($(e)))
  }
  advance(dom);  
  while (queue.length != 0) {
    let list = false;
    let node = queue.shift();
    var nestedScope = node.attr('data-bind-scope');
    if (!nestedScope) {
      nestedScope = node.attr('data-bind-list');
      list = true;
    }
    if (nestedScope) {
      addToList(scope.nestedScopes, nestedScope, node);
      if (list) {
        detachTemplate(node);
      }
    } else {
      advance(node);
    }
  }
  
  return scope;
}

function adjustPolicyForNode(propagatedPolicy, nodePolicy) {
  let policy = propagatedPolicy || DEFAULT_POLICY;
  if (nodePolicy) {
    policy = Object.assign({}, policy, nodePolicy);
  }
  return policy;
}

function addToList(map, key, value) {
  let list = map[key];
  if (!list) {
    list = [];
    map[key] = list;
  }
  list.push(value);
}

const DEFAULT_POLICY = {
  hideEmpty: true
};

export const FORMATTERS = {
  capitalize: (s) => s.replace(/\b\w/g, l => l.toUpperCase()),
  uppercase: (s) => s.toUpperCase(),
  'css-url': (s) => 'url(' + s + ')'
};

function parseDataLink(str, def) {
  const idx = str.indexOf('|');
  if (idx == -1) {
    def.dataKey = str.trim();
    def.formatters = [];
  } else {
    def.dataKey = str.substring(0, idx).trim();
    def.formatters = str.substring(idx + 1).split('|').map(s => s.trim());
  }
}

function parsePolicy(policyStr) {
  const policy = {};
  policyStr.split('&').forEach(p => {
    p = p.trim();
    let eqIdx = p.indexOf('=');
    if (eqIdx == -1) {
      policy[p] = true;
    } else {
      policy[p.substring(0, eqIdx)] = p.substring(eqIdx + 1);
    }
  });
  return policy;
}

function parseBindDefinition(str) {
  const def = {};
  let qmIdx = str.indexOf('?');
  if (qmIdx != -1) {
    def.policy = parsePolicy(str.substring(qmIdx + 1));
    str = str.substring(0, qmIdx);
  } 
  const colonIdx = str.indexOf(':');
  if (colonIdx == -1) {
    parseDataLink(str, def);
  } else {
    def.key = str.substring(0, colonIdx).trim();
    parseDataLink(str.substring(colonIdx + 1), def);
  }
  return def;
}

function format(formatters, value) {
  for (let formatterKey of formatters) {
    const formatter = FORMATTERS[formatterKey];
    if (formatter) {
      value = formatter(value);
    }
  }
  return value;
}

const DEFAULT_BINDER = {
  prefix: '',
  apply: (node, value, policy) => {
    let templateData = node.attr('data-bind-template');

    var isEmpty = value === '' || value === undefined || value === null;
    if (isEmpty) {
      node.text('');
    } else {
      if (templateData) {
        value = sprintf(templateData, value);
      }
      node.text(value);
    }
    if (isEmpty && policy.hideEmpty) {
      node.hide();
    } else {
      node.show();
    }
  },
  init: (node) => {
    let template = node.text();
    if (template) {
      node.attr('data-bind-template', template);
    }
  }
};

export const BINDERS = [
  {
    prefix: '@',
    apply: (node, value, policy, key) => node.attr(key, value),
    init: (node) => {}
  },
  
  {
    prefix: '$',
    apply: (node, value, policy, key) => node.css(key, value),
    init: (node) => {}
  },
  
  {
    prefix: '!',
    apply: (node, value, policy, key) => value ? node.addClass(key) : node.removeClass(key),
    init: (node) => {}
  },
  
  DEFAULT_BINDER
];



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