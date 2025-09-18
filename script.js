// ===============================================
// MathGame – logika aplikace
// - 10 úrovní × 10 otázek, rostoucí obtížnost
// - ukládá {name, high_score} do Supabase
// - oddělené od vzhledu (CSS je v externím souboru)
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
  // --- 1) Supabase inicializace (DOPLŇ SVÉ ÚDAJE) ---------------------------
  const SUPABASE_URL = "https://ypdotsfelxlkvdlicynd.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZG90c2ZlbHhsa3ZkbGljeW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNjM2NjksImV4cCI6MjA3MzczOTY2OX0.pJg2tCaECGDIvJOrRDSQd714hmmskxxfkZf8YolmGt8";
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // --- 2) Stav hry ---------------------------------------------------------
  const TOTAL_QUESTIONS = 10;
  let playerName = "";
  let currentLevel = 1;          // 1..10
  let questionIndex = 0;         // 0..9
  let score = 0;                 // počet správných v AKTUÁLNÍ úrovni
  let currentCorrectAnswer = null;

  // --- 3) DOM prvky --------------------------------------------------------
  const welcomeScreen  = document.getElementById("welcome-screen");
  const quizScreen     = document.getElementById("quiz-screen");
  const summaryScreen  = document.getElementById("summary-screen");

  const levelLabel     = document.getElementById("levelLabel");
  const progressLabel  = document.getElementById("progressLabel");
  const scoreLabel     = document.getElementById("scoreLabel");

  const playerNameInput= document.getElementById("playerName");
  const questionText   = document.getElementById("questionText");
  const answerInput    = document.getElementById("answerInput");
  const feedback       = document.getElementById("feedback");

  const startBtn       = document.getElementById("startBtn");
  const submitBtn      = document.getElementById("submitBtn");
  const nextLevelBtn   = document.getElementById("nextLevelBtn");
  const retryBtn       = document.getElementById("retryBtn");
  const restartBtn     = document.getElementById("restartBtn");

  const summaryTitle   = document.getElementById("summaryTitle");
  const summaryText    = document.getElementById("summaryText");

  // --- 4) Pomocné funkce UI ------------------------------------------------
  function showSection(which) {
    welcomeScreen.style.display = which === "welcome" ? "block" : "none";
    quizScreen.style.display    = which === "quiz"    ? "block" : "none";
    summaryScreen.style.display = which === "summary" ? "block" : "none";
  }

  function updateHud() {
    levelLabel.textContent = `Úroveň ${currentLevel}`;
    progressLabel.textContent = `Otázka ${questionIndex + 1}/${TOTAL_QUESTIONS}`;
    scoreLabel.textContent = `Skóre: ${score}`;
  }

  // --- 5) Generátor otázek podle úrovně -----------------------------------
  // Zvyšování obtížnosti:
  // 1: + jednociferná, 2: - jednociferná,
  // 3: + do 20,       4: - do 20,
  // 5: + do 50 bez přechodu, 6: - do 50 bez přechodu,
  // 7: + do 100 (může být přechod), 8: - do 100 (nezáporné),
  // 9: mix +- do 100, 10: těžší mix do 100 (větší šance přechodu)
  function generateQuestion(level) {
    let a, b, op, ans;

    const rand = (max) => Math.floor(Math.random() * (max + 1)); // 0..max

    if (level === 1) {
      a = rand(9); b = rand(9); op = "+"; ans = a + b;
    } else if (level === 2) {
      a = rand(9); b = rand(9); if (b > a) [a, b] = [b, a];
      op = "-"; ans = a - b;
    } else if (level === 3) {
      a = rand(20); b = rand(20); op = "+"; ans = a + b;
    } else if (level === 4) {
      a = rand(20); b = rand(20); if (b > a) [a, b] = [b, a];
      op = "-"; ans = a - b;
    } else if (level === 5) {
      // bez přechodu přes desítku (zjednodušeno – jen menší čísla)
      a = rand(50); b = rand(10); op = "+"; ans = a + b;
    } else if (level === 6) {
      a = rand(50); b = rand(20); if (b > a) [a, b] = [b, a];
      op = "-"; ans = a - b;
    } else if (level === 7) {
      a = rand(100); b = rand(100); op = "+"; ans = a + b;
    } else if (level === 8) {
      a = rand(100); b = rand(100); if (b > a) [a, b] = [b, a];
      op = "-"; ans = a - b;
    } else if (level === 9) {
      if (Math.random() < 0.5) {
        a = rand(100); b = rand(100); op = "+"; ans = a + b;
      } else {
        a = rand(100); b = rand(100); if (b > a) [a, b] = [b, a];
        op = "-"; ans = a - b;
      }
    } else { // level 10
      if (Math.random() < 0.6) {
        a = rand(100); b = rand(100); op = "+"; ans = a + b;
      } else {
        a = rand(100); b = rand(100); if (b > a) [a, b] = [b, a];
        op = "-"; ans = a - b;
      }
    }

    return { text: `${a} ${op} ${b} = ?`, answer: ans };
  }

  // --- 6) Průběh úrovně ----------------------------------------------------
  function startLevel(level) {
    currentLevel = level;
    questionIndex = 0;
    score = 0;
    showSection("quiz");
    loadNextQuestion();
  }

  function loadNextQuestion() {
    if (questionIndex >= TOTAL_QUESTIONS) {
      endLevel();
      return;
    }
    const q = generateQuestion(currentLevel);
    currentCorrectAnswer = q.answer;
    questionText.textContent = q.text;
    answerInput.value = "";
    feedback.textContent = "";
    updateHud();
  }

  function endLevel() {
    // sumarizace
    const msg =
      score === TOTAL_QUESTIONS ? "Skvělé! 10/10 🎉" :
      score >= 7 ? "Výborná práce!" :
      score >= 5 ? "Dobrá práce – zkus ještě vylepšit." :
      "Zkus to znovu a nedej se!";

    summaryTitle.textContent = `Úroveň ${currentLevel} dokončena`;
    summaryText.textContent = `${msg}  Správně ${score} z ${TOTAL_QUESTIONS}.`;
    showSection("summary");

    // tlačítka pro poslední úroveň
    if (currentLevel >= 10) {
      nextLevelBtn.style.display = "none";
      summaryTitle.textContent = "Hotovo!";
    } else {
      nextLevelBtn.style.display = "inline-block";
    }

    // uložení high-scóre (nejvyšší dosažená úroveň) – jen když jsme se posunuli výš
    saveHighScore(currentLevel).catch((e) => console.error(e));
  }

  // --- 7) Supabase: uložení high-score ------------------------------------
  async function saveHighScore(levelReached) {
    if (!playerName) return;

    // zkusit načíst existující záznam
    const { data, error } = await supabaseClient
      .from("scores")
      .select("highscore")
      .eq("name", playerName)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Chyba při čtení skóre:", error);
      return;
    }

    const oldHigh = data?.highscore ?? 0;
    if (levelReached > oldHigh) {
      const { error: upsertErr } = await supabaseClient
        .from("scores")
        .upsert({ name: playerName, highscore: levelReached }, { onConflict: "name" });

      if (upsertErr) console.error("Chyba při ukládání skóre:", upsertErr);
    }
  }

  // --- 8) Handlery událostí ------------------------------------------------
  startBtn.addEventListener("click", () => {
    const name = (playerNameInput.value || "").trim();
    if (!name) {
      alert("Prosím, zadej své jméno.");
      playerNameInput.focus();
      return;
    }
    playerName = name;
    startLevel(1);
  });

  submitBtn.addEventListener("click", handleSubmit);
  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSubmit();
  });

  function handleSubmit() {
    if (currentCorrectAnswer === null) return;

    const val = Number(answerInput.value);
    if (Number.isNaN(val)) {
      feedback.style.color = "red";
      feedback.textContent = "Zadej číslo.";
      return;
    }

    if (val === currentCorrectAnswer) {
      score++;
      feedback.style.color = "green";
      feedback.textContent = "Správně!";
    } else {
      feedback.style.color = "red";
      feedback.textContent = `Špatně. Správná odpověď je ${currentCorrectAnswer}.`;
    }

    questionIndex++;
    updateHud();
    // krátká pauza, a další otázka
    setTimeout(loadNextQuestion, 700);
  }

  nextLevelBtn.addEventListener("click", () => {
    startLevel(currentLevel + 1);
  });

  retryBtn.addEventListener("click", () => {
    startLevel(currentLevel);
  });

  restartBtn.addEventListener("click", () => {
    showSection("welcome");
    playerNameInput.focus();
  });

  // Startovací fokus
  playerNameInput.focus();
});
