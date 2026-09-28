import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const source = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1];

function loadQuiz() {
  let now = 1_700_000_000_000;
  let confirms = true;
  let confirmationCount = 0;
  const saved = new Map();
  const app = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => ({ addEventListener() {} }),
  };
  const elements = new Map([['app', app]]);
  const document = {
    documentElement: { dataset: {} },
    hidden: false,
    hasFocus: () => true,
    addEventListener() {},
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, {
        addEventListener() {},
        focus() {},
        classList: { toggle() {} },
        textContent: '',
      });
      return elements.get(id);
    },
  };
  const localStorage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: (key) => saved.delete(key),
  };
  const sandbox = {
    document,
    localStorage,
    window: { addEventListener() {}, matchMedia: () => ({ matches: false }) },
    location: { search: '' },
    URLSearchParams,
    crypto: { getRandomValues: (array) => { array[0] = 42; return array; } },
    requestAnimationFrame: (callback) => callback(),
    setInterval: () => 1,
    clearInterval() {},
    confirm: () => { confirmationCount += 1; return confirms; },
    Date: class extends Date { static now() { return now; } },
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return {
    app,
    saved,
    window: sandbox.window,
    run: (expression) => vm.runInContext(expression, sandbox),
    advance: (milliseconds) => { now += milliseconds; },
    confirmWith: (value) => { confirms = value; },
    confirmations: () => confirmationCount,
  };
}

test('exam draws 60 unique scenario questions in fixed domain quotas', () => {
  const quiz = loadQuiz();
  const domains = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'];
  const totalItems = quiz.run('TOTAL_ITEMS');
  // Quotas follow the bank's own domain proportions, so they track the blueprint
  // as the bank fills out instead of needing a new literal on every authoring pass.
  const expected = domains.map((domain) => quiz.run(`DOMAINS.find((d) => d.id === ${JSON.stringify(domain)}).count`) * 60 / totalItems);

  quiz.run("config.form = 'examForm'");
  let firstDraw = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pool = quiz.run('buildPool()');
    assert.equal(pool.length, 60);
    assert.equal(new Set(pool.map((item) => item.id)).size, 60);
    assert.ok(pool.every((item) => quiz.run(`isExamEligible(ITEM_BANK.find((i) => i.id === ${JSON.stringify(item.id)}))`)));

    const counts = domains.map((domain) => pool.filter((item) => item.domain === domain).length);
    counts.forEach((count, idx) => {
      assert.ok(Math.abs(count - expected[idx]) < 1, `${domains[idx]} drew ${count}, expected about ${expected[idx].toFixed(2)}`);
    });
    firstDraw ??= counts;
    assert.deepEqual(counts, firstDraw, 'domain quotas must be identical on every draw');
  }
});

test('every item carries a blueprint topic and a known source tier', () => {
  const quiz = loadQuiz();
  assert.equal(quiz.run('ITEM_BANK.filter((item) => !TOPIC_BY_ID.has(item.topic)).length'), 0);
  assert.equal(quiz.run('ITEM_BANK.filter((item) => TOPIC_BY_ID.get(item.topic).domain !== item.domain).length'), 0);
  assert.equal(quiz.run('ITEM_BANK.filter((item) => !SOURCE_TIER_LABELS[item.sourceTier]).length'), 0);
  assert.equal(quiz.run('ITEM_BANK.filter((item) => item.answer < 0 || item.answer >= item.options.length).length'), 0);
  assert.equal(quiz.run('new Set(ITEM_BANK.map((item) => item.id)).size'), quiz.run('ITEM_BANK.length'));
});

test('option length does not reveal the keyed answer across the bank', () => {
  const quiz = loadQuiz();
  const longestIsKey = quiz.run(`ITEM_BANK.filter((item) => {
    const lengths = item.options.map((option) => option.length);
    return lengths[item.answer] === Math.max(...lengths);
  }).length`);
  const baseline = quiz.run('ITEM_BANK.length / 5');

  assert.ok(longestIsKey <= baseline, `${longestIsKey} keyed answers are longest; expected at most ${baseline}`);
});

test('model-knowledge items never reach an exam form', () => {
  const quiz = loadQuiz();
  assert.equal(quiz.run("ITEM_BANK.filter((item) => item.sourceTier === 'modelKnowledge' && isExamEligible(item)).length"), 0);
  quiz.run("config.form = 'examForm'");
  assert.equal(quiz.run("buildPool().filter((item) => item.sourceTier === 'modelKnowledge').length"), 0);
});

