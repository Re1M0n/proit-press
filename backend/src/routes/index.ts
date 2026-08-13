import { Router } from "express";
import { routeRegistry } from "./routeRegistry";

const routes = Router();

// Registro declarativo: cada grupo del routeRegistry define su mount path
// (o "/" si no se especifica) y sus rutas como datos. El orden de los grupos
// y de las rutas dentro de cada grupo se conserva tal cual estaba antes.
routeRegistry.forEach(group => {
  const mountPath = group.path ?? "/";
  const subRouter = Router();

  group.routes.forEach(({ method, path, middlewares = [], handler }) => {
    subRouter[method](path, ...middlewares, handler);
  });

  routes.use(mountPath, subRouter);
});

export default routes;
