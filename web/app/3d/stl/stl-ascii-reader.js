export function parse(buf) {

  var solid = {
    name: null,
    faces: []    
  };
  var solids = [];
  var triangle = [];
  var normal = null;  
  var reader = new LinesReader(buf);
  while (reader.hasNextLine()) {
    let line = reader.nextLine();  
    var parts = line
      .trim()
      .split(' ')
      .filter(function(part) {
        return part !== '';
      });
    switch(parts[0]) {
      case 'solid':
        solid = {
          name: parts.slice(1).join(' '),
          faces: []
        };
        break;
      case 'endsolid':
        solids.push(solid);
        break;
      case 'facet':
        var noramlParts = parts.slice(2);
        if (noramlParts.length == 3) {
          normal = noramlParts.map(Number);
        }
        break;
      case 'vertex':
        var position = parts.slice(1).map(Number);
        triangle.push(position);
        break;
      case 'endfacet':
        if (triangle.length == 3) {
          solid.faces.push({
            vertices: triangle,
            normal: normal 
          });
        }
        triangle = [];
        normal = null;
      default:
      // skip
    }
  }
  return solids;
}

function LinesReader(buf) {
  let mark = 0;
  let pos = 0;
  let arr = new Uint8Array(buf);
  this.nextLine = function() {
    let str = "";
    for (var i = mark; i < pos; i++) {
      str += String.fromCharCode(arr[i]);
    }
    mark = pos;
    return str;
  };
  this.hasNextLine = function() {
    while (pos < arr.length) {
      if (arr[pos ++] == 10) {
        return true;
      }
    }
    return false;
  }
}