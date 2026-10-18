import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { addResourceRouteAliases } from '../scripts/client-resource-routes.mjs';

const require = createRequire(import.meta.url);
const { matchRoutes } = require('react-router-config');

for (const baseUrl of ['/', '/spatial-docs/']) {
  test(`negotiated URLs retain their document after client routing at ${baseUrl}`, () => {
    const home = () => null;
    const point = () => null;
    const french = () => null;
    const notFound = () => null;
    const routes = [{path: baseUrl, routes: [
      {path: `${baseUrl}index.html`, component: home, exact: true},
      {path: `${baseUrl}nested/point.html`, component: point, exact: true},
      {path: `${baseUrl}legal-notice.fr.html`, component: french, exact: true},
      {component: notFound},
    ]}];
    const documents = ['index.md', 'nested/point.md', 'legal-notice.fr.md'];
    addResourceRouteAliases(routes, documents, baseUrl);
    const componentAt = (url) => matchRoutes(routes, url).at(-1).route.component;
    for (const url of [baseUrl, `${baseUrl}index`, `${baseUrl}index.html`]) assert.equal(componentAt(url), home);
    for (const url of [`${baseUrl}nested/point`, `${baseUrl}nested/point.html`]) assert.equal(componentAt(url), point);
    for (const url of [`${baseUrl}legal-notice.fr`, `${baseUrl}legal-notice.fr.html`]) assert.equal(componentAt(url), french);
    for (const url of [`${baseUrl}missing`, `${baseUrl}nested/point.md`, `${baseUrl}nested/`]) assert.equal(componentAt(url), notFound);
    const snapshot = JSON.stringify(routes);
    addResourceRouteAliases(routes, documents, baseUrl);
    assert.equal(JSON.stringify(routes), snapshot);
  });
}
