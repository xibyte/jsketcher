export default function TabSwitcher(tabBar, defaultView) {
  this.tabBar = tabBar;
  var defaultTab = $('<div>', {
    'class': 'tab',
    text: '3D View'
  });
  this.defaultViewHandle = new ViewHandle(defaultView, defaultTab);
  defaultTab.click(() => {
    this.defaultViewHandle.show(this);
  });
  this.tabBar.append(defaultTab);
  this.markSelected(defaultTab);
 
  this.detachedViews = {};
}

function idToName(id) {
  var match = /\$+$/.exec(id);
  if (match == null) return id;
  var beenCraftedTimes = match[0].length;
  function to27Base(n) {
    if (n == 0) return "";
    var rad = n % 27;
    return to27Base(Math.floor(n / 27)) + String.fromCharCode(65 + rad);
  }
  return id.replace(/\$+$/, '') + to27Base(beenCraftedTimes);
}

TabSwitcher.prototype.showSketch = function(sketchURL, sketchId) {
  var tab = this.tabBar.find('[data-sketch-id="'+sketchId+'"]');
  var detachedView = this.detachedViews[sketchId];
  if (detachedView !== undefined) {
    if (!detachedView.closed) {
      detachedView.focus();
      return;
    } else {
      delete this.detachedViews[sketchId];
    }
  }
  if (tab.length == 0) {
    tab = $('<div>', {'class': 'tab', text : 'Sketch ' + idToName(sketchId)})
            .append(' ')
            .append($('<i>', {'class': 'fa fa-expand expand'}))
            .append(' ')
            .append($('<i>', {'class': 'fa fa-close close'}));
    tab.attr('data-sketch-id', sketchId);
    var url = "sketcher.html#" + sketchURL;

    var view = $('<div>', {'class': 'app-tab-view'})
      .append($('<iframe>', {css:{
        width: '100%', height: '100%'
      }}));
    view.insertAfter($('.app-tab-view').last());
    view.find('iframe').attr('src', url);
    var viewHandle = new ViewHandle(view, tab);
    tab.on('click', () => viewHandle.show(this));
    this.tabBar.append(tab);
    var close = () => {
      view.remove();
      tab.remove();
      this.defaultViewHandle.show(this);
    };
    tab.find('.expand').click(() => {
      close();
      this.detachedViews[sketchId] = window.open(url, sketchId, "height=900,width=1200")
    });
    tab.find('.close').click(close);
  }
  tab.click();
};

TabSwitcher.prototype.markSelected = function(tab) {
  this.tabBar.find('.tab').removeClass('tab-selected');
  tab.addClass('tab-selected');
};

function ViewHandle(view, tab) {
  this.view = view;
  this.tab = tab;
}

ViewHandle.prototype.show = function(tabSwitcher) {
  tabSwitcher.markSelected(this.tab);
  $('.app-tab-view').not(this.view).hide();
  this.view.show();
};