import React, { useEffect, useRef } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import { CanonicalLink } from '../CanonicalNavbarItem';
import { libraryVersionNavigation } from '../../../scripts/library-version-navigation.mjs';

export default function LibraryVersionNavigation() {
  const { metadata } = useDoc();
  const { siteConfig } = useDocusaurusContext();
  const navigation = libraryVersionNavigation(metadata.source, siteConfig.customFields ?? {});
  const disclosure = useRef(null);

  useEffect(() => { if (disclosure.current) disclosure.current.open = false; }, [metadata.source]);
  useEffect(() => {
    const closeOutside = (event) => {
      if (disclosure.current?.open && !disclosure.current.contains(event.target)) disclosure.current.open = false;
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('focusin', closeOutside);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('focusin', closeOutside);
    };
  }, []);

  if (!navigation) return null;
  return (
    <nav className="library-version-nav" aria-label={`${navigation.name} documentation`}>
      {navigation.overview ? (
        <CanonicalLink to={navigation.overview} className="library-version-nav__name">{navigation.name}</CanonicalLink>
      ) : <span className="library-version-nav__name">{navigation.name}</span>}
      {!navigation.version && <span className="library-version-nav__context">{navigation.context}</span>}
      {navigation.versions.length > 0 && (
        <details ref={disclosure} className="library-version-nav__selector" onKeyDown={(event) => {
          if (event.key === 'Escape' && disclosure.current.open) {
            event.preventDefault();
            disclosure.current.open = false;
            disclosure.current.querySelector('summary')?.focus();
          }
        }}>
          <summary onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              disclosure.current.open = true;
              requestAnimationFrame(() => disclosure.current?.querySelector('a')?.focus());
            }
          }}>
            {navigation.version ? `${navigation.version} — ${navigation.status}` : 'Documentation versions'}
          </summary>
          <ul aria-label="Available documentation versions">
            {navigation.versions.map((entry) => (
              <li key={entry.version}>
                <CanonicalLink to={entry.to} aria-current={entry.selected ? 'page' : undefined}>
                  <span>{entry.version}</span><span>{entry.status}</span>
                </CanonicalLink>
              </li>
            ))}
          </ul>
        </details>
      )}
      {navigation.current && navigation.current.version !== navigation.version && (
        <CanonicalLink to={navigation.current.to} className="library-version-nav__current">
          Current documentation ({navigation.current.version})
        </CanonicalLink>
      )}
      {!navigation.currentVersion && <span className="library-version-nav__context">No stable release</span>}
    </nav>
  );
}
