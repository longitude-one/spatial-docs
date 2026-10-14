import React from 'react';
import DocItemContent from '@theme-original/DocItem/Content';
import LibraryVersionNavigation from '../../../components/LibraryVersionNavigation';

export default function DocItemContentWrapper(props) {
  return <><LibraryVersionNavigation /><DocItemContent {...props} /></>;
}
