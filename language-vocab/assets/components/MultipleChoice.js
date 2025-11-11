// assets/components/MultipleChoice.js
import { applyFilters, LS, State, subscribe } from '../state.js';

const PREF_KEY = 'v24:choicePrefs';
const DEFAULT_PREFS = { size: 10, direction: 'es-en', answers: 4 };
const MIN_SET = 4;
const MAX_SET = 15;
const MIN_PLAYABLE = 2;
const MIN_ANSWERS = 2;
const MAX_ANSWERS = 6;
const CORRECT_ADVANCE_DELAY = 1000;

export function mountMultipleChoice(container) {
  container.innerHTML = '';

  document.querySelectorAll('.bottombar').forEach((el) => el.remove());
  document.body.classList.remove('pad-bottom');

  const prefs = loadPrefs();
  let available = computeAvailable();
  let roundWords = [];
  let questionIndex = 0;
  let currentQuestion = null;
  let awaitingContinue = false;
  let questionLocked = false;
  let feedbackTimer = null;

  const statusText = document.createElement('span');
  statusText.className = 'match-status-text';
  statusText.textContent = 'Loading...';

  const wrap = document.createElement('div');
  wrap.className = 'choice-wrap';

  const controls = buildToolbar({
    statusText,
    onPlayAgain: () => startRound()
  });

  wrap.appendChild(controls.root);
  controls.updateAvailabilityHint();

  const board = document.createElement('div');
  board.className = 'choice-board panel';

  const progress = document.createElement('div');
  progress.className = 'choice-progress';
  const progressLabel = document.createElement('span');
  progressLabel.className = 'choice-progress-label';
  const progressBar = document.createElement('div');
  progressBar.className = 'choice-progress-bar';
  const progressFill = document.createElement('div');
  progressFill.className = 'choice-progress-fill';
  progressBar.appendChild(progressFill);
  progress.append(progressLabel, progressBar);

  const questionWrap = document.createElement('div');
  questionWrap.className = 'choice-question';
  const questionLang = document.createElement('span');
  questionLang.className = 'choice-question-lang';
  const questionText = document.createElement('div');
  questionText.className = 'choice-question-text';
  questionWrap.append(questionLang, questionText);

  const promptSub = document.createElement('div');
  promptSub.className = 'choice-subtitle';
  promptSub.textContent = 'Choose the answer';

  const answersList = document.createElement('div');
  answersList.className = 'choice-answers';

  const feedback = document.createElement('div');
  feedback.className = 'choice-feedback';

  const continueBtn = document.createElement('button');
  continueBtn.type = 'button';
  continueBtn.className = 'choice-continue';
  continueBtn.textContent = 'Continue';
  continueBtn.hidden = true;
  continueBtn.disabled = true;

  board.append(progress, questionWrap, promptSub, answersList, feedback, continueBtn);
  wrap.appendChild(board);
  container.appendChild(wrap);

  startRound();
  updateStatusText();

  const unsubscribe = subscribe(() => handleStateChange());
  const keyHandler = (e) => handleKey(e);
  window.addEventListener('keydown', keyHandler);
  continueBtn.addEventListener('click', () => {
    if (!awaitingContinue) return;
    advanceQuestion();
  });

  return () => {
    unsubscribe();
    window.removeEventListener('keydown', keyHandler);
    clearTimeout(feedbackTimer);
  };

  // ---- helpers ----
  function loadPrefs() {
    const stored = LS.get(PREF_KEY, {});
    const direction = ['es-en', 'en-es', 'random'].includes(stored.direction) ? stored.direction : DEFAULT_PREFS.direction;
    return {
      size: clampSize(stored.size ?? DEFAULT_PREFS.size),
      direction,
      answers: clampAnswers(stored.answers ?? DEFAULT_PREFS.answers)
    };
  }

  function savePrefs() {
    LS.set(PREF_KEY, prefs);
  }

  function clampSize(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return DEFAULT_PREFS.size;
    return Math.max(MIN_SET, Math.min(MAX_SET, Math.round(num)));
  }

  function clampAnswers(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return DEFAULT_PREFS.answers;
    return Math.max(MIN_ANSWERS, Math.min(MAX_ANSWERS, Math.round(num)));
  }

  function computeAvailable() {
    const filtered = applyFilters(State.words || []);
    return filtered.filter(w => (w.es || '').trim() && (w.en || '').trim());
  }

  function startRound() {
    clearTimeout(feedbackTimer);
    feedbackTimer = null;
    awaitingContinue = false;
    continueBtn.hidden = true;
    continueBtn.disabled = true;
    feedback.textContent = '';

    if (available.length < MIN_PLAYABLE) {
      roundWords = [];
      currentQuestion = null;
      questionIndex = 0;
      showUnavailableState();
      return;
    }

    const desired = clampSize(prefs.size);
    const usable = Math.min(desired, available.length);
    roundWords = shuffle([...available]).slice(0, usable);
    questionIndex = 0;
    nextQuestion();
    updateStatusText();
  }

  function showUnavailableState() {
    progressLabel.textContent = 'Not enough words';
    progressFill.style.width = '0%';
    questionLang.textContent = '';
    questionText.textContent = 'Need at least two filtered words with translations to play.';
    answersList.innerHTML = '';
    promptSub.style.visibility = 'hidden';
  }

  function nextQuestion() {
    clearTimeout(feedbackTimer);
    feedbackTimer = null;
    awaitingContinue = false;
    continueBtn.hidden = true;
    continueBtn.disabled = true;
    promptSub.style.visibility = 'visible';
    questionLocked = false;

    if (!roundWords.length) {
      showUnavailableState();
      return;
    }

    if (questionIndex >= roundWords.length) {
      renderRoundComplete();
      return;
    }

    const word = roundWords[questionIndex];
    currentQuestion = buildQuestion(word);

    if (!currentQuestion) {
      questionIndex++;
      nextQuestion();
      return;
    }
    renderQuestion();
  }

  function buildQuestion(word) {
    const mode = prefs.direction === 'random'
      ? (Math.random() < 0.5 ? 'es-en' : 'en-es')
      : prefs.direction;
    const promptLang = mode === 'es-en' ? 'es' : 'en';
    const answerLang = promptLang === 'es' ? 'en' : 'es';

    const prompt = (word[promptLang] || '').trim();
    const correctText = (word[answerLang] || '').trim();
    if (!prompt || !correctText) return null;

    const candidatePool = roundWords
      .filter(w => w.id !== word.id)
      .filter(w => (w[answerLang] || '').trim());

    const maxAnswers = Math.max(
      MIN_ANSWERS,
      Math.min(prefs.answers, candidatePool.length + 1, MAX_ANSWERS)
    );

    const answers = [{
      id: word.id,
      text: correctText,
      isCorrect: true
    }];
    const usedTexts = new Set([correctText.toLowerCase()]);

    shuffle(candidatePool).some(candidate => {
      if (answers.length >= maxAnswers) return true;
      const text = (candidate[answerLang] || '').trim();
      if (!text || usedTexts.has(text.toLowerCase())) return false;
      answers.push({ id: candidate.id, text, isCorrect: false });
      usedTexts.add(text.toLowerCase());
      return false;
    });

    if (answers.length < MIN_ANSWERS) return null;

    return {
      word,
      promptLang,
      answerLang,
      prompt,
      answers: shuffle(answers),
      correctId: word.id,
      mode
    };
  }

  function renderQuestion() {
    if (!currentQuestion) return;
    feedback.textContent = '';

    const total = roundWords.length || 1;
    progressLabel.textContent = `Question ${Math.min(questionIndex + 1, total)} / ${total}`;
    progressFill.style.width = `${((questionIndex) / total) * 100}%`;

    questionLang.textContent = currentQuestion.promptLang === 'es' ? 'Spanish' : 'English';
    questionText.textContent = currentQuestion.prompt;

    answersList.innerHTML = '';
    currentQuestion.answers.forEach((answer, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-answer';
      btn.dataset.id = answer.id;
      btn.dataset.index = String(idx + 1);
      btn.innerHTML = `
        <span class="choice-answer-index">${idx + 1}</span>
        <span class="choice-answer-text">${answer.text || '—'}</span>
      `;
      btn.addEventListener('click', () => selectAnswer(answer.id));
      answersList.appendChild(btn);
    });
  }

  function renderRoundComplete() {
    currentQuestion = null;
    progressLabel.textContent = `Complete • ${roundWords.length} / ${roundWords.length}`;
    progressFill.style.width = '100%';
    questionLang.textContent = '';
    questionText.textContent = 'Nice work! Hit Play Again to load a new set.';
    promptSub.style.visibility = 'hidden';
    answersList.innerHTML = '';
    feedback.textContent = '';
    continueBtn.hidden = true;
    continueBtn.disabled = true;
  }

  function selectAnswer(answerId) {
    if (!currentQuestion) return;
    if (awaitingContinue) return;
    if (questionLocked) return;
    questionLocked = true;
    const correctId = currentQuestion.correctId;
    const isCorrect = answerId === correctId;

    highlightAnswers(answerId, correctId);

    if (isCorrect) {
      feedback.textContent = 'Correct!';
      feedbackTimer = setTimeout(() => {
        questionIndex++;
        nextQuestion();
      }, CORRECT_ADVANCE_DELAY);
    } else {
      feedback.textContent = 'Not quite, review the correct answer.';
      awaitingContinue = true;
      continueBtn.hidden = false;
      continueBtn.disabled = false;
      continueBtn.textContent = questionIndex + 1 >= roundWords.length ? 'Finish' : 'Continue';
    }
  }

  function highlightAnswers(selectedId, correctId) {
    answersList.querySelectorAll('.choice-answer').forEach((btn) => {
      const id = btn.dataset.id;
      btn.classList.add('is-disabled');
      if (id === correctId) {
        btn.classList.add('is-correct');
      }
      if (id === selectedId && selectedId !== correctId) {
        btn.classList.add('is-wrong');
      }
    });
  }

  function advanceQuestion() {
    awaitingContinue = false;
    continueBtn.hidden = true;
    continueBtn.disabled = true;
    questionIndex++;
    nextQuestion();
  }

  function updateStatusText() {
    const usable = Math.min(prefs.size, available.length);
    statusText.textContent = `${usable} question${usable === 1 ? '' : 's'} • Using ${available.length} filtered words`;
  }

  function handleStateChange() {
    available = computeAvailable();
    controls.updateAvailabilityHint();
    updateStatusText();
    if (available.length < MIN_PLAYABLE) {
      startRound();
      return;
    }
    if (roundWords.some(w => !available.find(a => a.id === w.id))) {
      startRound();
    }
  }

  function handleKey(e) {
    if (currentQuestion && !awaitingContinue) {
      const idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= currentQuestion.answers.length) {
        const answer = currentQuestion.answers[idx - 1];
        selectAnswer(answer.id);
        return;
      }
    }
    if (awaitingContinue && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      advanceQuestion();
    }
  }

  function buildToolbar({ statusText, onPlayAgain }) {
    const root = document.createElement('div');
    root.className = 'match-toolbar panel';

    // Set size select
    const sizeControl = document.createElement('div');
    sizeControl.className = 'match-toolbar-item match-size-control';
    const sizeLabel = document.createElement('span');
    sizeLabel.textContent = 'Set size';
    const sizeSelect = document.createElement('select');
    sizeSelect.className = 'match-select';
    for (let n = MIN_SET; n <= MAX_SET; n++) {
      const opt = document.createElement('option');
      opt.value = String(n);
      opt.textContent = String(n);
      sizeSelect.appendChild(opt);
    }
    sizeSelect.value = String(prefs.size);
    sizeSelect.addEventListener('change', () => {
      prefs.size = clampSize(sizeSelect.value);
      sizeSelect.value = String(prefs.size);
      savePrefs();
      updateStatusText();
    });
    sizeControl.append(sizeLabel, sizeSelect, createSuffix('words'));

    // Direction select
    const dirControl = document.createElement('div');
    dirControl.className = 'match-toolbar-item match-direction';
    const dirLabel = document.createElement('span');
    dirLabel.textContent = 'Direction';
    const dirSelect = document.createElement('select');
    dirSelect.className = 'match-select';
    [
      { key: 'es-en', label: 'ES → EN' },
      { key: 'en-es', label: 'EN → ES' },
      { key: 'random', label: 'Random' }
    ].forEach(({ key, label }) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = label;
      dirSelect.appendChild(opt);
    });
    dirSelect.value = prefs.direction;
    dirSelect.addEventListener('change', () => {
      prefs.direction = dirSelect.value;
      savePrefs();
      updateStatusText();
    });
    dirControl.append(dirLabel, dirSelect);

    // Answer count
    const answerControl = document.createElement('div');
    answerControl.className = 'match-toolbar-item match-size-control';
    const answerLabel = document.createElement('span');
    answerLabel.textContent = '# answers';
    const answerSelect = document.createElement('select');
    answerSelect.className = 'match-select';
    for (let n = MIN_ANSWERS; n <= MAX_ANSWERS; n++) {
      const opt = document.createElement('option');
      opt.value = String(n);
      opt.textContent = String(n);
      answerSelect.appendChild(opt);
    }
    answerSelect.value = String(prefs.answers);
    answerSelect.addEventListener('change', () => {
      prefs.answers = clampAnswers(answerSelect.value);
      answerSelect.value = String(prefs.answers);
      savePrefs();
    });
    answerControl.append(answerLabel, answerSelect);

    const statusWrap = document.createElement('div');
    statusWrap.className = 'match-toolbar-item match-status-wrap';
    statusWrap.appendChild(statusText);

    const playAgainBtn = document.createElement('button');
    playAgainBtn.type = 'button';
    playAgainBtn.className = 'match-play-again';
    playAgainBtn.textContent = 'Play Again';
    playAgainBtn.addEventListener('click', () => onPlayAgain());

    root.append(sizeControl, dirControl, answerControl, statusWrap, playAgainBtn);

    return {
      root,
      updateAvailabilityHint() {
        const usable = Math.min(prefs.size, available.length);
        playAgainBtn.disabled = available.length < MIN_PLAYABLE;
        statusText.textContent = `${usable} question${usable === 1 ? '' : 's'} • Using ${available.length} filtered words`;
      }
    };
  }

  function createSuffix(text) {
    const span = document.createElement('span');
    span.className = 'match-size-suffix';
    span.textContent = text;
    return span;
  }
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
