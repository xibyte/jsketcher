import {ShortestPathTree} from "./js/digraphs/spt.js"
import {allPathsToHTML, pathInformationToHTML, singlePathToHTML} from "./js/digraphs/spt_html.js"
import {simpleObjectToDigraph} from "./js/digraphs/digraph_simple_builder.js"
import {abSegmentsToDigraph} from "./js/sided_ab_graphs/digraph_ab_builder.js"
import {DigraphABShortestPathFinder} from "./js/sided_ab_graphs/digraph_ab_shortest_path_finder.js"
import {
    findShortestPathForAllPairsAsync,
    simpleArrayToPointPairs
} from "./js/sided_ab_graphs/digraph_ab_pairs_analyser.js"

export {makeTestGridGraph, makeTestGridAbGraph, makeTestGridAbPointPairs} from "./js/test_digraph_builders.js"

export function simpleResolve(graphJson, startVertex, endVertex, errorElementId) {
  document.getElementById(errorElementId).innerHTML = "";
  let tree = null;
  let timing = "";
  try {
    const t0 = performance.now();
    // tree = new ShortestPathTree(graphJson); // old-style
    const digraph = simpleObjectToDigraph(graphJson);
    const t1 = performance.now();
    tree = new ShortestPathTree(digraph);
    tree.build(startVertex);
    const t2 = performance.now();
    timing = "Timing: " + (t2 - t0) + " ms = "
      + (t1 - t0) + " + " + (t2 - t1) + " for " + tree.numberOfNodes + " nodes, "
      + ((t2 - t1) * 1e3 / tree.numberOfNodes) + " mcs/vertex<br>&nbsp;";
  } catch (e) {
    document.getElementById(errorElementId).innerHTML = e;
    throw e;
  }
  const result = timing + "<br><br>" + singleHTML(tree, endVertex)
    + "<br><br>"
    + allPathsToHTML(tree, 250)
    + "<br>"
    + "<span class=\"comment\">Processed directed graph:<br>"
    + tree.digraph.toJsonString(50).replace(/\},/g, "},<br>")
    + "</span>";
  return result;
}

export function sidedAdResolve(segmentsJson, startPoint, endPoint, errorElementId) {
  document.getElementById(errorElementId).innerHTML = "";
  let finder = null;
  let timing = "";
  try {
    const t0 = performance.now();
    // tree = new ShortestPathTree(graphJson); // old-style
    const digraph = abSegmentsToDigraph(segmentsJson);
    const t1 = performance.now();
    finder = new DigraphABShortestPathFinder(digraph);
    finder.build(startPoint);
    const t2 = performance.now();
    timing = "Timing: " + (t2 - t0) + " ms = "
      + (t1 - t0) + " + " + (t2 - t1) + ", "
      + ((t2 - t1) * 1e3 / digraph.getNumberOfNodes()) + " mcs/vertex<br>&nbsp;";
  } catch (e) {
    document.getElementById(errorElementId).innerHTML = e;
    throw e;
  }
  const result = timing + "<br><br>" + singleHTML(finder, endPoint)
    + "<br>"
    + forBothHTML(finder, endPoint)
    + "<br><br>"
    + allPathsToHTML(finder.treeA, 150)
    + "<br>"
    + allPathsToHTML(finder.treeB, 150)
    + "<br>"
    + "<span class=\"comment\">Processed directed graph:<br>"
    + finder.treeA.digraph.toJsonString(50).replace(/\},/g, "},<br>")
    + "</span>";
  return result;
}

export async function sidedAdPairsResolve(segmentsJson, pairsJson, brief, errorElementId, timingElementId, progressBarId) {
  //document.getElementById(errorElementId).innerHTML = "";
  //document.getElementById(timingElementId).innerHTML = "Executing...";
  let pointPairs = null;
  try {
    const t0 = performance.now();
    const digraph = abSegmentsToDigraph(segmentsJson);
    pointPairs = simpleArrayToPointPairs(pairsJson);
    const t1 = performance.now();
    await findShortestPathForAllPairsAsync(digraph, pointPairs, progressBarId == null ? null : part => {
      //document.getElementById(progressBarId).value = Math.round(part * 100)
    });
    // - note: without "await" we will have now non-processed pointPairs!
    const t2 = performance.now();
    const timing = "Executing: " + (t2 - t0) + " ms = "
      + (t1 - t0) + " + " + (t2 - t1) + " for "
      + pointPairs.length + " pairs from " + digraph.getNumberOfNodes() + " nodes, "
      + ((t2 - t1) / pointPairs.length) + " ms/pair<br>&nbsp;";
    //document.getElementById(timingElementId).innerHTML = timing;
  } catch (e) {
    document.getElementById(errorElementId).innerHTML = e;
    throw e;
  }
  if (brief) {
    pointPairs = pointPairs.map(pair => pair.briefClone())
  }
  return JSON.stringify(pointPairs, null, 2);
}


function singleHTML(treeOrFinder, endVertex) {
  try {
    return singlePathToHTML(treeOrFinder.getShortestPathInformation(endVertex, true));
  } catch (e) {
    return String(e);
  }
}

function forBothHTML(finder, endPoint) {
  try {
    const forBoth = finder.getShortestPathInformationForBothSides(endPoint);
    return forBoth.length + " checked paths:<br>"
      + (forBoth.length == 0 ? "" : pathInformationToHTML(forBoth).replace(/\},/g, "},<br>"));
  } catch (e) {
    return String(e);
  }
}

export function parseJsonAndPrintError(jsonText, errorElementId) {
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    document.getElementById(errorElementId).innerHTML = "JSON problem: " + e;
    throw e;
  }
}
