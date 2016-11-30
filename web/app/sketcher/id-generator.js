
let ID_COUNTER = 0;

export const Generator = {
  genID : function() {
    return ID_COUNTER ++;
  },

  resetIDGenerator : function(value) {
    ID_COUNTER = value;
  }
};

