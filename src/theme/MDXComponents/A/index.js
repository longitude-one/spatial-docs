import React from 'react';
import OriginalAnchor from '@theme-original/MDXComponents/A';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { linkTargetProps } from '../../../../scripts/link-target-policy.mjs';

export default function MarkdownAnchor(props) {
  const { siteConfig } = useDocusaurusContext();
  return <OriginalAnchor {...props} {...linkTargetProps(props.href, siteConfig.url)} />;
}
