import defaultCraftEngine from './defaultCraftEngine';


export function activate(ctx) {
  ctx.services.craftEngine = defaultCraftEngine
}