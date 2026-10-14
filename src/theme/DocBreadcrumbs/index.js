import React from 'react';
import { useDoc, useSidebarBreadcrumbs } from '@docusaurus/plugin-content-docs/client';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import StructuredData from '@theme/DocBreadcrumbs/StructuredData';
import { CanonicalLink } from '../../components/CanonicalNavbarItem';
import { logicalBreadcrumbs } from '../../../scripts/contextual-navigation.mjs';
import { canonicalSidebarHref } from '../../../scripts/sidebar-canonical-links.mjs';

export default function DocBreadcrumbs() {
  const { metadata } = useDoc();
  const nativeItems = useSidebarBreadcrumbs();
  const { siteConfig } = useDocusaurusContext();
  const items = logicalBreadcrumbs(metadata.source, nativeItems, siteConfig.customFields).map((item) => {
    let href = canonicalSidebarHref(item.href, siteConfig.customFields.publishedDocuments, siteConfig.baseUrl)
      ?.replace('pathname://', '') ?? item.href;
    if (href?.startsWith('/') && !href.startsWith(siteConfig.baseUrl)) href = `${siteConfig.baseUrl}${href.slice(1)}`;
    return { ...item, href };
  });
  if (!items.length) return null;
  return <>
    <StructuredData breadcrumbs={items} />
    <nav className="theme-doc-breadcrumbs docusaurus-mb-md" aria-label="Breadcrumbs">
      <ul className="breadcrumbs">{items.map((item, index) => {
        const active = index === items.length - 1;
        return <li key={index} className={`breadcrumbs__item${active ? ' breadcrumbs__item--active' : ''}`}>
          {!active && item.href
            ? <CanonicalLink to={item.href} className="breadcrumbs__link">{item.label}</CanonicalLink>
            : <span className="breadcrumbs__link" aria-current={active ? 'page' : undefined}>{item.label}</span>}
        </li>;
      })}</ul>
    </nav>
  </>;
}
