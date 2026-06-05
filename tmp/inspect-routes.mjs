import app from '../server/app.js';
console.log('has router', !!app.router);
if (app.router?.stack) {
  console.log('stack length', app.router.stack.length);
  app.router.stack.forEach((layer, index) => {
    console.log(index, layer.name, layer.regexp && layer.regexp.toString());
    if (layer.route) {
      console.log('  route', layer.route.path, Object.keys(layer.route.methods));
    }
  });
} else {
  console.log('no router stack');
}
