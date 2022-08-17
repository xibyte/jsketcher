export function singlePathToHTML(pathInformation) {
  return pathInformation.feasible ?
    "Shortest path '" + pathInformation.startId + "' &#10132; '" + pathInformation.endId + "': "
    + pathInformationToHTML(pathInformation) :
    "No path '" + pathInformation.startId + "' &#10132; '" + pathInformation.endId + "'";
}

export function allPathsToHTML(tree, limitOfNodes) {
  try {
    const pathMap = tree.getAllShortestPathMap();
    let report = "All " + pathMap.size + " shortest paths from '" + tree.startNode.id + "':<br>\n";
    let count = 0;
    for (const [key, path] of pathMap) {
      report += "&nbsp;&nbsp;&nbsp;&nbsp;[#" + (count + 1) + "] ...&#10132; '"
        + key + "': " + pathInformationToHTML(path) + "<br>\n";
      ++count;
      if (limitOfNodes && count > limitOfNodes) {
        report += "...<br>\n"
        break;
      }
    }
    return report;
  } catch (e) {
    return String(e);
  }
}

export function pathInformationToHTML(path) {
  let s = JSON.stringify(path);
  s = toHtmlEntities(s);
  s = s.replace(/-&gt;/g, "&#8594;");
  return s;
}

function toHtmlEntities(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}