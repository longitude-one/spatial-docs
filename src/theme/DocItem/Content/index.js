import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { MDXProvider } from '@mdx-js/react';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import Head from '@docusaurus/Head';
import Heading from '@theme/Heading';
import MDXComponents from '@theme/MDXComponents';
import DocumentationActions from '../../../components/DocumentationActions';
import { documentationActions } from '../../../../scripts/documentation-actions.mjs';
import LibraryVersionNavigation from '../../../components/LibraryVersionNavigation';
import { documentLanguage } from '../../../../scripts/document-language.mjs';

export default function DocItemContentWrapper({ children }) {
  const { metadata, frontMatter, contentTitle } = useDoc();
  const { siteConfig } = useDocusaurusContext();
  const actions = documentationActions(metadata.source, siteConfig.customFields?.publishedDocuments ?? [], frontMatter);
  const discovery = actions ? '../'.repeat(metadata.source.slice('@site/docs/'.length).split('/').length - 1) + 'llms.txt' : null;
  const alternate = <DocumentationActions actions={actions} />;
  const components = {...MDXComponents, h1: (props) => <><Heading as="h1" {...props} />{alternate}</>};
  const syntheticTitle = !frontMatter.hide_title && typeof contentTitle === 'undefined';
  return <>
    {actions && <Head>
      <link rel="alternate" type="text/markdown" href={actions.markdown} />
      <link rel="describedby" type="text/plain" href={discovery} />
    </Head>}
    <LibraryVersionNavigation />
    <div className="theme-doc-markdown markdown" lang={documentLanguage(metadata.source)}>
      {syntheticTitle && <header><Heading as="h1">{metadata.title}</Heading>{alternate}</header>}
      <MDXProvider components={components}>{ children }</MDXProvider>
    </div>
  </>;
}
