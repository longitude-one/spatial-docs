import React, { useEffect, useId, useRef, useState } from 'react';
import { CanonicalLink } from '../CanonicalNavbarItem';
import { useLocation } from '@docusaurus/router';

export default function MegaMenu({ label, overview, overviewLabel, categories, mobile = false, onClick }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const toggle = useRef(null);
  const panel = useRef(null);
  const panelId = useId();
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('focusin', closeOutside);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('focusin', closeOutside);
    };
  }, [open]);

  function closeOnNavigation(event) {
    setOpen(false);
    onClick?.(event);
  }

  const Container = mobile ? 'li' : 'div';
  return (
    <Container ref={root} className={mobile ? 'menu__list-item library-menu library-menu--mobile' : 'navbar__item library-menu'}
      style={{ '--mega-menu-columns': categories.length, '--mega-menu-width': categories.length > 2 ? '58rem' : '38rem' }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          toggle.current?.focus();
        }
      }}>
      <button ref={toggle} type="button" className={mobile ? 'clean-btn menu__link library-menu__toggle' : 'clean-btn navbar__link library-menu__toggle'}
        aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            // Wait for React to remove the panel's hidden attribute before focusing.
            requestAnimationFrame(() => panel.current?.querySelector('a')?.focus());
          }
        }}>
        {label}<span aria-hidden="true" className="library-menu__caret">▾</span>
      </button>
      <div id={panelId} ref={panel} hidden={!open} className="library-menu__panel">
        {overview && <CanonicalLink to={overview} className="library-menu__overview" onClick={closeOnNavigation}>{overviewLabel}</CanonicalLink>}
        <div className="library-menu__categories">
          {categories.map((category) => (
            <section key={category.label} className="library-menu__category" aria-label={category.label}>
              <h2>{category.label}</h2>
              <ul>
                {category.items.map((item) => (
                  <li key={item.label}>
                    {item.to ? (
                      <CanonicalLink to={item.to} onClick={closeOnNavigation}>
                        {item.label}{item.note && <span className="library-menu__note">{item.note}</span>}
                      </CanonicalLink>
                    ) : (
                      <span aria-disabled="true" className="library-menu__unavailable">
                        {item.label}<span className="library-menu__note">{item.note}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </Container>
  );
}
