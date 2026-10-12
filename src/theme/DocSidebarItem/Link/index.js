import React from 'react';
import OriginalLink from '@theme-original/DocSidebarItem/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { canonicalSidebarHref } from '../../../../scripts/sidebar-canonical-links.mjs';

export default function SidebarLink(props) {
  const { siteConfig } = useDocusaurusContext();
  const to = canonicalSidebarHref(props.item.href, siteConfig.customFields.publishedDocuments, siteConfig.baseUrl);
  return <OriginalLink {...props} {...(to ? { to, target: '_self', rel: undefined } : {})} />;
}
