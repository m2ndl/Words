'use strict';

// Opens and closes the app's dialogs (activity, confirm, menu): focus moves in and comes back,
// the page behind is inert, Tab stays inside, and Escape cancels.
// Works without `inert` support too: the Tab trap keeps keyboard focus inside the dialog.
const stack = [];
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
// Body children that stay live while a dialog is open (the status message and the celebration layer).
const ALWAYS_LIVE = new Set(['toast', 'particles-container']);

export function isDialogOpen(el) {
  return stack.some(d => d.el === el);
}

// onCancel: what Escape does (default: close). focus: the element to focus first (default: the dialog).
export function openDialog(el, { onCancel = null, focus = null } = {}) {
  if (isDialogOpen(el)) return;
  stack.push({ el, onCancel, opener: document.activeElement });
  el.classList.remove('hidden');
  el.classList.add('is-open');
  updateInert();
  (focus || el).focus({ preventScroll: true });
}

export function closeDialog(el) {
  const i = stack.findIndex(d => d.el === el);
  if (i === -1) return;
  const [entry] = stack.splice(i, 1);
  el.classList.remove('is-open');
  if (!el.classList.contains('drawer')) el.classList.add('hidden');
  updateInert();
  const back = entry.opener;
  if (back && back !== document.body && document.contains(back) && !back.closest('[inert]')) back.focus({ preventScroll: true });
}

function updateInert() {
  const top = stack.length ? stack[stack.length - 1].el : null;
  for (const child of document.body.children) {
    if (child.tagName === 'SCRIPT' || ALWAYS_LIVE.has(child.id)) continue;
    child.inert = !!top && child !== top;
  }
}

function visible(node) {
  return !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
}

document.addEventListener('keydown', e => {
  const top = stack[stack.length - 1];
  if (!top) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    if (top.onCancel) top.onCancel(); else closeDialog(top.el);
    return;
  }
  if (e.key !== 'Tab') return;
  const items = [...top.el.querySelectorAll(FOCUSABLE)].filter(visible);
  if (!items.length) { e.preventDefault(); top.el.focus(); return; }
  const first = items[0], last = items[items.length - 1];
  const active = document.activeElement;
  const at = items.indexOf(active);
  const inside = top.el.contains(active);
  // Focus on the dialog itself or a non-tabbable node (a title) counts by its place in the document.
  const beforeFirst = at === -1 && !!(first.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_PRECEDING);
  const afterLast = at === -1 && !!(last.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING);
  if (e.shiftKey && (!inside || at === 0 || beforeFirst)) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && (!inside || at === items.length - 1 || afterLast)) {
    e.preventDefault(); first.focus();
  }
});
