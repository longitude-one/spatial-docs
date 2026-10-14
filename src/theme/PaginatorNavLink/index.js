import React from 'react';
import { CanonicalLink } from '../../components/CanonicalNavbarItem';

export default function PaginatorNavLink({ permalink, title, subLabel, isNext }) {
  return <CanonicalLink to={permalink}
    className={`pagination-nav__link pagination-nav__link--${isNext ? 'next' : 'prev'}`}>
    {subLabel && <div className="pagination-nav__sublabel">{subLabel}</div>}
    <div className="pagination-nav__label">{title}</div>
  </CanonicalLink>;
}
