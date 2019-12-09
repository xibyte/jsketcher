const CONSTRUCTIONS = [

  // two tangent lines to a circle
  constr => {
    if (constr.schema.id === 'TangentLC') {
      const adjConstr = getAdjacentConstraint(constr, constr.objects[1], 'TangentLC');
      if (adjConstr) {
        return [constr, adjConstr];
      }
    }
  }

];


export function findConstructionCluster(constr, isScheduled) {

  for (let construct of CONSTRUCTIONS) {
    const cluster = construct(constr);
    if (cluster && !cluster.find(isScheduled)) {
      return cluster;
    }
  }

  return [constr];
}

function getAdjacentConstraint(constr, throughObject, constrTypeId) {

  for (let adjConstr of throughObject.constraints) {
    if (constr !== adjConstr && adjConstr.schema.id === constrTypeId) {
      return adjConstr;
    }
  }

  return null;
}

