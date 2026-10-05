'use strict';

// Hash routes, so the phone's Back button and a reload keep the learner in the app.
//   #/                                home
//   #/u/<unit>                        a unit
//   #/u/<unit>/<lesson>/<step>        a lesson step (learn, drill, quiz), shown over its unit
//   #/review   #/placement            review and the placement check, shown over home
//   #/progress (#/progress/teacher)   the learning dashboard (with the teacher settings)
//   #/note                            saving and moving progress; contact
//   #/menu                            home with the menu open
// Each entry the app pushes records its depth, so "back" can tell whether the previous entry is ours.
const STEPS = ['learn', 'drill', 'quiz'];

export function parseRoute(hash = location.hash) {
  const [a, b, c, d] = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (a === 'u' && b) {
    if (c && STEPS.includes(d)) return { view: 'unit', techId: b, activity: { kind: d, techId: b, subId: c } };
    return { view: 'unit', techId: b };
  }
  if (a === 'review' || a === 'placement') return { view: 'home', activity: { kind: a } };
  if (a === 'progress') return { view: 'progress', teacher: b === 'teacher' };
  if (a === 'note') return { view: 'note' };
  if (a === 'menu') return { view: 'home', menu: true };
  return { view: 'home' };
}

export const routes = {
  home: () => '#/',
  menu: () => '#/menu',
  note: () => '#/note',
  progress: () => '#/progress',
  review: () => '#/review',
  placement: () => '#/placement',
  unit: techId => `#/u/${encodeURIComponent(techId)}`,
  step: (techId, subId, step) => `#/u/${encodeURIComponent(techId)}/${encodeURIComponent(subId)}/${step}`
};

// Identifies an open activity, so the same one is not restarted.
export function activityKey(route) {
  const a = route.activity;
  return a ? [a.kind, a.techId, a.subId].filter(Boolean).join('|') : null;
}

// The page under an overlay: activities and the menu close on reload (or when "back" has nowhere to go).
export function pageOf(route) {
  if (route.view === 'unit') return routes.unit(route.techId);
  if (route.view === 'progress') return route.teacher ? '#/progress/teacher' : routes.progress();
  if (route.view === 'note') return routes.note();
  return routes.home();
}

export function canGoBack() {
  return (history.state?.depth || 0) > 0;
}

export function pushRoute(hash) {
  history.pushState({ depth: (history.state?.depth || 0) + 1 }, '', hash);
}

export function replaceRoute(hash) {
  history.replaceState({ depth: history.state?.depth || 0 }, '', hash);
}
