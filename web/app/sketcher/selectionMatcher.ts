
export interface  SelectionMatcher {

  selector: string,

  types: any[],

  minQuantity: number

}

export function matchAvailableSubjects(selection, subjects) {

  const matched = [];
  const matchIndex = new MatchIndex(selection);

  if (selection.length) {
    for (const action of  subjects) {
      if (action.selectionMatcher && matchSelection(action.selectionMatcher, matchIndex, true)) {
        matched.push(action);
      }
    }
  }

  return matched;
}

export function matchSelection(definition, matchIndex, fast) {
  const selection = matchIndex.selection;
  if (definition.selector === 'function') {
    return definition.match(selection, fast)
  } else if (definition.selector === 'matchAll') {

    const {minQuantity: min, types} = definition;
    if (min !== undefined && selection.length < min) {
      return false;
    }
    for (const obj of selection) {

      let hit = false;
      for (const constructor of types) {
        if (typeToString(constructor) === obj.TYPE) {
          hit = true;
          break;
        }
      }
      if (!hit) {
        return false;
      }
    }
    return fast ? true : selection;

  } else if (definition.selector === 'matchSequence') {

    matchIndex.reset(fast);


    for (const item of definition.sequence) {
      if (!matchIndex.mark(item.types, item.quantity)) {
        return false;
      }
    }

    return matchIndex.allHit() ? (fast ? true : matchIndex.result) : false;

  } else {
    throw 'unsupported'
  }

}

export function getDescription(definition) {

  if (definition.selector === 'function') {
    return definition.description;
  } else if (definition.selector === 'matchAll') {
    return `at least ${definition.minQuantity} of ${stringifyTypes(definition.types, definition.minQuantity)}`;
  } else if (definition.selector === 'matchSequence') {

    let out = '';


    for (let i = 0; i< definition.sequence.length; ++i) {
      const item = definition.sequence[i];
      if (i !== 0) {
        out += i === definition.sequence.length - 1 ? ' and ': ', ';
      }

      out += item.quantity + ' ' + stringifyTypes(item.types, item.quantity);
    }

    return out;

  } else {
    throw 'unsupported'
  }
}

function stringifyTypes(types, minQuantity) {
  return types.map(t => typeToString(t) + (minQuantity > 1 ? 's' : '')).join(' or ');
}

export class MatchIndex {

  typeMap = new Map();

  overallHits = 0;
  result: any[];
  selection: any;

  constructor(selection) {
    this.selection = selection;
    selection.forEach(obj => {
      let info = this.typeMap.get(obj.TYPE);
      if (!info) {
        info = {
          hits: 0,
          objects: []
        };
        this.typeMap.set(obj.TYPE, info);
      }
      info.objects.push(obj);
    })
  }

  reset(fast) {
    this.overallHits = 0;
    this.typeMap.forEach(i => i.hits = 0);
    this.result = fast ? null : [];
  }

  mark(types, quantity) {
    for (const type of types) {
      const info = this.typeMap.get(typeToString(type));
      if (!info) {
        continue;
      }
      const toAdd = Math.min(quantity, info.objects.length - info.hits);
      if (this.result) {
        for (let i = 0; i < toAdd; ++i) {
          this.result.push(info.objects[info.hits + i]);
        }
      }
      quantity -= toAdd;
      info.hits += toAdd;
      this.overallHits += toAdd;
    }
    return quantity === 0;
  }

  allHit() {
    return this.selection.length === this.overallHits;
  }

}

function typeToString(type) {
  if (typeof type === 'string') {
    return type;
  } else {
    return type.prototype.TYPE;
  }
}