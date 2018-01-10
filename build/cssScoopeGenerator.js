const path = require('path');

module.exports = function() {
  const index = {};
  const componentNames = {};
  
  return function (localName, resourcePath) {
    let id = index[resourcePath];
    if (id === undefined) {
      id = getComponentName(resourcePath);
      index[resourcePath] = id;
    }
    if (localName === 'root') {
      localName = '';
    }  else {
      localName = '-' + localName
    }
    return 'x-' + id + localName;
  };

  function getComponentName(resourcePath) {
    let filename = path.basename(resourcePath);
    let name = path.parse(filename).name;
    let suffix = '';
    let collisionCounter = 0;    
    while (componentNames[name + suffix] !== undefined) {
      suffix = collisionCounter ++;
    }
    name = name + suffix;
    componentNames[name] = true;
    return name;
  }
};

