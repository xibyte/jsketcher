
export default function tessellateSurface(surface) {
  
  if (!surface.verb) {
    throw 'unsupported parametric surface';
  }
  return surface.verb.tessellate({maxDepth: 3})
}