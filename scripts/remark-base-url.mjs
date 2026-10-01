import { baseUrl } from './site-settings.mjs';

// Raw JSX links do not receive Docusaurus's base URL handling.
export default function remarkBaseUrl() {
  return (tree) => {
    function visit(node) {
      for (const attribute of node.attributes || []) {
        if (['href', 'src'].includes(attribute.name) && typeof attribute.value === 'string'
          && attribute.value.startsWith('/') && !attribute.value.startsWith('//')) {
          attribute.value = `${baseUrl}${attribute.value.slice(1)}`;
        }
      }
      for (const child of node.children || []) visit(child);
    }
    visit(tree);
  };
}
