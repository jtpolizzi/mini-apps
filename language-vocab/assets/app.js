import { mountFlashcards } from './components/Flashcards.js';
import { mountSettings } from './components/SettingsModal.js';
import { mountTopBar } from './components/TopBar.js';
import { mountWordList } from './components/WordList.js';
import { mountWordMatch } from './components/WordMatch.js';
import { mountMultipleChoice } from './components/MultipleChoice.js';
import { State, hydrateWords, setLoaderStatus } from './state.js';
import { loadWords, onDataEvent, getLoaderStatus } from './data/loader.js';

const topbar = document.getElementById('topbar');
const view = document.getElementById('view');
const loaderStatus = document.createElement('div');
loaderStatus.className = 'loader-status';
loaderStatus.textContent = 'Loading words...';

const VIEW_REGISTRY = {
    list: mountWordList,
    cards: mountFlashcards,
    match: mountWordMatch,
    choice: mountMultipleChoice
};

let cleanupView = () => {};

normalizeDestroy(mountTopBar(topbar));
mountSettings();

function resolveRoute(hash) {
    const normalized = (hash || '#/list').toLowerCase();
    if (normalized.startsWith('#/cards')) return 'cards';
    if (normalized.startsWith('#/match')) return 'match';
    if (normalized.startsWith('#/choice')) return 'choice';
    return 'list';
}

function normalizeDestroy(result) {
    if (typeof result === 'function') return result;
    if (result && typeof result.destroy === 'function') return () => result.destroy();
    return () => {};
}

function renderRoute() {
    cleanupView();
    cleanupView = () => {};

    const hasWords = Array.isArray(State.words) && State.words.length > 0;

    const hash = location.hash || '#/list';
    setActiveNav(hash);
    const route = resolveRoute(hash);
    const mount = hasWords ? (VIEW_REGISTRY[route] || VIEW_REGISTRY.list) : null;

    view.innerHTML = '';
    if (hasWords && mount) {
        cleanupView = normalizeDestroy(mount(view));
    } else {
        view.appendChild(loaderStatus);
    }
}

window.addEventListener('hashchange', renderRoute);

function setActiveNav(hash) {
    const links = document.querySelectorAll('.app-header nav a');
    links.forEach((link) => {
        const target = link.getAttribute('href') || '';
        const isActive = target && hash.startsWith(target);
        link.classList.toggle('active', !!isActive);
        if (isActive) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

// --- TSV loader ---
function parseTSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    const headers = lines[0].split('\t').map(h => h.trim());
    const idx = {
        word: headers.findIndex(h => /^(word|spanish)$/i.test(h)),
        definition: headers.findIndex(h => /^(definition|english)$/i.test(h)),
        POS: headers.findIndex(h => /^pos$/i.test(h)),
        CEFR: headers.findIndex(h => /^cefr$/i.test(h)),
        Tags: headers.findIndex(h => /^tags?$/i.test(h)),
    };
    const out = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        if (cols.every(c => !c || !c.trim())) continue;
        out.push({
            word: (idx.word >= 0 ? cols[idx.word] : '').trim(),
            definition: (idx.definition >= 0 ? cols[idx.definition] : '').trim(),
            POS: (idx.POS >= 0 ? cols[idx.POS] : '').trim(),
            CEFR: (idx.CEFR >= 0 ? cols[idx.CEFR] : '').trim(),
            Tags: (idx.Tags >= 0 ? cols[idx.Tags] : '').trim(),
        });
    }
    return out;
}

async function loadData() {
    const offLoading = onDataEvent('loading', () => {
        setLoaderStatus('loading');
        loaderStatus.textContent = 'Loading words...';
        renderRoute();
    });
    const offLoaded = onDataEvent('loaded', ({ text }) => {
        const raw = parseTSV(text);
        setLoaderStatus('loaded');
        loaderStatus.textContent = `Loaded ${raw.length} words.`;
        hydrateWords(raw || [], { source: 'tsv', loadedAt: Date.now(), loaderStatus: 'loaded' });
        renderRoute();
    });
    const offError = onDataEvent('error', () => {
        setLoaderStatus('error');
        loaderStatus.textContent = 'Failed to load words. Check console for details.';
        hydrateWords([], { source: 'none', loadedAt: Date.now(), loaderStatus: 'error' });
        renderRoute();
    });

    try {
        await loadWords({ url: 'data/words.tsv' });
    } finally {
        offLoading();
        offLoaded();
        offError();
    }
}

loadData();
