// ===============================================
// MathGame – logika aplikace (v2: Leaderboard + Denní výzva se streakem)
// - 10 úrovní × 10 otázek, rostoucí obtížnost
// - ukládá {name, highscore} do Supabase (tabulka "scores": name TEXT UNIQUE, highscore INT)
// - leaderboard z DB (TOP 10 podle highscore)
// - denní výzva (1 otázka denně) + streak (localStorage)
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
  let questionIndex = 0;         // 0..9 (index v rámci levelu)
  let score = 0;                 // správné odpovědi v AKTUÁLNÍ úrovni
  let currentCorrectAnswer = null;

  // Režimy: klasická hra vs denní výzva
  let isChallengeMode = false;   // true = Denní výzva (1 otázka)

  // --- 3) DOM prvky --------------------------------------------------------
  const welcomeScreen  = document.getElementById("welcome-screen");
  const quizScreen     = document.getElementById("quiz-screen");
  const summaryScreen  = document.getElementById("summary-screen");
  const leaderboardScreen = document.getElementById("leaderboard-screen");

  const levelLabel     = document.getElementById("levelLabel");
  const progressLabel  = document.getElementById("progressLabel");
  const scoreLabel     = document.getElementById("scoreLabel");
  const hudStreak      = document.getElementById("hudStreak");

  const playerNameInput= document.getElementById("playerName");
  const questionText   = document.getElementById("questionText");
  const answerInput    = document.getElementById("answerInput");
  const feedback       = document.getElementById("feedback");

  const startBtn       = document.getElementById("startBtn");
  const dailyBtn       = document.getElementById("dailyBtn");
  const showLbBtn      = document.getElementById("showLbBtn");

  const submitBtn      = document.getElementById("submitBtn");
  const nextLevelBtn   = document.getElementById("nextLevelBtn");
  const retryBtn       = document.getElementById("retryBtn");
  const restartBtn     = document.getElementById("restartBtn");
  const summaryLbBtn   = document.getElementById("summaryLbBtn");

  const summaryTitle   = document.getElementById("summaryTitle");
  const summaryText    = document.getElementById("summaryText");

  const leaderboardList= document.getElementById("leaderboardList");
  const lbBackBtn      = document.getElementById("lbBackBtn");

  // Streak info na uvodní obrazovce
  const streakValueEl  = document.getElementById("streakValue");
  const bestStreakEl   = document.getElementById("bestStreakValue");
  const dailyStatusEl  = document.getElementById("dailyStatus");

  // --- 4) Streak (localStorage) -------------------------------------------
  // Klíče v localStorage
  const LS_STREAK = "mg_streak";
  const LS_BEST   = "mg_bestStreak";
  const LS_LAST   = "mg_lastChallengeCompleted"; // YYYY-MM-DD

  function todayISO() {
    const d = new Date();
    // bereme místní datum bez času
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  function ydayISO() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Inicializace streaku při startu aplikace
  function initStreak() {
    let streak = Number(localStorage.getItem(LS_STREAK) || "0");
    let best   = Number(localStorage.getItem(LS_BEST)   || "0");
    const last = localStorage.getItem(LS_LAST); // může být null

    const t = todayISO();
    const y = ydayISO();

    // Pokud poslední splněný den není dnes ani včera, streak reset
    if (last && last !== t && last !== y) {
      streak = 0;
      localStorage.setItem(LS_STREAK, "0");
    }

    // UI
    streakValueEl.textContent = String(streak);
    bestStreakEl.textContent  = String(best);
    dailyStatusEl.textContent = (last === t) ? "splněno ✅" : "neplněno ❌";
    hudStreak.textContent     = String(streak);
  }

  function completeDailyChallenge() {
    const t = todayISO();
    const last = localStorage.getItem(LS_LAST);
    let streak = Number(localStorage.getItem(LS_STREAK) || "0");
    let best   = Number(localStorage.getItem(LS_BEST)   || "0");

    if (last === t) {
      // už splněno dnes — nic nezvyšujeme
    } else if (last === ydayISO() || !last) {
      // navazujeme na včerejšek (nebo první den)
      streak = streak + 1;
    } else {
      // byl výpadek => začínáme znovu od 1
      streak = 1;
    }

    if (streak > best) best = streak;

    localStorage.setItem(LS_LAST, t);
    localStorage.setItem(LS_STREAK, String(streak));
    localStorage.setItem(LS_BEST,   String(best));

    // UI refresh
    streakValueEl.textContent = String(streak);
    bestStreakEl.textContent  = String(best);
    dailyStatusEl.textContent = "splněno ✅";
    hudStreak.textContent     = String(streak);
  }

  initStreak();

  // --- 5) Pomocné funkce UI ------------------------------------------------
  function showSection(which) {
    welcomeScreen.style.display     = (which === "welcome")    ? "block" : "none";
    quizScreen.style.display        = (which === "quiz")       ? "block" : "none";
    summaryScreen.style.display     = (which === "summary")    ? "block" : "none";
    leaderboardScreen.style.display = (which === "leaderboard")? "block" : "none";
  }

  function updateHud() {
    if (!isChallengeMode) {
      levelLabel.textContent = `Úroveň ${currentLevel}`;
      progressLabel.textContent = `Otázka ${questionIndex + 1}/${TOTAL_QUESTIONS}`;
      scoreLabel.textContent = `Skóre: ${score}`;
    } else {
      levelLabel.textContent = `Denní výzva`;
      progressLabel.textContent = `Otázka 1/1`;
      scoreLabel.textContent = `—`;
    }
    // streak v HUDu je aktualizován v initStreak/completeDailyChallenge
  }

  // --- 6) Generátor otázek podle úrovně -----------------------------------
  function rand(max) { return Math.floor(Math.random() * (max + 1)); } // 0..max

  function generateQuestionForLevel(level) {
    let a, b, op, ans;
    if (level === 1) {
      a = rand(9); b = rand(9); op = "+"; ans = a + b;
    } else if (level === 2) {
      a = rand(9); b = rand(9); if (b > a) [a, b] = [b, a]; op = "-"; ans = a - b;
    } else if (level === 3) {
      a = rand(20); b = rand(20); op = "+"; ans = a + b;
    } else if (level === 4) {
      a = rand(20); b = rand(20); if (b > a) [a, b] = [b, a]; op = "-"; ans = a - b;
    } else if (level === 5) {
      a = rand(50); b = rand(10); op = "+"; ans = a + b;
    } else if (level === 6) {
      a = rand(50); b = rand(20); if (b > a) [a, b] = [b, a]; op = "-"; ans = a - b;
    } else if (level === 7) {
      a = rand(100); b = rand(100); op = "+"; ans = a + b;
    } else if (level === 8) {
      a = rand(100); b = rand(100); if (b > a) [a, b] = [b, a]; op = "-"; ans = a - b;
    } else {
      // 9–10: mix +/-
      if (Math.random() < 0.5) {
        a = rand(100); b = rand(100); op = "+"; ans = a + b;
      } else {
        a = rand(100); b = rand(100); if (b > a) [a, b] = [b, a]; op = "-"; ans = a - b;
      }
    }
    return { text: `${a} ${op} ${b} = ?`, answer: ans };
  }

  function generateChallengeQuestion() {
    // Denní výzva – 1 otázka, mírně náročnější mix (do 100)
    return generateQuestionForLevel(9 + (Math.random() < 0.5 ? 0 : 1));
  }

  // --- 7) Průběh: klasická hra --------------------------------------------
  function startLevel(level) {
    isChallengeMode = false;
    currentLevel = level;
    questionIndex = 0;
    score = 0;
    showSection("quiz");
    loadNextQuestion();
  }

  function loadNextQuestion() {
    if (!isChallengeMode) {
      if (questionIndex >= TOTAL_QUESTIONS) {
        endLevel();
        return;
      }
      const q = generateQuestionForLevel(currentLevel);
      currentCorrectAnswer = q.answer;
      questionText.textContent = q.text;
      answerInput.value = "";
      feedback.textContent = "";
      updateHud();
    } else {
      // Challenge režim – vždy jen 1 otázka
      const q = generateChallengeQuestion();
      currentCorrectAnswer = q.answer;
      questionText.textContent = q.text;
      answerInput.value = "";
      feedback.textContent = "";
      updateHud();
    }
  }

  function endLevel() {
    const msg =
      score === TOTAL_QUESTIONS ? "Skvělé! 10/10 🎉" :
      score >= 7 ? "Výborná práce!" :
      score >= 5 ? "Dobrá práce – zkus ještě vylepšit." :
      "Zkus to znovu a nedej se!";

    summaryTitle.textContent = `Úroveň ${currentLevel} dokončena`;
    summaryText.textContent = `${msg}  Správně ${score} z ${TOTAL_QUESTIONS}.`;
    showSection("summary");

    // Poslední úroveň
    nextLevelBtn.style.display = (currentLevel >= 10) ? "none" : "inline-block";

    // uložení high-score (nejvyšší dosažená úroveň)
    saveHighScore(currentLevel).catch((e) => console.error(e));
  }

  // --- 8) Denní výzva ------------------------------------------------------
  function startDailyChallenge() {
    isChallengeMode = true;
    showSection("quiz");
    questionIndex = 0; // zde nehraje roli, ale pro konzistenci
    loadNextQuestion();
  }

  function finishDailyChallenge(correct) {
    showSection("summary");
    nextLevelBtn.style.display = "none"; // challenge nemá „další úroveň“
    retryBtn.style.display = "none";     // ani opakování v rámci summary

    if (correct) {
      summaryTitle.textContent = "Denní výzva splněna!";
      summaryText.textContent  = "Skvělé! Streak +1 🔥";
      completeDailyChallenge();
    } else {
      summaryTitle.textContent = "Denní výzva nesplněna";
      summaryText.textContent  = "Nevadí, zkus to znovu z domovské obrazovky.";
      // Streak se nezvyšuje; reset se řeší při dalším dni v initStreak()
    }
  }

  // --- 9) Supabase: uložení high-score ------------------------------------
  async function saveHighScore(levelReached) {
    if (!playerName) return;

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

  // --- 10) Supabase: načtení leaderboardu ---------------------------------
  async function loadLeaderboard() {
    leaderboardList.innerHTML = "<li>Načítám…</li>";
    try {
      const { data, error } = await supabaseClient
        .from("scores")
        .select("name, highscore")
        .order("highscore", { ascending: false })
        .limit(10);

      if (error) throw error;

      leaderboardList.innerHTML = "";
      if (!data || data.length === 0) {
        leaderboardList.innerHTML = "<li>Zatím žádné výsledky.</li>";
        return;
      }
      data.forEach((row, idx) => {
        const li = document.createElement("li");
        li.textContent = `${idx + 1}. ${row.name} — úroveň ${row.highscore}`;
        leaderboardList.appendChild(li);
      });
    } catch (e) {
      console.error(e);
      leaderboardList.innerHTML = "<li>Chyba při načítání žebříčku.</li>";
    }
  }

  // --- 11) Handlery událostí ----------------------------------------------
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

  dailyBtn.addEventListener("click", () => {
    // Denní výzva jde spustit i bez jména (neukládá se do DB)
    startDailyChallenge();
  });

  showLbBtn.addEventListener("click", async () => {
    await loadLeaderboard();
    showSection("leaderboard");
  });

  summaryLbBtn.addEventListener("click", async () => {
    await loadLeaderboard();
    showSection("leaderboard");
  });

  lbBackBtn.addEventListener("click", () => {
    showSection("welcome");
  });

  submitBtn.addEventListener("click", handleSubmit);
  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSubmit();
  });

  function handleSubmit() {
    const val = Number(answerInput.value);
    if (Number.isNaN(val)) {
      feedback.style.color = "red";
      feedback.textContent = "Zadej číslo.";
      return;
    }

    const correct = (val === currentCorrectAnswer);

    if (!isChallengeMode) {
      if (correct) {
        score++;
        feedback.style.color = "green";
        feedback.textContent = "Správně!";
      } else {
        feedback.style.color = "red";
        feedback.textContent = `Špatně. Správná odpověď je ${currentCorrectAnswer}.`;
      }
      questionIndex++;
      updateHud();
      setTimeout(loadNextQuestion, 700);
    } else {
      // Denní výzva: vyhodnotíme a rovnou ukončíme režim
      if (correct) {
        feedback.style.color = "green";
        feedback.textContent = "Správně!";
      } else {
        feedback.style.color = "red";
        feedback.textContent = `Špatně. Správná odpověď je ${currentCorrectAnswer}.`;
      }
      setTimeout(() => finishDailyChallenge(correct), 700);
    }
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
    // Po návratu na úvod obnovíme info o streaku
    initStreak();
  });

  // Start: fokus do jména
  playerNameInput.focus();
});
