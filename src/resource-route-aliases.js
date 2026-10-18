import routes from '@generated/routes';
import siteConfig from '@generated/docusaurus.config';
import { addResourceRouteAliases } from '../scripts/client-resource-routes.mjs';

addResourceRouteAliases(routes, siteConfig.customFields.publishedDocuments, siteConfig.baseUrl);
