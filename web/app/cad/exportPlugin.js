import stlExporter from './stl/stlExporter';
import exportTextData from 'gems/exportTextData';

export function activate(ctx) {

  function stlAscii() {
    let meshes = ctx.services.cadRegistry.shells.map(mShell => mShell.ext.view && mShell.ext.view.mesh).filter(m => !!m);
    let result = stlExporter(meshes);
    exportTextData(result, ctx.services.project.id + ".stl");
  }
  
  function imagePng() {
    let auxVisible = ctx.services.cadScene.auxGroup.visible;
    ctx.services.cadScene.auxGroup.visible = false;
    let renderer = ctx.services.viewer.sceneSetup.renderer;
    let clearAlpha = renderer.getClearAlpha();
    renderer.setClearAlpha(0);
    renderer.preserveDrawingBuffer = true;
    ctx.services.viewer.sceneSetup.render();

    let link = document.getElementById("downloader");
    link.href = renderer.domElement.toDataURL('image/png');
    link.download = ctx.services.project.id + "-snapshot.png";
    link.click();

    renderer.preserveDrawingBuffer = false;
    ctx.services.cadScene.auxGroup.visible = auxVisible;
    renderer.setClearAlpha(0);
    renderer.setClearAlpha(clearAlpha);
    ctx.services.viewer.sceneSetup.render();
  } 
  
  ctx.services.export = {
    stlAscii, imagePng
  };
}