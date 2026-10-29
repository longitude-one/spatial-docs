import { installTimelineToday } from './roadmap-today.mjs';

let stop;

export function onRouteDidUpdate() {
  stop?.();
  stop = installTimelineToday(document, window);
}
