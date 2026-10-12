import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

// Canonical representations are emitted after Docusaurus builds its SPA routes.
// Use ordinary anchors: SPA navigation cannot resolve the explicit HTML paths.
export function CanonicalLink({ to, children, ...props }) {
  const href = useBaseUrl(to);
  return <a href={href} {...props}>{children}</a>;
}

export default function CanonicalNavbarItem({ to, label, mobile, isDropdownItem, onClick }) {
  const className = mobile ? 'menu__link' : isDropdownItem ? 'dropdown__link' : 'navbar__item navbar__link';
  const link = <CanonicalLink to={to} className={className} onClick={onClick}>{label}</CanonicalLink>;
  return mobile || isDropdownItem ? <li className={mobile ? 'menu__list-item' : undefined}>{link}</li> : link;
}
