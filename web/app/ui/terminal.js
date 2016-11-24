export function Terminal(win, commandProcessor, variantsSupplier) {
  this.win = win;
  this.out = win.root.find('.terminal-output');
  const input = win.root.find('.terminal-input input');

  win.onShowCallback = function() {
    input.focus();
  };
  this.history = [];
  this.historyPointer = 0;
  const setHistory = () => {
    if (this.history.length == 0) return;
    input.val(this.history[this.historyPointer]);
  };


  input.keydown((e) => {
    function consumeEvent() {
      e.preventDefault();
      e.stopPropagation();
    }
    if (e.keyCode == 9) {
      const text = input.val();
      let variants = variantsSupplier().filter(v => v.startsWith(text));
      variants.sort();
      if (variants.length == 0) {
      } else  {
        const shared = sharedStartOfSortedArray(variants);
        if (shared.length != text.length) {
          input.val(shared);
        } else {
          let autocompleteArea = this.out.find('.autocomplete-area');
          if (autocompleteArea.length == 0) {
            autocompleteArea = $('<div>', {'class': 'terminal-commandText autocomplete-area'});
            this.out.append(autocompleteArea);
          }
          let more = '';
          const limit = 20;
          if (variants.length > limit) {
            more = '... and ' + (variants.length - limit) + ' more';
            variants = variants.slice(0,limit);
          }
          autocompleteArea.text(variants.join(' ') + more);
        }
      }
      consumeEvent();
    } else if (e.keyCode == 38) {
      this.historyPointer = Math.max(this.historyPointer - 1, 0);
      setHistory();
      consumeEvent();
    } else if (e.keyCode == 40) {
      if (this.historyPointer != this.history.length) {
        this.historyPointer = Math.min(this.historyPointer + 1, this.history.length - 1);
        setHistory();
      }
      consumeEvent();
    }
  });

  input.keyup((e) => {
    if(e.keyCode == 13) {
      const command = input.val();
      this.out.find('.autocomplete-area').remove();
      input.val('');
      this.out.append($('<div>', {text: '> '+command, 'class': 'terminal-commandText'}));
      if (command != null && command.trim().length != 0) {
        const result = commandProcessor(command);
        this.print(result);
        if (this.history.length == 0 || command != this.history[this.history.length - 1]) {
          this.history.push(command);
        }
        this.historyPointer = this.history.length;
      }
      this.out.parent().scrollTop(this.out.height());
    }
  });
}

Terminal.prototype.print = function(text) {
  this.win.root.find('.terminal-output').append($('<div>', {text, 'class': 'terminal-commandResult'}));
};

function sharedStartOfSortedArray(array){
  var a1= array[0], a2= array[array.length-1], L= a1.length, i= 0;
  while(i<L && a1.charAt(i)=== a2.charAt(i)) i++;
  return a1.substring(0, i);
}