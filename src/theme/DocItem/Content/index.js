import React from 'react';
import { MDXProvider } from '@mdx-js/react';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import Head from '@docusaurus/Head';
import Heading from '@theme/Heading';
import MDXComponents from '@theme/MDXComponents';
import LibraryVersionNavigation from '../../../components/LibraryVersionNavigation';

export default function DocItemContentWrapper({ children }) {
  const { metadata, frontMatter, contentTitle } = useDoc();
  const source = metadata.source.replace(/^@site\/docs\//, '');
  const href = `./${source.split('/').pop()}`;
  const alternate = <p><a href={href} rel="alternate" type="text/markdown">View Markdown version</a></p>;
  const components = {...MDXComponents, h1: (props) => <><Heading as="h1" {...props} />{alternate}</>};
  const syntheticTitle = !frontMatter.hide_title && typeof contentTitle === 'undefined';
  return <>
    <Head><link rel="alternate" type="text/markdown" href={href} /></Head>
    <LibraryVersionNavigation />
    <div className="theme-doc-markdown markdown">
      {syntheticTitle && <header><Heading as="h1">{metadata.title}</Heading>{alternate}</header>}
      <MDXProvider components={components}>{ children }</MDXProvider>
    </div>
  </>;
}
