import {readBrep} from 'brep/io/brepIO';
import {MBrepShell} from 'cad/model/mshell';

export function readShellEntityFromJson(data, productionAnalyzer, csys) {
  const shell = readBrep(data);
  if (productionAnalyzer) {
    productionAnalyzer.assignIdentification(shell)
  }
  return new MBrepShell(shell, csys);
}

const getRef = brepFace => brepFace && brepFace.data.externals && brepFace.data.externals.ref;