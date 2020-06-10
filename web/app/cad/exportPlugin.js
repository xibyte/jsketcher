import stlExporter from './stl/stlExporter';
import exportTextData from 'gems/exportTextData';

export function activate(ctx) {

  function toStlAsciiString() {
    let meshes = ctx.services.cadRegistry.shells.map(mShell => mShell.ext.view && mShell.ext.view.mesh).filter(m => !!m);
    return stlExporter(meshes);
  }

  function stlAscii() {
    exportTextData(toStlAsciiString(), ctx.projectService.id + ".stl");
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
    link.download = ctx.projectService.id + "-snapshot.png";
    link.click();

    renderer.preserveDrawingBuffer = false;
    ctx.services.cadScene.auxGroup.visible = auxVisible;
    renderer.setClearAlpha(0);
    renderer.setClearAlpha(clearAlpha);
    ctx.services.viewer.sceneSetup.render();
  } 
  
  function nativeFormat() {
    ctx.services.projectManager.exportProject(ctx.projectService.id);
  }
  
  ctx.services.export = {
    stlAscii, imagePng, toStlAsciiString, nativeFormat
  };
}