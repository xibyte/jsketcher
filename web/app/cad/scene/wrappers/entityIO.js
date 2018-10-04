import {readBrep} from '../../../brep/io/brepIO';
import {MBrepShell} from '../../model/mshell';

export function readShellEntityFromJson(data, consumed) {
  
  let refIndex = indexFacesByRef(consumed);

  let shell = readBrep(data);
  for (let face of shell.faces) {
    let ref = getRef(face);
    if (ref !== undefined) {
      let consumedFace = refIndex.get(ref);
      if (consumedFace) {
        face.data.id = consumedFace.id; 
      }
    }
  }
  return new MBrepShell(shell);  
}

function indexFacesByRef(shells) {
  let index = new Map();
  if (shells) {
    for (let shell of shells) {
      for (let face of shell.faces) {
        let ref = getRef(face.brepFace);
        if (ref !== undefined) {
          index.set(ref, face);
        }
      }
    }
  }
  return index;
}

const getRef = brepFace => brepFace && brepFace.data.externals && brepFace.data.externals.ref;