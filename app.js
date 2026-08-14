const DATA_URL = "data/questions.json";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const state = {
  data: [],
  session: null,
  current: 0,
  timerId: null,
  remaining: 0,
  lastConfig: null,
  result: null
};

const LEVEL_LABELS = { easy: "Mức 1", normal: "Mức 2", hard: "Mức 3" };
const STORE_KEY = "quiz_progress_dang2025_v1";
const THEME_KEY = "quiz_theme_v1";
const EXAM_QUESTION_COUNT = 25;
const EXAM_MINUTES = 30;

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || { attempts: {}, sessions: 0 };
  } catch {
    return { attempts: {}, sessions: 0 };
  }
}
function saveProgress(progress) {
  localStorage.setItem(STORE_KEY, JSON.stringify(progress));
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function showView(id) {
  $$(".view").forEach(v => v.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.max(0, sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateProgressUI() {
  const p = loadProgress();
  const attempts = Object.values(p.attempts || {});
  const attempted = attempts.length;
  const totalAnswered = attempts.reduce((s, x) => s + (x.times || 0), 0);
  const correct = attempts.reduce((s, x) => s + (x.correct || 0), 0);
  const accuracy = totalAnswered ? Math.round(correct / totalAnswered * 100) : 0;
  $("#attemptedStat").textContent = attempted;
  $("#correctStat").textContent = correct;
  $("#accuracyStat").textContent = `${accuracy}%`;
  $("#progressBar").style.width = `${Math.round(attempted / state.data.length * 100) || 0}%`;
}

function selectMode(mode) {
  $$("#modeControl button").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  $("#timerRow").classList.toggle("hidden", mode !== "exam");

  const isExam = mode === "exam";
  const countSelect = $("#questionCount");
  const minutesInput = $("#minutes");

  if (isExam) {
    countSelect.value = String(EXAM_QUESTION_COUNT);
    minutesInput.value = String(EXAM_MINUTES);
  }

  countSelect.disabled = isExam;
  minutesInput.disabled = isExam;
  $("#examFixedNote").classList.toggle("hidden", !isExam);
}
function currentMode() {
  return $("#modeControl button.active")?.dataset.mode || "exam";
}
function readConfig() {
  const mode = currentMode();
  const levels = $$(".levelCheck:checked").map(x => x.value);
  const countRaw = $("#questionCount").value;
  const minutes = mode === "exam"
    ? EXAM_MINUTES
    : Math.max(1, Number($("#minutes").value || EXAM_MINUTES));
  return {
    mode,
    levels,
    count: mode === "exam" ? EXAM_QUESTION_COUNT : (countRaw === "all" ? "all" : Number(countRaw)),
    minutes,
    shuffleQuestions: $("#shuffleQuestions").checked,
    shuffleAnswers: $("#shuffleAnswers").checked
  };
}
function buildSession(config, sourceQuestions = null) {
  let pool = sourceQuestions || state.data.filter(q => config.levels.includes(q.level));
  if (!pool.length) throw new Error("Hãy chọn ít nhất một mức độ có câu hỏi.");
  if (config.shuffleQuestions) pool = shuffle(pool);
  const count = config.count === "all" ? pool.length : Math.min(config.count, pool.length);
  const selected = pool.slice(0, count);

  return selected.map(q => {
    let options = q.options.map(opt => ({
      originalKey: opt.key,
      text: opt.text,
      isCorrect: opt.key === q.correctOriginalKey
    }));
    if (config.shuffleAnswers) options = shuffle(options);
    return {
      id: q.id,
      question: q.question,
      level: q.level,
      options,
      selectedIndex: null,
      flagged: false,
      locked: false
    };
  });
}
function startQuiz(config = readConfig(), sourceQuestions = null) {
  $("#setupError").classList.add("hidden");

  // Mỗi bài kiểm tra luôn cố định 25 câu trong 30 phút.
  if (config.mode === "exam") {
    config = { ...config, count: EXAM_QUESTION_COUNT, minutes: EXAM_MINUTES };
  }

  try {
    state.lastConfig = { ...config };
    state.session = buildSession(config, sourceQuestions);
  } catch (e) {
    $("#setupError").textContent = e.message;
    $("#setupError").classList.remove("hidden");
    return;
  }

  state.current = 0;
  state.result = null;
  clearInterval(state.timerId);
  state.timerId = null;
  $("#quizModeLabel").textContent = config.mode === "exam" ? "KIỂM TRA" : "LUYỆN TẬP";
  $("#quizTitle").textContent = config.mode === "exam" ? "Bài kiểm tra trắc nghiệm" : "Bài luyện trắc nghiệm";
  $("#timerBox").classList.toggle("hidden", config.mode !== "exam");
  $("#submitBtn").classList.toggle("hidden", config.mode !== "exam");
  document.querySelector(".timer-card")?.classList.toggle("hidden", config.mode !== "exam");
  $("#nextBtn").classList.toggle("hidden", false);

  if (config.mode === "exam") {
    state.remaining = Math.round(config.minutes * 60);
    syncTimerDisplay();
    state.timerId = setInterval(() => {
      state.remaining--;
      syncTimerDisplay();
      if (state.remaining <= 0) finishQuiz(true);
    }, 1000);
  }

  showView("#quizView");
  renderQuestion();
  renderNavigator();
}

function syncTimerDisplay() {
  const time = formatTime(state.remaining);
  const topTimer = $("#timerBox");
  const sideTimer = $("#sidebarTimer");
  const timerCard = document.querySelector(".timer-card");
  if (topTimer) {
    const strong = topTimer.querySelector("strong");
    if (strong) strong.textContent = time;
    else topTimer.textContent = time;
    topTimer.classList.toggle("danger", state.remaining <= 60);
  }
  if (sideTimer) sideTimer.textContent = time;
  if (timerCard) timerCard.classList.toggle("danger", state.remaining <= 60);
}

function renderQuestion() {
  if (!state.session || !state.session.length) return;
  const q = state.session[state.current];
  if (!q) {
    $("#questionText").textContent = "Không tìm thấy dữ liệu câu hỏi.";
    $("#answers").innerHTML = "";
    return;
  }
  const mode = state.lastConfig.mode;
  $("#quizProgressText").textContent = `${state.current + 1} / ${state.session.length}`;
  $("#questionNumberDisplay").textContent = String(state.current + 1).padStart(2, "0");
  $("#questionLevel").textContent = `${LEVEL_LABELS[q.level]} • Câu gốc ${q.id}`;
  $("#questionText").textContent = q.question;
  $("#flagBtn").textContent = q.flagged ? "★ Đã đánh dấu" : "☆ Đánh dấu câu này";
  $("#flagBtn").classList.toggle("active", q.flagged);
  $("#prevBtn").disabled = state.current === 0;
  $("#nextBtn").textContent = state.current === state.session.length - 1 ? "Kết thúc →" : "Câu tiếp →";

  const letters = ["A", "B", "C", "D"];
  $("#answers").innerHTML = q.options.map((opt, idx) => {
    const selected = q.selectedIndex === idx;
    let cls = selected ? " selected" : "";
    if (mode === "practice" && q.locked) {
      if (opt.isCorrect) cls += " correct";
      if (selected && !opt.isCorrect) cls += " wrong";
    }
    return `<button class="answer-btn${cls}" type="button" data-index="${idx}" ${q.locked ? "disabled" : ""}>
      <span class="answer-letter">${letters[idx]}</span>
      <span>${escapeHtml(opt.text)}</span>
    </button>`;
  }).join("");

  $$(".answer-btn").forEach(btn => btn.addEventListener("click", () => chooseAnswer(Number(btn.dataset.index))));

  if (mode === "practice" && q.locked) {
    const selected = q.options[q.selectedIndex];
    const correct = q.options.find(x => x.isCorrect);
    $("#practiceFeedback").classList.remove("hidden", "good", "bad");
    $("#practiceFeedback").classList.add(selected?.isCorrect ? "good" : "bad");
    $("#practiceFeedback").innerHTML = selected?.isCorrect
      ? `<strong>Chính xác.</strong>`
      : `<strong>Chưa đúng.</strong> Đáp án đúng: ${escapeHtml(correct?.text || "Không xác định")}`;
  } else {
    $("#practiceFeedback").classList.add("hidden");
  }

  renderNavigator();
}
function chooseAnswer(index) {
  const q = state.session[state.current];
  if (q.locked) return;
  q.selectedIndex = index;
  if (state.lastConfig.mode === "practice") {
    q.locked = true;
    recordAttempt(q);
  }
  renderQuestion();
}
function recordAttempt(q) {
  if (q.selectedIndex === null) return;
  const progress = loadProgress();
  const key = String(q.id);
  const old = progress.attempts[key] || { times: 0, correct: 0, wrong: 0 };
  const isCorrect = !!q.options[q.selectedIndex]?.isCorrect;
  old.times += 1;
  old.correct += isCorrect ? 1 : 0;
  old.wrong += isCorrect ? 0 : 1;
  old.lastCorrect = isCorrect;
  progress.attempts[key] = old;
  saveProgress(progress);
  updateProgressUI();
}
function renderNavigator() {
  if (!state.session) return;
  $("#questionNav").innerHTML = state.session.map((q, i) => {
    const cls = [
      "nav-q",
      i === state.current ? "current" : "",
      q.selectedIndex !== null ? "answered" : "",
      q.flagged ? "flagged" : ""
    ].filter(Boolean).join(" ");
    return `<button type="button" class="${cls}" data-go="${i}">${i + 1}</button>`;
  }).join("");
  const answered = state.session.filter(q => q.selectedIndex !== null).length;
  const flagged = state.session.filter(q => q.flagged).length;
  const unanswered = state.session.length - answered;
  if ($("#answeredCount")) $("#answeredCount").textContent = answered;
  if ($("#unansweredCount")) $("#unansweredCount").textContent = unanswered;
  if ($("#flaggedCount")) $("#flaggedCount").textContent = flagged;
  if ($("#examProgressFill")) $("#examProgressFill").style.width = `${Math.round(answered / state.session.length * 100)}%`;
  $$(".nav-q").forEach(b => b.addEventListener("click", () => {
    state.current = Number(b.dataset.go); renderQuestion();
  }));
}
function finishQuiz(auto = false, confirmed = false) {
  if (!state.session) return;
  if (!auto && !confirmed && state.lastConfig.mode === "exam") {
    const blanks = state.session.filter(q => q.selectedIndex === null).length;
    const msg = blanks
      ? `Bạn còn ${blanks} câu chưa trả lời. Nếu nộp bài, các câu này sẽ được tính là bỏ trống.`
      : "Bạn đã trả lời đủ câu hỏi. Xác nhận nộp bài?";

    const modalEl = document.getElementById("submitConfirmModal");
    const modalText = document.getElementById("submitConfirmText");
    if (modalEl && modalText && window.bootstrap) {
      modalText.textContent = msg;
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
      return;
    }

    if (!confirm(msg)) return;
  }
  clearInterval(state.timerId);
  state.timerId = null;

  if (state.lastConfig.mode === "exam") {
    state.session.forEach(q => {
      if (q.selectedIndex !== null) recordAttempt(q);
      q.locked = true;
    });
    const p = loadProgress();
    p.sessions = (p.sessions || 0) + 1;
    saveProgress(p);
  }

  const correct = state.session.filter(q => q.selectedIndex !== null && q.options[q.selectedIndex].isCorrect).length;
  const blank = state.session.filter(q => q.selectedIndex === null).length;
  const wrong = state.session.length - correct - blank;
  const percent = Math.round(correct / state.session.length * 100);
  state.result = { correct, wrong, blank, percent };

  $("#scorePercent").textContent = `${percent}%`;
  $("#scoreText").textContent = `${correct}/${state.session.length} câu đúng`;
  $("#resultCorrect").textContent = correct;
  $("#resultWrong").textContent = wrong;
  $("#resultBlank").textContent = blank;
  $("#resultHeading").textContent = auto ? "Hết thời gian" : "Hoàn thành";
  $("#reviewList").classList.add("hidden");
  showView("#resultView");
  updateProgressUI();
}
function renderReview() {
  const letters = ["A", "B", "C", "D"];
  $("#reviewList").innerHTML = state.session.map((q, idx) => {
    const user = q.selectedIndex === null ? null : q.options[q.selectedIndex];
    const correctIdx = q.options.findIndex(o => o.isCorrect);
    return `<article class="review-item">
      <div class="meta">${LEVEL_LABELS[q.level]} • Câu gốc ${q.id} • Câu ${idx + 1} trong bài</div>
      <h4>${escapeHtml(q.question)}</h4>
      <div class="review-answer correct"><strong>Đúng:</strong> ${letters[correctIdx]}. ${escapeHtml(q.options[correctIdx].text)}</div>
      <div class="review-answer ${user && !user.isCorrect ? "user-wrong" : ""}"><strong>Bạn chọn:</strong> ${
        q.selectedIndex === null ? "Chưa trả lời" : `${letters[q.selectedIndex]}. ${escapeHtml(user.text)}`
      }</div>
    </article>`;
  }).join("");
  $("#reviewList").classList.toggle("hidden");
  if (!$("#reviewList").classList.contains("hidden")) $("#reviewList").scrollIntoView({ behavior: "smooth" });
}

function renderBank() {
  const term = $("#bankSearch").value.trim().toLowerCase();
  const level = $("#bankLevel").value;
  const reveal = $("#revealAnswers").checked;
  const normalizedNum = term.match(/^\d+$/) ? Number(term) : null;

  const list = state.data.filter(q => {
    const levelOk = level === "all" || q.level === level;
    const searchOk = !term || q.question.toLowerCase().includes(term) ||
      q.options.some(o => o.text.toLowerCase().includes(term)) ||
      q.id === normalizedNum;
    return levelOk && searchOk;
  });

  $("#bankCount").textContent = `Hiển thị ${list.length}/${state.data.length} câu`;
  $("#bankList").innerHTML = list.map(q => `
    <details class="bank-item">
      <summary><span class="meta">${LEVEL_LABELS[q.level]} • Câu ${q.id}</span><br>${escapeHtml(q.question)}</summary>
      <div class="bank-options">
        ${q.options.map(o => `<div class="bank-option ${reveal && o.key === q.correctOriginalKey ? "correct" : ""}">
          <strong>${o.key}.</strong> ${escapeHtml(o.text)} ${reveal && o.key === q.correctOriginalKey ? "<strong>✓</strong>" : ""}
        </div>`).join("")}
      </div>
    </details>
  `).join("");
}

async function init() {
  try {
    // Ưu tiên dữ liệu đã nhúng trong data/questions.js.
    // Cách này tránh lỗi đường dẫn/caching khi triển khai GitHub Pages
    // và vẫn chạy được khi mở index.html trực tiếp trên máy.
    if (window.QUIZ_DATA?.questions?.length) {
      state.data = window.QUIZ_DATA.questions;
    } else {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`Không tải được dữ liệu câu hỏi (HTTP ${res.status}).`);
      const payload = await res.json();
      state.data = payload.questions || [];
    }

    if (!state.data.length) throw new Error("Dữ liệu câu hỏi trống.");

    // Kiểm tra nhanh cấu trúc dữ liệu để tránh vào màn hình thi nhưng câu hỏi trống.
    const invalid = state.data.find(q =>
      !q || !q.question || !Array.isArray(q.options) || q.options.length < 2
    );
    if (invalid) throw new Error(`Dữ liệu câu ${invalid.id ?? "?"} không hợp lệ.`);
  } catch (e) {
    document.body.innerHTML = `
      <main class="container py-5">
        <div class="alert alert-danger shadow-sm">
          <h2 class="h4">Lỗi tải dữ liệu câu hỏi</h2>
          <p class="mb-2">${escapeHtml(e.message)}</p>
          <p class="mb-0">Hãy kiểm tra rằng thư mục <code>data</code> có file <code>questions.js</code> và <code>questions.json</code>.</p>
        </div>
      </main>`;
    return;
  }

  const savedTheme = localStorage.getItem(THEME_KEY);
  document.documentElement.dataset.bsTheme = savedTheme === "dark" ? "dark" : "light";

  updateProgressUI();
  selectMode(currentMode());

  $$("#modeControl button").forEach(b => b.addEventListener("click", () => selectMode(b.dataset.mode)));
  $("#startBtn").addEventListener("click", () => startQuiz());
  $("#prevBtn").addEventListener("click", () => { if (state.current > 0) { state.current--; renderQuestion(); }});
  $("#nextBtn").addEventListener("click", () => {
    if (state.current < state.session.length - 1) { state.current++; renderQuestion(); }
    else finishQuiz(false);
  });
  $("#submitBtn").addEventListener("click", () => finishQuiz(false));
  $("#flagBtn").addEventListener("click", () => {
    state.session[state.current].flagged = !state.session[state.current].flagged; renderQuestion();
  });
  $("#exitQuizBtn").addEventListener("click", () => {
    if (confirm("Thoát bài hiện tại? Kết quả chưa nộp sẽ không được tính.")) {
      clearInterval(state.timerId); state.timerId = null; showView("#homeView");
    }
  });

  $("#homeBtn").addEventListener("click", () => showView("#homeView"));
  $("#retryBtn").addEventListener("click", () => startQuiz(state.lastConfig));
  $("#reviewResultBtn").addEventListener("click", renderReview);

  $("#bankBtn").addEventListener("click", () => { showView("#bankView"); renderBank(); });
  $("#closeBankBtn").addEventListener("click", () => showView("#homeView"));
  ["bankSearch","bankLevel","revealAnswers"].forEach(id => $("#"+id).addEventListener("input", renderBank));
  $("#bankLevel").addEventListener("change", renderBank);

  $("#reviewWrongBtn").addEventListener("click", () => {
    const p = loadProgress();
    const wrongIds = new Set(Object.entries(p.attempts || {}).filter(([,v]) => v.lastCorrect === false).map(([id]) => Number(id)));
    const wrong = state.data.filter(q => wrongIds.has(q.id));
    if (!wrong.length) {
      alert("Chưa có câu sai gần nhất để ôn lại.");
      return;
    }
    const config = { mode:"practice", levels:["easy","normal","hard"], count:"all", minutes:30, shuffleQuestions:true, shuffleAnswers:true };
    startQuiz(config, wrong);
  });

  $("#resetProgressBtn").addEventListener("click", () => {
    if (confirm("Xóa toàn bộ tiến độ đã lưu trên trình duyệt này?")) {
      localStorage.removeItem(STORE_KEY); updateProgressUI();
    }
  });

  $("#themeBtn").addEventListener("click", () => {
    const dark = document.documentElement.dataset.bsTheme === "dark";
    document.documentElement.dataset.bsTheme = dark ? "light" : "dark";
    localStorage.setItem(THEME_KEY, dark ? "light" : "dark");
  });

  const confirmSubmitBtn = $("#confirmSubmitBtn");
  if (confirmSubmitBtn) {
    confirmSubmitBtn.addEventListener("click", () => {
      const modalEl = document.getElementById("submitConfirmModal");
      if (modalEl && window.bootstrap) bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      finishQuiz(false, true);
    });
  }
}
init();
