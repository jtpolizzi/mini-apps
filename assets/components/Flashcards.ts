// assets/components/Flashcards.ts
import { applyFilters, Prog, setCurrentWordId, sortWords, State, onStateEvent, type VocabEntry } from '../state.ts';
import { createWeightControl } from './WeightControl.ts';

type Destroyable = { destroy: () => void };

interface PointerGesture {
  id: number;
  x: number;
  y: number;
  t: number;
}

interface TouchInfo {
  x: number;
  y: number;
  t: number;
  insideTop: boolean;
}

export function mountFlashcards(container: HTMLElement): Destroyable {
  container.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'card';
  const topr = document.createElement('div');
  topr.className = 'topright';
  const foot = document.createElement('div');
  foot.className = 'footmeta';
  card.appendChild(topr);
  card.appendChild(foot);

  // progress bar (reuse multiple-choice styles)
  const progress = document.createElement('div');
  progress.className = 'choice-progress flash-progress';
  const progressLabel = document.createElement('span');
  progressLabel.className = 'choice-progress-label';
  progressLabel.textContent = 'Loading...';
  const progressSlider = document.createElement('input');
  progressSlider.type = 'range';
  progressSlider.className = 'flash-progress-slider';
  progressSlider.min = '0';
  progressSlider.max = '0';
  progressSlider.value = '0';
  progressSlider.disabled = true;
  progressSlider.setAttribute('aria-label', 'Card position');
  progress.append(progressLabel, progressSlider);

  // bottom bar
  const bar = document.createElement('div');
  bar.className = 'bottombar';
  const prev = document.createElement('button');
  prev.className = 'bigbtn';
  prev.textContent = '←';
  prev.title = 'Previous card';
  const flip = document.createElement('button');
  flip.className = 'bigbtn';
  flip.textContent = 'Flip';
  flip.title = 'Flip card';
  const next = document.createElement('button');
  next.className = 'bigbtn';
  next.textContent = '→';
  next.title = 'Next card';
  bar.append(prev, flip, next);
  document.body.appendChild(bar);
  document.body.classList.add('pad-bottom');

  let showFront = true;
  let index = 0;
  let view: VocabEntry[] = [];
  let currentWord: VocabEntry | null = null;
  let suppressNextCardClick = false;  // <-- hard guard
  let pointerGesture: PointerGesture | null = null;
  let isSliderDrag = false;
  let pendingWordId: string | null = null;
  const supportsPointerEvents = typeof window !== 'undefined' && window.PointerEvent !== undefined;
  let touchInfo: TouchInfo | null = null;

  function computeView() {
    const filtered = applyFilters(State.words);
    const sorted = sortWords(filtered);

    const { order } = State;
    if (order.length) {
      const byId = new Map<string, VocabEntry>(sorted.map((w) => [w.id, w]));
      const ordered: VocabEntry[] = [];
      const seen = new Set<string>();
      order.forEach((id) => {
        if (seen.has(id)) return;
        const hit = byId.get(id);
        if (hit) {
          ordered.push(hit);
          seen.add(id);
        }
      });
      if (ordered.length) {
        if (ordered.length < sorted.length) {
          sorted.forEach((w) => {
            if (seen.has(w.id)) return;
            ordered.push(w);
          });
        }
        return ordered;
      }
    }

    return sorted;
  }

  function fmtTagsComma(s?: string) {
    if (!s) return '';
    return String(s)
      .split(/[|,;]+/g)
      .map((t) => t.trim())
      .filter(Boolean)
      .join(', ');
  }

  function render() {
    const oldId = view[index]?.id;
    view = computeView();

    let desiredId = pendingWordId;
    pendingWordId = null;

    const sharedId = State.ui?.currentWordId || '';
    if (!desiredId && sharedId) desiredId = sharedId;
    if (!desiredId && oldId) desiredId = oldId;
    if (desiredId) {
      const newIdx = view.findIndex((w) => w.id === desiredId);
      if (newIdx !== -1) index = newIdx;
    }
    if (index >= view.length) index = Math.max(0, view.length - 1);

    const w = view[index];
    currentWord = w || null;
    if (!w) {
      card.textContent = 'No cards match your filters.';
      updateProgress(0, 0);
      setCurrentWordId('');
      return;
    }

    // main text
    card.textContent = showFront ? (w.word || '') : (w.definition || '');
    card.appendChild(topr);
    card.appendChild(foot);

    // --- top-right controls ---
    topr.innerHTML = '';

    const star = document.createElement('button');
    star.className = 'iconbtn';
    star.title = 'Star';
    star.style.fontSize = '22px';
    star.style.lineHeight = '1';
    star.style.padding = '4px 8px';

    const setStar = () => {
      const on = Prog.star(w.termKey);
      star.textContent = on ? '★' : '☆';
      star.setAttribute('aria-pressed', String(on));
      star.style.color = on ? 'var(--accent)' : 'var(--fg-dim)';
      star.style.borderColor = on ? 'var(--accent)' : '#4a5470';
    };
    setStar();

    // stop the next card click AND re-render after toggle
    const swallow = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressNextCardClick = true;
    };
    star.addEventListener('pointerdown', swallow);
    star.addEventListener('click', (e) => {
      swallow(e);
      Prog.setStar(w.termKey, !Prog.star(w.termKey));
      // if Only★ is ON, current card may exit the view; render to update counter & position
      render();
    });
    topr.appendChild(star);

    const weightControl = createWeightControl({
      value: Prog.weight(w.termKey),
      onChange: (next: number) => {
        Prog.setWeight(w.termKey, next);
        render();
      },
      ariaLabel: 'Adjust weight'
    }) as HTMLElement;
    weightControl.querySelectorAll('button').forEach((btn) => btn.addEventListener('pointerdown', swallow));
    topr.appendChild(weightControl);

    // Also block stray bubbling from the topr container
    topr.addEventListener('click', (e) => e.stopPropagation());

    // footer meta + optional translation
    const tagsComma = fmtTagsComma(w.tags);
    const parts = [w.pos, w.cefr];
    if (tagsComma) parts.push(tagsComma);

    foot.innerHTML = `
      <div class="meta-line">${parts.filter(Boolean).join(' • ')}</div>
      ${State.ui.showTranslation ? `<div class="translation">${w.definition || ''}</div>` : ''}
    `;

    updateProgress(index + 1, view.length);
    setCurrentWordId(w.id);
  }

  function updateProgress(current: number, total: number) {
    if (!total) {
      progressLabel.textContent = '0 / 0';
      progressSlider.disabled = true;
      progressSlider.value = '0';
      progressSlider.max = '0';
      return;
    }
    progressSlider.disabled = false;
    progressSlider.min = '1';
    progressSlider.max = String(total);
    if (!isSliderDrag) {
      progressSlider.value = String(current);
    }
    progressLabel.textContent = `Card ${current} / ${total}`;
  }

  function jumpToIndex(nextIndex: number) {
    if (!view.length) return;
    const clamped = Math.max(0, Math.min(view.length - 1, nextIndex));
    const nextWord = view[clamped];
    pendingWordId = nextWord ? nextWord.id : null;
    index = clamped;
    showFront = true;
    render();
  }

  function prevCard() {
    if (index > 0) {
      jumpToIndex(index - 1);
    }
  }
  function nextCard() {
    if (index < view.length - 1) {
      jumpToIndex(index + 1);
    }
  }
  function flipCard() {
    showFront = !showFront;
    render();
  }

  function handleTapZone(clientX: number, clientY: number) {
    if (!view.length) return;
    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const relX = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const relY = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    if (relY >= 0.75) {
      if (relX < 0.5) {
        prevCard();
      } else {
        nextCard();
      }
    } else {
      flipCard();
    }
  }

  function toggleStarForCurrent() {
    if (!currentWord) return;
    Prog.setStar(currentWord.termKey, !Prog.star(currentWord.termKey));
    render();
  }

  function setWeightForCurrent(weight: number) {
    if (!currentWord) return;
    Prog.setWeight(currentWord.termKey, weight);
    render();
  }

  // Buttons
  prev.addEventListener('click', prevCard);
  flip.addEventListener('click', flipCard);
  next.addEventListener('click', nextCard);
  progressSlider.addEventListener('pointerdown', () => {
    if (progressSlider.disabled) return;
    isSliderDrag = true;
  });
  const releaseSlider = () => { isSliderDrag = false; };
  progressSlider.addEventListener('pointerup', releaseSlider);
  progressSlider.addEventListener('pointercancel', releaseSlider);
  progressSlider.addEventListener('pointerleave', (e: PointerEvent) => {
    if (e.buttons === 0) isSliderDrag = false;
  });
  progressSlider.addEventListener('input', () => {
    if (progressSlider.disabled) return;
    const nextIndex = Number(progressSlider.value) - 1;
    if (!Number.isNaN(nextIndex)) {
      jumpToIndex(nextIndex);
    }
  });

  // Guarded card click
  function onCardClick(e: MouseEvent) {
    if (suppressNextCardClick) {
      suppressNextCardClick = false; // consume the suppression
      return;
    }
    if (e.target instanceof Element && e.target.closest('.topright')) return;
    handleTapZone(e.clientX, e.clientY);
  }
  card.addEventListener('click', onCardClick);

  // Touch support
  if (supportsPointerEvents) {
    card.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      if (e.target instanceof Element && e.target.closest('.topright')) {
        pointerGesture = null;
        return;
      }
      pointerGesture = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        t: Date.now()
      };
      try { card.setPointerCapture(e.pointerId); } catch {
        // ignore capture issues
      }
    });

    card.addEventListener('pointerup', (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      if (!pointerGesture || pointerGesture.id !== e.pointerId) return;
      const dx = e.clientX - pointerGesture.x;
      const dy = e.clientY - pointerGesture.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      const dt = Date.now() - pointerGesture.t;
      pointerGesture = null;

      const swipeThreshold = 60;
      if (adx > ady && adx >= swipeThreshold) {
        if (dx > 0) {
          prevCard();
        } else {
          nextCard();
        }
        return;
      }

      const tapMove = 35;
      const tapTime = 450;
      if (adx <= tapMove && ady <= tapMove && dt <= tapTime) {
        handleTapZone(e.clientX, e.clientY);
        suppressNextCardClick = true;
      }
      try { card.releasePointerCapture(e.pointerId); } catch {
        // ignore release issues
      }
    });

    card.addEventListener('pointercancel', (e: PointerEvent) => {
      pointerGesture = null;
      try {
        card.releasePointerCapture(e.pointerId);
      } catch {
        // ignore release issues
      }
    });
  } else {
    card.addEventListener('touchstart', (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const insideTop = !!(el && el.closest('.topright'));
      touchInfo = {
        x: t.clientX,
        y: t.clientY,
        t: Date.now(),
        insideTop
      };
    }, { passive: true });

    card.addEventListener('touchend', (e: TouchEvent) => {
      if (!touchInfo) return;
      if (touchInfo.insideTop) {
        touchInfo = null;
        return;
      }
      const endTouch = e.changedTouches[0];
      if (!endTouch) {
        touchInfo = null;
        return;
      }
      const dx = endTouch.clientX - touchInfo.x;
      const dy = endTouch.clientY - touchInfo.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      const dt = Date.now() - touchInfo.t;
      touchInfo = null;

      const swipeThreshold = 60;
      if (adx > ady && adx >= swipeThreshold) {
        if (dx > 0) {
          prevCard();
        } else {
          nextCard();
        }
        return;
      }

      const tapMove = 35;
      const tapTime = 450;
      if (adx <= tapMove && ady <= tapMove && dt <= tapTime) {
        handleTapZone(endTouch.clientX, endTouch.clientY);
        suppressNextCardClick = true;
      }
    });
  }

  // Keyboard navigation (ignore when a control has focus)
  function handleKey(e: KeyboardEvent) {
    const ae = document.activeElement;
    const tag = ae?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'button') return;
    if (ae && ae.closest('.topright')) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevCard();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextCard();
    } else if (
      e.key === ' ' ||
      e.key === 'Enter' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown'
    ) {
      e.preventDefault();
      flipCard();
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      toggleStarForCurrent();
    } else if (/^[1-5]$/.test(e.key)) {
      e.preventDefault();
      setWeightForCurrent(Number(e.key));
    }
  }
  window.addEventListener('keydown', handleKey);

  // Cleanup when leaving view
  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    window.removeEventListener('keydown', handleKey);
    card.removeEventListener('click', onCardClick);
    container.innerHTML = '';
    if (bar.parentNode) {
      bar.remove();
    }
    document.body.classList.remove('pad-bottom');
  }

  container.appendChild(progress);
  container.appendChild(card);
  render();
  const eventUnsubs = [
    onStateEvent('wordsChanged', () => render()),
    onStateEvent('filtersChanged', () => render()),
    onStateEvent('sortChanged', () => render()),
    onStateEvent('orderChanged', () => render()),
    onStateEvent('uiChanged', () => render()),
    onStateEvent('progressChanged', () => render())
  ];
  const destroy = () => {
    cleanup();
    eventUnsubs.forEach((unsub) => unsub());
  };

  return { destroy };
}
