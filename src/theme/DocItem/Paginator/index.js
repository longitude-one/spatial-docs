import React from 'react';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import DocPaginator from '@theme/DocPaginator';
import { contextualPagination } from '../../../../scripts/contextual-navigation.mjs';

export default function DocItemPaginator() {
  const { metadata } = useDoc();
  const { siteConfig } = useDocusaurusContext();
  const adjacent = (item) => contextualPagination(metadata.source, item, siteConfig.customFields, siteConfig.baseUrl);
  return <DocPaginator className="docusaurus-mt-lg" previous={adjacent(metadata.previous)} next={adjacent(metadata.next)} />;
}
