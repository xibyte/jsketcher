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
  
  var actionsWin = new TCAD.ui.Window($('#actions'));

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
      return Number(c[f]).toFixed(2);
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
          if (constr.aux !== true) {
            theItems.push({name : constr.UI_NAME + infoStr(constr), constr : constr});
          }
        }
      }
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
        value = TCAD.TWO.utils.askNumber(intro, value.toFixed(4), prompt);
        c[f] = value;
      }
      app.viewer.parametricManager.refresh();
    }
  });
  $('.dock-node').append(constrList.ul);
  app.viewer.parametricManager.listeners.push(function() {constrList.refresh()});
  constrList.refresh();

  var updateLayersList = function () {
    var options = '';
    for (var i = 0; i < app.viewer.layers.length; i++) {
      var layer = app.viewer.layers[i];
      options += "<option value='"+layer.name+"'>"+layer.name+"</option>"
    }
    $('#layersList').html(options).val(app.viewer.activeLayer.name);
  };
  updateLayersList();
  app.viewer.bus.subscribe("activeLayer", function() {
    updateLayersList();
  });
  $('#layersList')
    .mousedown(updateLayersList)
    .change(function () {
      var layer = app.viewer.findLayerByName($('#layersList').val());
      if (layer != null) {
        app.viewer.activeLayer = layer;
      }
    });
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
