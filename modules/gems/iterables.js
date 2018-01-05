
export function findDiff(arr1, arr2) {
  
  let both = [];
  let firstOnly = [];
  let secondOnly = [];
  
  for (let e1 of arr1) {
    for (let e2 of arr2) {
      if (e1 === e2) {
        both.push(e1);
      } 
    }    
  }

  for (let e1 of arr1) {
    if (both.indexOf(e1) === -1) {
      firstOnly.push(e1);
    }
  }

  for (let e2 of arr2) {
    if (both.indexOf(e2) === -1) {
      secondOnly.push(e2);
    }
  }

  return [both, firstOnly, secondOnly]
}