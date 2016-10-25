import {LoadTemplate} from './utils'
import {Bind} from './bind'
import * as Operations from '../operations'

export function ModificationsPanel(app) {
  this.app = app;
  this.dom = $(LoadTemplate('modifications')({}));
  this.buttonsBlock = this.dom.find(".tc-buttons-block");
  var buttons = this.buttonsBlock.find(".tc-buttons-block-item");
  buttons.eq(0).click(() => app.craft.finishHistoryEditing());
  this.buttonsBlock.hide();
  this.historyWizard = null;

  this.app.bus.subscribe("craft", () => {
    let modifications = [];
    for (let i = 0; i < this.app.craft.history.length; i++) {
      let op = this.app.craft.history[i];
      let m = {
        id : i,
        info: this.app.ui.getInfoForOp(op),
        OnBind : (dom, data) => {
          dom.css('background-image', 'url('+ getIconForOp(op)+')');
          dom.click(() => this.app.craft.historyPointer = data.id);
        }
      };
      modifications.push(m);
    }
    Bind(this.dom, {modifications});
    this.updateHistoryPointer();
  });

  this.app.bus.subscribe("refreshSketch", () => {
    if (this.historyWizard != null) {
      var craft = this.app.craft;
      var op = JSON.parse(JSON.stringify(craft.history[craft.historyPointer]));
      op.protoParams = this.historyWizard.getParams();
      this.historyWizard.dispose();
      this.historyWizard = this.app.ui.createWizardForOperation(op, app);
    }
  });

  Bind(this.dom, {});
}

ModificationsPanel.prototype.updateHistoryPointer = function() {
  if (this.historyWizard != null) {
    this.historyWizard.dispose();
    this.historyWizard = null;
  }
  var modificationRows = this.dom.find('.modification-item');
  modificationRows.removeClass('history-selected');

  var craft = this.app.craft;
  var historyEditMode = craft.historyPointer != craft.history.length;
  if (historyEditMode) {
    modificationRows.eq(craft.historyPointer).addClass('history-selected');
    var op = craft.history[craft.historyPointer];
    this.historyWizard = this.app.ui.createWizardForOperation(op);
    this.buttonsBlock.show();
  } else {
    this.buttonsBlock.hide();
  }
};

function getIconForOp(op) {
  var opDef = Operations[op.type];
  if (!opDef || !opDef.icon) {
    return null;
  }
  return opDef.icon + '32.png';
}
