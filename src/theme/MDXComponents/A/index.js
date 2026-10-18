import React from 'react';
import OriginalAnchor from '@theme-original/MDXComponents/A';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { linkTargetProps } from '../../../../scripts/link-target-policy.mjs';
import { documentLanguage } from '../../../../scripts/document-language.mjs';

export default function MarkdownAnchor(props) {
  const { siteConfig } = useDocusaurusContext();
  const language = /\.(?:fr|en)\.html(?:[?#]|$)/.test(props.href || '') ? documentLanguage(props.href.split(/[?#]/)[0]) : undefined;
  return <OriginalAnchor {...props} lang={props.lang || language} {...linkTargetProps(props.href, siteConfig.url)} />;
}
