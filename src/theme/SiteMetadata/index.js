import React from 'react';
import OriginalMetadata from '@theme-original/SiteMetadata';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { PageMetadata, useThemeConfig } from '@docusaurus/theme-common';
import { DEFAULT_SEARCH_TAG } from '@docusaurus/theme-common/internal';
import { useLocation } from '@docusaurus/router';
import SearchMetadata from '@theme/SearchMetadata';
import { documentLanguage, localizedAlternates } from '../../../scripts/document-language.mjs';

export default function SiteMetadata() {
  const { siteConfig } = useDocusaurusContext();
  const { pathname } = useLocation();
  const { image, metadata } = useThemeConfig();
  const resource = pathname.slice(siteConfig.baseUrl.length).replace(/\.html$/, '') + '.html';
  const published = siteConfig.customFields.publishedDocuments;
  if (!/\.(?:fr|en)\.html$/.test(resource) || !published.includes(resource.replace(/\.html$/, '.md'))) return <OriginalMetadata />;
  const language = documentLanguage(resource);
  const production = siteConfig.customFields.productionUrl;
  const canonical = new URL(resource, production.replace(/\/$/, '') + '/').href;
  const alternates = localizedAlternates(resource, published, production);
  return <>
    <Head>
      <meta name="twitter:card" content="summary_large_image" />
      <body lang="en" />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content={language} />
      <link rel="canonical" href={canonical} />
      {alternates.map(({ language: targetLanguage, url }) => <link key={targetLanguage} rel="alternate" hrefLang={targetLanguage} href={url} />)}
    </Head>
    {image && <PageMetadata image={image} />}
    <SearchMetadata tag={DEFAULT_SEARCH_TAG} locale={language} />
    <Head>{metadata.map((entry, index) => <meta key={index} {...entry} />)}</Head>
  </>;
}
