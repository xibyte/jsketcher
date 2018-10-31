import stlExporter from './stl/stlExporter';
import exportTextData from 'gems/exportTextData';

export function activate(ctx) {

  function stlAscii() {
    let meshes = ctx.services.cadRegistry.shells.map(mShell => mShell.ext.view && mShell.ext.view.mesh).filter(m => !!m);
    let result = stlExporter(meshes);
    exportTextData(result, ctx.services.project.id + ".stl");
  }
  
  ctx.services.export = {
    stlAscii
  };
}