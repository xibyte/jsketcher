
export function GenerateWorkbenchOperationDocumentationLink(dirname: string) {

  const [modules, workbenches, ...rest] = dirname.split('/');

  return 'docs/' + rest.join('/') + '/docs/index.html';

}