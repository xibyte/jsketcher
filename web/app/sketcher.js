import App2D from './sketcher/sketcher-app';
import {Styles} from './sketcher/styles'
import {Layer} from './sketcher/viewer2d';
import * as ui from './ui/ui.js';
import * as toolkit from './ui/toolkit';
import {askNumber} from './utils/utils';
import {Constraints} from './sketcher/parametric'
import './utils/jqueryfy'
import '../css/app.less'

function initializeSketcherApplication() {
  var app = new App2D();
  window.__CAD_APP = app;
  var sketchId = app.getSketchId();
  if (sketchId == App2D.STORAGE_PREFIX + '__sample2D__') {
    var sample = '{"layers":[{"name":"_dim","style":{"lineWidth":1,"strokeStyle":"#bcffc1","fillStyle":"#00FF00"},"data":[{"id":0,"_class":"TCAD.TWO.DiameterDimension","obj":90},{"id":1,"_class":"TCAD.TWO.DiameterDimension","obj":95},{"id":2,"_class":"TCAD.TWO.DiameterDimension","obj":42},{"id":3,"_class":"TCAD.TWO.Dimension","a":5,"b":8,"flip":false},{"id":4,"_class":"TCAD.TWO.DiameterDimension","obj":105}]},{"name":"sketch","style":{"lineWidth":2,"strokeStyle":"#ffffff","fillStyle":"#000000"},"data":[{"id":11,"_class":"TCAD.TWO.Segment","points":[[5,[6,110.1295615870824],[7,313.66509156975803]],[8,[9,419.44198895058975],[10,516.7065215258621]]]},{"id":18,"_class":"TCAD.TWO.Segment","points":[[12,[13,489.1218947877601],[14,477.98601743930897]],[15,[16,481.90945628911174],[17,182.9391540301952]]]},{"id":25,"_class":"TCAD.TWO.Segment","points":[[19,[20,427.6872468325118],[21,163.96220645927505]],[22,[23,349.9023145352797],[24,256.7344291384989]]]},{"id":32,"_class":"TCAD.TWO.Segment","points":[[26,[27,306.81261277555075],[28,273.1404656521002]],[29,[30,135.09050734792822],[31,247.98348666778958]]]},{"id":42,"_class":"TCAD.TWO.Arc","points":[[33,[34,489.1218947877601],[35,477.98601743930897]],[36,[37,419.44198895058975],[38,516.7065215258621]],[39,[40,444.1353623657045],[41,479.08688157090376]]]},{"id":53,"_class":"TCAD.TWO.Arc","points":[[44,[45,427.6872468325118],[46,163.96220645927505]],[47,[48,481.90945628911174],[49,182.9391540301952]],[50,[51,451.2148840882273],[52,183.68960424767275]]]},{"id":64,"_class":"TCAD.TWO.Arc","points":[[55,[56,349.9023145352797],[57,256.7344291384989]],[58,[59,306.81261277555075],[60,273.1404656521002]],[61,[62,313.6665992835383],[63,226.35256652594512]]]},{"id":75,"_class":"TCAD.TWO.Arc","points":[[66,[67,110.1295615870824],[68,313.66509156975803]],[69,[70,135.09050734792822],[71,247.98348666778958]],[72,[73,129.8749213918784],[74,283.58516027516237]]]},{"id":80,"_class":"TCAD.TWO.Circle","c":[77,[78,444.1353623657045],[79,479.08688157090376]],"r":17},{"id":85,"_class":"TCAD.TWO.Circle","c":[82,[83,451.2148840882273],[84,183.68960424767275]],"r":17},{"id":90,"_class":"TCAD.TWO.Circle","c":[87,[88,129.8749213918784],[89,283.58516027516237]],"r":17},{"id":95,"_class":"TCAD.TWO.Circle","c":[92,[93,364.7627927122075],[94,358.27520724354514]],"r":50},{"id":100,"_class":"TCAD.TWO.Circle","c":[97,[98,450.6425914465028],[99,356.1758703461729]],"r":13},{"id":105,"_class":"TCAD.TWO.Circle","c":[102,[103,281.1241663120215],[104,360.3197585470608]],"r":13}]},{"name":"_construction_","style":{"lineWidth":1,"strokeStyle":"#aaaaaa","fillStyle":"#000000"},"data":[{"id":113,"_class":"TCAD.TWO.Segment","points":[[107,[108,366.96497096679207],[109,448.36204633886825]],[110,[111,362.6842565514955],[112,273.2463262825022]]]},{"id":120,"_class":"TCAD.TWO.Segment","points":[[114,[115,254.60331148100178],[116,360.9680624545806]],[117,[118,474.9222739434132],[119,355.5823520325097]]]}]}],"constraints":[["Tangent",[42,18]],["Tangent",[42,11]],["coi",[33,12]],["coi",[36,8]],["Tangent",[53,25]],["Tangent",[53,18]],["coi",[44,19]],["coi",[47,15]],["Tangent",[64,25]],["Tangent",[64,32]],["coi",[55,22]],["coi",[58,26]],["Tangent",[75,11]],["Tangent",[75,32]],["coi",[66,5]],["coi",[69,29]],["coi",[77,39]],["coi",[82,50]],["coi",[87,72]],["RR",[80,85]],["RR",[85,90]],["parallel",[113,18]],["perpendicular",[120,113]],["Symmetry",[92,120]],["PointOnLine",[92,113]],["PointOnLine",[102,120]],["PointOnLine",[97,120]],["RR",[105,100]]]}';
    localStorage.setItem(sketchId, sample);
  }
  app.loadFromLocalStorage();
  app.fit();

  var actionsWin = new ui.Window($('#actions'), app.winManager);

  ui.bindOpening( $('#showActions'), actionsWin );
  var addAction = ui.createActionsWinBuilder(actionsWin);

  for (var p = 0; p < app._actionsOrder.length; ++p) {
    var act = app.actions[app._actionsOrder[p]];
    addAction(act.desc, act.action);
    $('.act-' + act.id).click(act.action).attr('title', act.desc);
  }

  function infoStr(c) {
    if (c.SettableFields === undefined) return "";
    var info = Object.keys(c.SettableFields).map(function(f) {
      var val = c[f];
      var num = Number(val);
      if (isNaN(num)) {
        num = Number(app.viewer.parametricManager.constantResolver(val));
        return val + "(" + (isNaN(num) ? "?" : num.toFixed(2)) + ")" ;
      }
      return num.toFixed(2);
    }).join(", ");
    if (info.length != 0) {
      info = " <span style='font-size: 8px;'>[" + info + "]</span>";
    }
    return info;
  }

  var pm = app.viewer.parametricManager;
  var constrList = new ui.List('constrs', {
    items : function() {
      var theItems = [];
      for (var j = 0; j < pm.system.subSystems.length; j++) {
        var sub = pm.system.subSystems[j];
        for (var i = 0; i < sub.constraints.length; ++i) {
          var constr = sub.constraints[i];
          if (constr.aux !== true && app.constraintFilter[constr.NAME] != true) {
            theItems.push({name : constr.UI_NAME + infoStr(constr), constr : constr});
          }
        }
      }
      theItems.sort(function (a, b) {
        if (a.constr.NAME == 'coi') {
          return b.constr.NAME == 'coi' ? 0 : 1;
        }
        return a.constr.NAME.localeCompare(b.constr.NAME)
      });
      return theItems;
    },

    remove : function(item) {
      pm.remove(item.constr);
    },

    mouseleave : function(item) {
      app.viewer.deselectAll();
      app.viewer.refresh();
    },

    hover : function(item) {
      app.viewer.select(item.constr.getObjects(), true);
      app.viewer.refresh();
    },

    click : function(item) {
      var c = item.constr;
      if (c.SettableFields === undefined) return;
      for (var f in c.SettableFields) {
        var value = c[f];
        var intro = c.SettableFields[f];


        value = askNumber(intro, typeof(value) == "number" ? value.toFixed(4) : value, prompt, pm.constantResolver);
        if (value != null) {
          c[f] = value;
        }
      }
      app.viewer.parametricManager.refresh();
    }
  });
  var constraintsView = app.dock.views['Constraints'];

  function configureConstraintsFilter() {
    var constraintsCaption = constraintsView.node.find('.tool-caption');
    var constraintsFilterBtn = ui.faBtn("filter");
    constraintsFilterBtn.css({'float': 'right', 'margin-right': '10px', cursor: 'pointer'});
    constraintsCaption.append(constraintsFilterBtn);
    var constraintsFilterWin = new ui.Window($('#constrFilter'), app.winManager);
    ui.bindOpening(constraintsFilterBtn, constraintsFilterWin);
    var content = constraintsFilterWin.root.find('.content');

    var constrTypes = [], constrType;
    for (var cname in Constraints) {
      c = Constraints[cname];
      if (c.prototype !== undefined && c.prototype.UI_NAME !== undefined && !c.prototype.aux) {
        constrTypes.push(c);
      }
    }
    constrTypes.sort(function (a, b) {
      if (a.prototype.NAME == 'coi') {
        return b.prototype.NAME == 'coi' ? 0 : -1;
      }
      return a.prototype.UI_NAME.localeCompare(b.prototype.UI_NAME)
    });
    for (var i = 0; i < constrTypes.length; i++) {
      var c = constrTypes[i];
      if (c.prototype !== undefined && c.prototype.UI_NAME !== undefined && !c.prototype.aux) {
        var checkbox = $('<input>', {type : 'checkbox', checked : 'checked', value : c.prototype.NAME});
        content.append(
          $('<label>', { css : {display : 'block', 'white-space' : 'nowrap'}})
            .append(checkbox)
            .append(c.prototype.UI_NAME)
        );
        checkbox.change(function(){
          var checkbox = $(this);
          app.constraintFilter[checkbox.val()] = checkbox.is(':checked') != true;
          constrList.refresh();
        });
      }
    }
  }
  configureConstraintsFilter();
  constraintsView.node.append(constrList.ul);
  app.viewer.parametricManager.listeners.push(function() {constrList.refresh()});
  constrList.refresh();


  var addingModeRadio = new toolkit.InlineRadio(['sketch', 'construction'], ['sketch', 'construction'], 0);
  app.dock.views['Properties'].node.append('<div>Adding Mode</div>').append(addingModeRadio.root);

  addingModeRadio.root.find('input:radio').change(() => {
    app.viewer.addingRoleMode = addingModeRadio.getValue();   
  });

  var layerSelection = new toolkit.Combo('layerSelection', 'Layer');
  app.dock.views['Properties'].node.append(layerSelection.root);

  var updateLayersList = function () {
    var options = '';
    for (var i = 0; i < app.viewer.layers.length; i++) {
      var layer = app.viewer.layers[i];
      options += "<option value='"+layer.name+"'>"+layer.name+"</option>"
    }
    layerSelection.select.html(options).val(app.viewer.activeLayer.name);
  };
  updateLayersList();
  app.viewer.bus.subscribe("activeLayer", function() {
    updateLayersList();
  });
  layerSelection.select
    .mousedown(updateLayersList)
    .change(function () {
      var layer = app.viewer.findLayerByName(layerSelection.select.val());
      if (layer != null) {
        app.viewer.activeLayer = layer;
      }
    });

  var dimScale = new toolkit.Number("Dim Scale", 1, 0.1, 1);
  dimScale.min = 0.1;
  app.dock.views['Properties'].node.append(dimScale.root);
  dimScale.input.on('t-change', function() {
    app.viewer.dimScale = $(this).val();
  });
  app.viewer.bus.subscribe('dimScale', function(value) {
    dimScale.input.val(value);
  });
  var constantTextArea = $('<textarea />', {placeholder : 'for example: A = 50', css: {
    width: '100%',
    resize: 'vertical',
    background: 'inherit',
    border : 'none',
    color: '#C4E1A4'
  } });
  app.viewer.params.subscribe('constantDefinition', 'constantTextArea', function(value) {
    constantTextArea.val(value);
  })();
  constantTextArea.bind("change", function() {
    app.viewer.params.set('constantDefinition', $(this).val(), 'constantTextArea');
  });

  app.dock.views['Dimensions'].node.append(constantTextArea);
}

$( () => initializeSketcherApplication() );
