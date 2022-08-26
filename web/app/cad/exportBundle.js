import {STLExporter} from './stl/stlExporter';
import exportTextData from 'gems/exportTextData';

export const BundleName = "@Export";

export function activate(ctx) {

  function toStlAsciiString() {
    const exporter = new STLExporter();
    const views = ctx.services.cadRegistry.shells.map(mShell => mShell.ext.view).filter(m => !!m);
    return exporter.parse( views );
  }

  function stlAscii() {
    exportTextData(toStlAsciiString(), ctx.projectService.id + ".stl");
  }
  
  function imagePng() {
    const auxVisible = ctx.services.cadScene.auxGroup.visible;
    ctx.services.cadScene.auxGroup.visible = false;
    const renderer = ctx.services.viewer.sceneSetup.renderer;
    const clearAlpha = renderer.getClearAlpha();
    renderer.setClearAlpha(0);
    renderer.preserveDrawingBuffer = true;
    ctx.services.viewer.sceneSetup.render();

    const link = document.getElementById("downloader");
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