test('every question has a concise scenario shown above its stem, not in results', () => {
  const quiz = loadQuiz();
  assert.equal(quiz.run('ITEM_BANK.filter((item) => !item.sourceScenario || !SCENARIOS.has(item.sourceScenario.n)).length'), 0);

  quiz.run("config.form = 'studySet'; config.clock = 'untimed'; startAttempt()");
  assert.match(quiz.app.innerHTML, /class="scenario-context"/);
  assert.match(quiz.app.innerHTML, /Scenario \d+/);

  quiz.run('finishAttempt()');
  assert.doesNotMatch(quiz.app.innerHTML, /class="scenario-context"/);
});

test('named organizations in question stems are introduced by their scenario', () => {
  const quiz = loadQuiz();
  const organizations = [
    ['Northwind Regional', 1],
    ['Meridian Trust', 2],
    ['Halverson Supply', 3],
    ['Lumen Labs', 4],
    ['Brightline Consulting', 5],
    ['Kestrel Interactive', 6],
    ['Verity Clinical Data', 7],
    ['Tidemark', 8],
    ['Calder Freight', 9],
    ['Rockford Savings', 10],
  ];

  for (const [name, scenarioNumber] of organizations) {
    const items = quiz.run(`ITEM_BANK.filter((item) => item.question.includes(${JSON.stringify(name)}))`);
    const scenario = quiz.run(`SCENARIOS.get(${scenarioNumber})`);
    assert.ok(items.length > 0, `Expected question stems to mention ${name}`);
    assert.ok(items.every((item) => item.sourceScenario.n === scenarioNumber), `${name} questions should use scenario ${scenarioNumber}`);
    assert.ok(scenario.description.includes(name), `Scenario ${scenarioNumber} should introduce ${name}`);
  }
});

test('exam deadline advances while idle, expires on resume, and ignores blur', () => {
  const quiz = loadQuiz();
  quiz.run("config.form = 'examForm'; config.clock = 'timed'; startAttempt()");
  assert.equal(quiz.run('state.attempt.remainingSeconds'), 7200);
  assert.equal(quiz.run('state.attempt.deadlineAt - state.attempt.startedAt'), 7200_000);
  quiz.advance(67 * 60_000);
  quiz.run('tickTimer()');
  assert.equal(quiz.run('state.attempt.remainingSeconds'), 3180);
  quiz.advance(53 * 60_000);
  quiz.run('syncTimerInterval()');
  assert.equal(quiz.run('state.view'), 'results');
  assert.equal(quiz.run('state.attempt.autoSubmitted'), true);
  assert.equal(quiz.confirmations(), 0);
});

test('study clocks remain pausable and old exam attempts without deadlines are rejected', () => {
  const quiz = loadQuiz();
  quiz.run("config.form = 'studySet'; config.clock = 'timed'; startAttempt()");
  const before = quiz.run('state.attempt.remainingSeconds');
  assert.equal(quiz.run('state.attempt.deadlineAt'), null);
  quiz.advance(60_000);
  quiz.run('syncTimerInterval()');
  assert.equal(quiz.run('state.attempt.remainingSeconds'), before);
  quiz.run('tickTimer()');
  assert.equal(quiz.run('state.attempt.remainingSeconds'), before - 1);

  quiz.run("config.form = 'examForm'; delete state.attempt.deadlineAt; saveAttempt(); state.attempt = null");
  assert.equal(quiz.run('resumeSavedAttempt()'), false);
  assert.equal(quiz.run('state.view'), 'config');
  assert.equal(quiz.saved.has('devFoundationPractice.attempt.v1'), false);
});

test('flagged questions are navigable and manual submission can be canceled', () => {
  const quiz = loadQuiz();
  quiz.run("config.form = 'examForm'; config.clock = 'timed'; startAttempt(); toggleFlag()");
  assert.equal(quiz.run('state.attempt.flagged[0]'), true);
  quiz.run('jumpToQuestion(3)');
  assert.equal(quiz.run('state.attempt.index'), 3);
  quiz.confirmWith(false);
  quiz.run('requestSubmit()');
  assert.equal(quiz.run('state.view'), 'exam');
  quiz.confirmWith(true);
  quiz.run('requestSubmit()');
  assert.equal(quiz.run('state.view'), 'results');
  assert.match(quiz.app.innerHTML, /flagged/);
  assert.equal(quiz.confirmations(), 2);
});

test('exam skips count against 1000 points; study skips remain visible but ungraded', () => {
  const quiz = loadQuiz();
  quiz.run(`state.attempt = {
    pool: ITEM_BANK.slice(0, 3), index: 0,
    answers: [ITEM_BANK[0].answer, ITEM_BANK[1].answer, null],
    checked: [false, false, false], flagged: [false, false, true],
    timerId: null, autoSubmitted: false
  }; state.view = 'results'; config.form = 'examForm'; renderResults()`);
  assert.match(quiz.app.innerHTML, /<span>667<\/span>/);
  assert.match(quiz.app.innerHTML, /67%/);
  assert.match(quiz.app.innerHTML, /2 \/ 3 correct/);
  assert.match(quiz.app.innerHTML, /Your answer: Unanswered/);
  assert.doesNotMatch(quiz.app.innerHTML, /undefined/);
  quiz.run("config.form = 'studySet'; renderResults()");
  assert.match(quiz.app.innerHTML, /<span>1000<\/span>/);
  assert.match(quiz.app.innerHTML, /2 \/ 2 correct/);
  assert.match(quiz.app.innerHTML, /Your answer: Unanswered/);
});

