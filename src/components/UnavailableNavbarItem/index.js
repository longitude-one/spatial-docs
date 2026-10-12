import React from 'react';

export default function UnavailableNavbarItem({ label, note, mobile }) {
  const item = (
    <span className={mobile ? 'menu__link navbar-unavailable' : 'navbar__item navbar-unavailable'}
      aria-disabled="true" title={note}>
      {label}<span className="navbar-unavailable__note"> — {note}</span>
    </span>
  );
  return mobile ? <li className="menu__list-item">{item}</li> : item;
}
