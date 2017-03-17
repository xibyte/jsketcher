import * as tk from '../../ui/toolkit'
import * as cad_utils from '../cad-utils'
import * as math from '../../math/math'
import * as workbench from '../craft/mesh/workbench'
import ToolBar from './toolbar'
import * as MenuConfig from '../menu/menu-config'
import * as Operations from '../craft/operations'
import Menu from '../menu/menu'
import {ExtrudeWizard, CutWizard} from '../craft/brep/wizards/cut-extrude'

import {RevolveWizard} from '../craft/mesh/wizards/revolve'
import {PlaneWizard} from '../craft/mesh/wizards/plane'
import {BoxWizard} from '../craft/brep/wizards/box'
import {SphereWizard} from '../craft/mesh/wizards/sphere'
import {TransformWizard} from '../craft/mesh/wizards/transform'
import {ImportWizard} from '../craft/mesh/wizards/import'
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
    var solids = app.findAllSolidsOnScene();
    for (var i = 0; i < solids.length; i++) {
      for (var j = 0; j < solids[i].sceneFaces.length; j++) {
        var face = solids[i].sceneFaces[j];
        if (face.sketch3DGroup != null) face.sketch3DGroup.visible = enabled;
      }
    }
    app.viewer.render();
  });

  app.bus.subscribe("solid-pick", function(solid) {
    ui.registerWizard(new TransformWizard(app.viewer, solid));
  });
  registerOperations(app);
}

function registerOperations(app) {
  const opNames = Object.keys(Operations);
  for (let opName of opNames) {
    console.log('Registering Operation ' + opName);
    app.craft.registerOperation(opName, Operations[opName].action);
  }
}

UI.prototype.createCraftToolBar = function (vertPos) {
  var toolBar = new ToolBar(this.app);
  toolBar.add(this.app.actionManager.actions['PLANE']);
  toolBar.add(this.app.actionManager.actions['EditFace']);
  toolBar.add(this.app.actionManager.actions['EXTRUDE']);
  toolBar.add(this.app.actionManager.actions['CUT']);
  toolBar.add(this.app.actionManager.actions['REVOLVE']);  
  
  
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
  this.app.controlBar.add('Donate', LEFT);
  this.app.controlBar.add('GitHub', LEFT);
};

UI.prototype.registerWizard = function(wizard, overridingHistory) {
  wizard.box.root.css({left : (this.mainBox.root.width() + this.craftToolBar.node.width() + 30) + 'px', top : 0});
  var craft = this.app.craft;
  wizard.overridingHistory = overridingHistory;
  wizard.focus();
  if (this.registeredWizard != undefined) {
    if (!this.registeredWizard.disposed) {
      this.registeredWizard.dispose();
    }
  }
  this.registeredWizard = wizard;
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
  var initParams = op.params;
  var face = op.face !== undefined ? this.app.findFace(op.face) : null;
  if (face != null) {
    this.app.viewer.selectionMgr.select(face);
  }
  return this.createWizard(op.type, true, initParams, face);
};

UI.prototype.createWizard = function(type, overridingHistory, initParams, face) {
  let wizard = null;
  if ('CUT' === type) {
    wizard = new CutWizard(this.app, initParams);
  } else if ('EXTRUDE' === type) {
    wizard = new ExtrudeWizard(this.app, initParams);
  } else if ('REVOLVE' === type) {
    wizard = new RevolveWizard(this.app, face, initParams);
  } else if ('PLANE' === type) {
    wizard = new PlaneWizard(this.app, initParams);
  } else if ('BOX' === type) {
    wizard = new BoxWizard(this.app, initParams);
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