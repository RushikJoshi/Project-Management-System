import app from '../server/app.js';
function dumpRouter(router, prefix='') {
  if (!router.stack) return;
  router.stack.forEach((layer) => {
    if (layer.route) {
      console.log(prefix + 'route', layer.route.path, Object.keys(layer.route.methods));
    } else if (layer.name === 'router' || layer.handle?.stack) {
      console.log(prefix + 'router-layer', layer.regexp && layer.regexp.toString());
      dumpRouter(layer.handle || layer, prefix + '  ');
    } else {
      console.log(prefix + 'middleware', layer.name, layer.regexp && layer.regexp.toString());
    }
  });
}
console.log('app router detected:', !!app.router);
dumpRouter(app.router || app);
