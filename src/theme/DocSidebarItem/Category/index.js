import React from 'react';
import OriginalCategory from '@theme-original/DocSidebarItem/Category';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { findFirstSidebarItemLink } from '@docusaurus/plugin-content-docs/client';
import { canonicalSidebarHref } from '../../../../scripts/sidebar-canonical-links.mjs';

export default function SidebarCategory(props) {
  const { siteConfig } = useDocusaurusContext();
  const nativeHref = props.item.href ?? findFirstSidebarItemLink(props.item);
  const href = canonicalSidebarHref(nativeHref, siteConfig.customFields.publishedDocuments, siteConfig.baseUrl);
  return <OriginalCategory {...props} {...(href ? { href, target: '_self', rel: undefined } : {})} />;
}
