
export function transform(shell, matrix) {
  for (let vertex of shell.vertices) {
    matrix._apply(vertex.point);
  }
}
