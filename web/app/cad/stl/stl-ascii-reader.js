import {StlSolid, StlFace} from './stl-data-structure'

export function parse(buf) {

  let solid = new StlSolid('');
  let face = new StlFace(null);
  let solids = [];
  let reader = new LinesReader(buf);
  let lineNumber = 0;
  while (reader.hasNextLine()) {
    let line = reader.nextLine();
    lineNumber ++;
    var parts = line
      .trim()
      .split(' ')
      .filter(function(part) {
        return part !== '';
      });
    switch(parts[0]) {
      case 'solid':
        solid = new StlSolid(parts.slice(1).join(' '));
        break;
      case 'endsolid':
        solids.push(solid);
        break;
      case 'facet':
        var noramlParts = parts.slice(2);
        if (noramlParts.length == 3) {
          face.normal = noramlParts.map(Number);
        } else {
          console.warn('bad normal definition at line ' + lineNumber);
        }
        break;
      case 'vertex':
        const position = parts.slice(1).map(Number);
        face.vertices.push(position);
        break;
      case 'endfacet':
        if (face.normal != null && face.vertices.length == 3) {
          solid.faces.push(face);
        } else {
          console.warn('bad stl face at line ' + lineNumber);
        }
        face = new StlFace(null);
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