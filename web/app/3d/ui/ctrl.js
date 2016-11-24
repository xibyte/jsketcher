import * as tk from '../../ui/toolkit'
import * as cad_utils from '../cad-utils'
import * as math from '../../math/math'
import * as workbench from '../workbench'
import ToolBar from './toolbar'
import * as MenuConfig from '../menu/menu-config'
import * as Operations from '../operations'
import Menu from '../menu/menu'
import {ExtrudeWizard} from '../wizards/extrude'
import {PlaneWizard} from '../wizards/plane'
import {BoxWizard} from '../wizards/box'
import {SphereWizard} from '../wizards/sphere'
import {TransformWizard} from '../wizards/transform'
import {ImportWizard} from '../wizards/import'
import {LoadTemplate} from './utils'
import {BindArray} from './bind'
import {SolidList} from './solid-list'
import {ModificationsPanel} from './modifications-panel'

function UI(app) {
  this.app = app;
  this.viewer = app.viewer;
  var mainBox = this.mainBox =  new tk.Panel();
  mainBox.root.css({height : '100%'});
  $('#right-panel').append(mainBox.root);
  var modelFolder = new tk.Folder("Model");
  this.solidList = new SolidList(this.app);
  modelFolder.content.append(this.solidList.dom);
  
  tk.add(mainBox, modelFolder);
  let modificationsPanel = new ModificationsPanel(this.app);
  mainBox.content.append(modificationsPanel.dom);

  var toolbarVertOffset = 10; //this.mainBox.root.position().top;

  this.registerMenuActions(MenuConfig);  
  
  this.craftToolBar = this.createCraftToolBar(toolbarVertOffset);
  this.createBoolToolBar(this.craftToolBar.node.position().top + this.craftToolBar.node.height() + 20);
  this.createMiscToolBar(toolbarVertOffset);
  this.fillControlBar();
  var ui = this;
  
  this.app.bus.subscribe("showSketches", (enabled) => {
    var solids = app.findAllSolids();
    for (var i = 0; i < solids.length; i++) {
      for (var j = 0; j < solids[i].polyFaces.length; j++) {
        var face = solids[i].polyFaces[j];
        if (face.sketch3DGroup != null) face.sketch3DGroup.visible = enabled;
      }
    }
    app.viewer.render();
  });

  app.bus.subscribe("solid-pick", function(solid) {
    ui.registerWizard(new TransformWizard(app.viewer, solid));
  });
}

UI.prototype.createCraftToolBar = function (vertPos) {
  var toolBar = new ToolBar(this.app);
  toolBar.add(this.app.actionManager.actions['EditFace']);
  toolBar.add(this.app.actionManager.actions['CUT']);
  toolBar.add(this.app.actionManager.actions['PAD']);
  toolBar.add(this.app.actionManager.actions['PLANE']);
  toolBar.add(this.app.actionManager.actions['BOX']);
  toolBar.add(this.app.actionManager.actions['SPHERE']);
  $('#viewer-container').append(toolBar.node);
  toolBar.node.css({left: '10px',top : vertPos + 'px'});
  return toolBar;
};

UI.prototype.createMiscToolBar = function (vertPos) {
  var toolBar = new ToolBar(this.app);
  toolBar.addFa(this.app.actionManager.actions['Save']);
  toolBar.addFa(this.app.actionManager.actions['StlExport']);
  $('#viewer-container').append(toolBar.node);
  toolBar.node.css({top : vertPos + 'px'});
  toolBar.node.css({right: '10px', 'font-size': '16px'});
  return toolBar;
};

UI.prototype.createBoolToolBar = function(vertPos) {
  var toolBar = new ToolBar(this.app);
  toolBar.add(this.app.actionManager.actions['INTERSECTION']);
  toolBar.add(this.app.actionManager.actions['DIFFERENCE']);
  toolBar.add(this.app.actionManager.actions['UNION']);
  $('#viewer-container').append(toolBar.node);
  toolBar.node.css({left: '10px', top : vertPos + 'px'});
  return toolBar;
};

UI.prototype.registerMenuActions = function(menuConfig) { 
  for (let menuName in menuConfig) {
    const m = menuConfig[menuName];
    var action = Object.assign({'type' : 'menu'}, m);
    delete action['actions'];
    action.menu = new Menu(
      m.actions.map((a) => this.app.actionManager.actions[a])
      .filter((a) => a != undefined), this.app.inputManager);
    this.app.actionManager.registerAction('menu.' + menuName, action);
  }
};

UI.prototype.fillControlBar = function() {
  const LEFT = true;
  const RIGHT = !LEFT;
  this.app.controlBar.add('Info', RIGHT, {'label': null});
  this.app.controlBar.add('RefreshSketches', RIGHT, {'label': null});
  this.app.controlBar.add('ShowSketches', RIGHT, {'label': 'sketches'});
  this.app.controlBar.add('DeselectAll', RIGHT, {'label': null});
  this.app.controlBar.add('menu.file', LEFT);
  this.app.controlBar.add('menu.craft', LEFT);
  this.app.controlBar.add('menu.boolean', LEFT);
  this.app.controlBar.add('menu.primitives', LEFT);
};

UI.prototype.registerWizard = function(wizard, overridingHistory) {
  wizard.ui.box.root.css({left : (this.mainBox.root.width() + this.craftToolBar.node.width() + 30) + 'px', top : 0});
  var craft = this.app.craft; 
  wizard.onRequestReady = function(request) {
    if (request.invalidAndShouldBeDropped == true) {
      alert(request.message);   
    } else {
      craft.modify(request, overridingHistory);
    }
  };
    
  wizard.focus();
  return wizard;
};

UI.prototype.getInfoForOp = function(op) {
  var p = op.params;
  var opDef = Operations[op.type];
  if (opDef && opDef.info) {
    return op.type + ' ' + opDef.info(p);
  }
  return op.type;
};

UI.prototype.initOperation = function(op) {
  var selection = this.app.viewer.selectionMgr.selection;
  return this.createWizard(op, false, undefined, selection[0]);
};

UI.prototype.createWizardForOperation = function(op) {
  var initParams = op.protoParams;
  var face = op.face !== undefined ? this.app.findFace(op.face) : null;
  if (face != null) {
    this.app.viewer.selectionMgr.select(face);
  }
  return this.createWizard(op.type, true, initParams, face);
};

UI.prototype.createWizard = function(type, overridingHistory, initParams, face) {
  let wizard = null;
  if ('CUT' === type) {
    wizard = new ExtrudeWizard(this.app, face, true, initParams);
  } else if ('PAD' === type) {
    wizard = new ExtrudeWizard(this.app, face, false, initParams);
  } else if ('PLANE' === type) {
    wizard = new PlaneWizard(this.app.viewer, initParams);
  } else if ('BOX' === type) {
    wizard = new BoxWizard(this.app.viewer, initParams);
  } else if ('SPHERE' === type) {
    wizard = new SphereWizard(this.app.viewer, initParams);
  } else if ('IMPORT_STL' === type) {
    wizard = new ImportWizard(this.app.viewer, initParams);
  } else {
    console.log('unknown operation');
  }
  if (wizard != null) {
    this.registerWizard(wizard, overridingHistory);
  }
  return wizard;
};

export {UI}