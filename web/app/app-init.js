    function start() {
      var app = new TCAD.App2D();
      app.loadFromLocalStorage();
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
      var constrList = new TCAD.ui.List($('#constrs'), {
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
      app.viewer.parametricManager.listeners.push(function() {constrList.refresh()});
      constrList.refresh();
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