test('score weights each attempted domain by its exam blueprint weight, redistributing unattempted weight', () => {
  const quiz = loadQuiz();
  // Only d1 (14.7% weight) and d2 (33.1% weight) are attempted: d1 fully correct, d2 fully wrong.
  // Redistributed: 1 * (14.7/47.8) + 0 * (33.1/47.8) = 0.3075 -> 308/1000, below the 720 pass mark.
  quiz.run(`
    const pool = ['d1', 'd2'].map((domain) => ITEM_BANK.find((i) => i.domain === domain));
    state.attempt = {
      pool, index: 0,
      answers: [pool[0].answer, (pool[1].answer + 1) % pool[1].options.length],
      checked: [false, false], flagged: [false, false],
      timerId: null, autoSubmitted: false
    };
    state.view = 'results'; config.form = 'examForm'; renderResults();
  `);
  assert.match(quiz.app.innerHTML, /<span>308<\/span>/);
  assert.match(quiz.app.innerHTML, /31%/);
  assert.match(quiz.app.innerHTML, /Below pass mark/);
  assert.match(quiz.app.innerHTML, /14\.7% weight/);
  assert.match(quiz.app.innerHTML, /33\.1% weight/);
  assert.doesNotMatch(quiz.app.innerHTML, /D3|D4|D5|D6|D7|D8/);

  quiz.run(`
    const pool2 = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'].map((domain) => ITEM_BANK.find((i) => i.domain === domain));
    state.attempt = {
      pool: pool2, index: 0,
      answers: pool2.map((item) => item.answer),
      checked: pool2.map(() => false), flagged: pool2.map(() => false),
      timerId: null, autoSubmitted: false
    };
    renderResults();
  `);
  assert.match(quiz.app.innerHTML, /<span>1000<\/span>/);
  assert.match(quiz.app.innerHTML, /Pass<\/strong> \(720 needed\)/);
});

test('submitting twice records each answer once', () => {
  const quiz = loadQuiz();
  quiz.run("config.form = 'examForm'; config.clock = 'timed'; startAttempt(); finishAttempt(); finishAttempt()");
  const history = JSON.parse(quiz.saved.get('devFoundationPractice.itemHistory.v1'));
  assert.equal(Object.values(history).reduce((sum, entry) => sum + entry.seen, 0), 60);
});

test('unanswered study items remain ungraded in practice history', () => {
  const quiz = loadQuiz();
  quiz.run(`config.form = 'studySet'; state.view = 'exam'; state.attempt = {
    pool: ITEM_BANK.slice(0, 2), answers: [ITEM_BANK[0].answer, null],
    checked: [false, false], flagged: [false, false], timerId: null
  }; finishAttempt()`);
  const history = JSON.parse(quiz.saved.get('devFoundationPractice.itemHistory.v1'));
  assert.equal(Object.values(history).reduce((sum, entry) => sum + entry.seen, 0), 1);
  assert.match(quiz.app.innerHTML, /Your answer: Unanswered/);
});

test('PDF exports points, percent, and unanswered items without indexing a missing answer', () => {
  const quiz = loadQuiz();
  const text = [];
  let filename;
  quiz.window.jspdf = { jsPDF: class {
    internal = { pageSize: { getWidth: () => 612, getHeight: () => 792 } };
    setFontSize() {}
    setFont() {}
    setTextColor() {}
    setFillColor() {}
    setDrawColor() {}
    setLineWidth() {}
    roundedRect() {}
    addPage() {}
    splitTextToSize(value) { return [value]; }
    text(value) { text.push(value); }
    save(value) { filename = value; }
  } };
  quiz.run(`state.attempt = { flagged: [true, false] }; exportResultsToPdf(
    [{ item: ITEM_BANK[0], idx: 0, selected: ITEM_BANK[0].answer },
     { item: ITEM_BANK[1], idx: 1, selected: null }],
    1, 2, 500, 50, [{ ...DOMAINS[0], correct: 1, attempted: 2 }])`);
  assert.ok(text.includes('500 / 1000'));
  assert.ok(text.some((line) => line.includes('50%') && line.includes('1 / 2 correct')));
  assert.ok(text.includes('Your answer: Unanswered'));
  assert.ok(text.some((line) => line.includes('FLAGGED')));
  assert.match(filename, /^quiz-results-\d{4}-\d{2}-\d{2}\.pdf$/);
});