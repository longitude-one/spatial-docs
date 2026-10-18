import React from 'react';
import OriginalMetadata from '@theme-original/DocItem/Metadata';
import Head from '@docusaurus/Head';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { pageStructuredData } from '../../../../scripts/seo-policy.mjs';
import { documentLanguage } from '../../../../scripts/document-language.mjs';

export default function Metadata() {
  const { metadata } = useDoc();
  const { siteConfig } = useDocusaurusContext();
  const resource = metadata.source.replace(/^@site\/docs\//, '').replace(/\.md$/, '.html');
  const production = siteConfig.customFields.productionUrl;
  const canonical = new URL(resource, production.replace(/\/$/, '') + '/').href;
  const data = pageStructuredData(resource, metadata.title, metadata.description, production);
  return <>
    <OriginalMetadata />
    <Head>
      <html lang={documentLanguage(resource)} />
      <body lang="en" />
      <link rel="canonical" href={canonical} />
      <meta property="og:url" content={canonical} />
      {data && <script type="application/ld+json">{JSON.stringify(data).replaceAll('<', '\\u003c')}</script>}
    </Head>
  </>;
}
