export function SelectionMatcher() {


  const lowerBounds = [];

  return {


    moreThan(amount, type) {
      lowerBounds.push(amount, type);
      return this;
    },


    match: selection => {


      for (let [amount, type] of lowerBounds) {

      }
    }
  }



}