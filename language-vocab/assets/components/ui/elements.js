// assets/components/ui/elements.js

export function createChip(label, { pressed = false, onClick, className = '', title } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = ['chip', className].filter(Boolean).join(' ');
  btn.textContent = label;
  btn.setAttribute('aria-pressed', String(!!pressed));
  if (title) btn.title = title;
  if (typeof onClick === 'function') btn.onclick = onClick;
  return btn;
}

export function createIconChip(symbol, label, { disabled = false, onClick, title } = {}) {
  const btn = createChip('', { className: 'chip--icon', onClick, title: title || label });
  btn.setAttribute('aria-label', label);
  const icon = document.createElement('span');
  icon.textContent = symbol;
  icon.setAttribute('aria-hidden', 'true');
  btn.appendChild(icon);
  btn.disabled = !!disabled;
  return btn;
}
