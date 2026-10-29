const day = 86400000;

/** Align the visitor's local calendar day to the SVG's UTC calendar-day axis. */
export function todayMarkerPosition(layout, date) {
  if (!layout || !['first', 'last', 'width', 'height', 'left', 'right', 'top', 'bottom'].every((key) => Number.isFinite(layout[key]))) return null;
  const { first, last, width, height, left, right, top, bottom } = layout;
  if (last <= first || width <= 0 || height <= 0 || left < 0 || right <= left || right > width || top < 0 || bottom <= top || bottom > height) return null;
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  const year = date.getFullYear();
  const month = date.getMonth();
  const dateOfMonth = date.getDate();
  const calendarDay = new Date(0);
  calendarDay.setUTCFullYear(year, month, dateOfMonth);
  const today = calendarDay.getTime() / day;
  if (today < first || today >= last) return null;
  return {
    left: (left + (right - left) * (today - first) / (last - first)) / width * 100,
    top: top / height * 100,
    height: (bottom - top) / height * 100,
    date: `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(dateOfMonth).padStart(2, '0')}`,
  };
}

/** Refresh at local midnight and when a suspended page returns, without rebuilding SVGs. */
export function installTimelineToday(document, browser, clock = () => new Date()) {
  let timer;
  function refresh() {
    const now = clock();
    for (const timeline of document.querySelectorAll('.roadmap-timeline[data-timeline-layout]')) {
      const link = timeline.querySelector('a');
      if (!link) continue;
      let layout;
      try { layout = JSON.parse(timeline.getAttribute('data-timeline-layout')); }
      catch { layout = null; }
      const position = todayMarkerPosition(layout, now);
      let marker = link.querySelector('.roadmap-today-marker');
      if (!position) { marker?.remove(); continue; }
      if (!marker) {
        marker = document.createElement('span');
        marker.className = 'roadmap-today-marker';
        marker.setAttribute('role', 'img');
        link.append(marker);
      }
      marker.setAttribute('aria-label', `Today: ${position.date}`);
      marker.style.left = `${position.left}%`;
      marker.style.top = `${position.top}%`;
      marker.style.height = `${position.height}%`;
    }
    browser.clearTimeout(timer);
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    timer = browser.setTimeout(refresh, Math.max(1000, midnight.getTime() - now.getTime() + 100));
  }
  const visible = () => { if (document.visibilityState === 'visible') refresh(); };
  document.addEventListener('visibilitychange', visible);
  browser.addEventListener('pageshow', refresh);
  refresh();
  return () => {
    browser.clearTimeout(timer);
    document.removeEventListener('visibilitychange', visible);
    browser.removeEventListener('pageshow', refresh);
  };
}
