
export interface Plugin<InContext, OutContext> {

  id: string;

  dependencies: string[];

  activate(ctx: InContext & OutContext): () => void | void;

}

export function activatePlugins(plugins: Plugin<any, any>[], context: any) {

}