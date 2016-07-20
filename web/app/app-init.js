function start() {
  var app = new TCAD.App2D();
  app.loadFromLocalStorage();
  app.fit();

  function addLayer(name, style) {
    if (app.viewer.findLayerByName(name) === null) {
      app.viewer.layers.push(new TCAD.TWO.Layer(name, style));
    }
  }

  addLayer("sketch", TCAD.TWO.Styles.DEFAULT);
  addLayer("_construction_", TCAD.TWO.Styles.CONSTRUCTION);
  
  var actionsWin = new TCAD.ui.Window($('#actions'), app.winManager);

  TCAD.ui.bindOpening( $('#showActions'), actionsWin );
  var addAction = TCAD.ui.createActionsWinBuilder(actionsWin);

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
  var constrList = new TCAD.ui.List('constrs', {
    items : function() {
      var theItems = [];
      for (var j = 0; j < pm.subSystems.length; j++) {
        var sub = pm.subSystems[j];
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
         
        
        value = TCAD.TWO.utils.askNumber(intro, typeof(value) == "number" ? value.toFixed(4) : value, prompt, pm.constantResolver);
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
    var constraintsFilterBtn = TCAD.App2D.faBtn("filter");
    constraintsFilterBtn.css({float: 'right', 'margin-right': '10px', cursor: 'pointer'});
    constraintsCaption.append(constraintsFilterBtn);
    var constraintsFilterWin = new TCAD.ui.Window($('#constrFilter'), app.winManager);
    TCAD.ui.bindOpening(constraintsFilterBtn, constraintsFilterWin);
    var content = constraintsFilterWin.root.find('.content');

    var constrTypes = [], constrType;
    for (var cname in TCAD.TWO.Constraints) {
      c = TCAD.TWO.Constraints[cname];
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

  var layerSelection = new TCAD.toolkit.Combo('layerSelection', 'Layer');
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

  var dimScale = new TCAD.toolkit.Number("Dim Scale", 1, 0.1, 1);
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
window.___log = function(log) {
    $('#log').append( " *****************<br><br><br><br>");
    for (var i = 0; i < log.length; i++) {
        $('#log').append( log[i] + " <br>");
    }
};
window.onload = function() {
  setTimeout(start, 0);
};
