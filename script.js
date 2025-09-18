// ===============================================
// MathGame – v6 (opravené centrování sekcí; animace zachovány)
// ===============================================
document.addEventListener("DOMContentLoaded", () => {
  // --- Supabase (DOPLŇ SVÉ ÚDAJE) ---
  const SUPABASE_URL = "https://ypdotsfelxlkvdlicynd.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZG90c2ZlbHhsa3ZkbGljeW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNjM2NjksImV4cCI6MjA3MzczOTY2OX0.pJg2tCaECGDIvJOrRDSQd714hmmskxxfkZf8YolmGt8";
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // --- Stav hry ---
  const TOTAL_QUESTIONS = 10;
  let playerName = "";
  let currentLevel = 1;
  let questionIndex = 0;
  let score = 0;
  let currentCorrectAnswer = null;
  let isChallengeMode = false;

  // --- DOM prvky ---
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
  const questionCard   = document.getElementById("question-container");

  const startBeginningBtn = document.getElementById("startBeginningBtn");
  const levelSelect       = document.getElementById("levelSelect");
  const startSelectedBtn  = document.getElementById("startSelectedBtn");

  const dailyBtn       = document.getElementById("dailyBtn");
  const showLbBtn      = document.getElementById("showLbBtn");

  const submitBtn      = document.getElementById("submitBtn");
  const nextLevelBtn   = document.getElementById("nextLevelBtn");
  const retryBtn       = document.getElementById("retryBtn");
  const restartBtn     = document.getElementById("restartBtn");
  const summaryLbBtn   = document.getElementById("summaryLbBtn");
  const summaryStartBeginningBtn = document.getElementById("summaryStartBeginningBtn");
  const summaryGoToLevelSelectBtn = document.getElementById("summaryGoToLevelSelectBtn");

  const summaryTitle   = document.getElementById("summaryTitle");
  const summaryText    = document.getElementById("summaryText");

  const leaderboardList= document.getElementById("leaderboardList");
  const lbBackBtn      = document.getElementById("lbBackBtn");

  const menuBtn        = document.getElementById("menuBtn");

  // Streak info
  const streakValueEl  = document.getElementById("streakValue");
  const bestStreakEl   = document.getElementById("bestStreakValue");
  const dailyStatusEl  = document.getElementById("dailyStatus");

  // --- Streak (localStorage) ---
  const LS_STREAK = "mg_streak";
  const LS_BEST   = "mg_bestStreak";
  const LS_LAST   = "mg_lastChallengeCompleted"; // YYYY-MM-DD

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function ydayISO() {
    const d = new Date(); d.setDate(d.getDate()-1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function initStreak() {
    let streak = Number(localStorage.getItem(LS_STREAK) || "0");
    let best   = Number(localStorage.getItem(LS_BEST)   || "0");
    const last = localStorage.getItem(LS_LAST);
    const t = todayISO(), y = ydayISO();

    if (last && last !== t && last !== y) {
      streak = 0;
      localStorage.setItem(LS_STREAK, "0");
    }
    if (streakValueEl) streakValueEl.textContent = String(streak);
    if (bestStreakEl)  bestStreakEl.textContent  = String(best);
    if (dailyStatusEl) dailyStatusEl.textContent = (last === t) ? "splněno ✅" : "neplněno ❌";
    hudStreak.textContent = String(streak);
  }

  function completeDailyChallenge() {
    const t = todayISO();
    const last = localStorage.getItem(LS_LAST);
    let streak = Number(localStorage.getItem(LS_STREAK) || "0");
    let best   = Number(localStorage.getItem(LS_BEST)   || "0");
    if (last === t) { /* nic */ }
    else if (last === ydayISO() || !last) { streak += 1; }
    else { streak = 1; }
    if (streak > best) best = streak;
    localStorage.setItem(LS_LAST, t);
    localStorage.setItem(LS_STREAK, String(streak));
    localStorage.setItem(LS_BEST,   String(best));
    if (streakValueEl) streakValueEl.textContent = String(streak);
    if (bestStreakEl)  bestStreakEl.textContent  = String(best);
    if (dailyStatusEl) dailyStatusEl.textContent = "splněno ✅";
    hudStreak.textContent = String(streak);
  }

  initStreak();

  // --- přepínání obrazovek (pomocí tříd) ---
  const screens = [welcomeScreen, quizScreen, summaryScreen, leaderboardScreen];
  function showSection(which) {
    screens.forEach(s => s.classList.remove("is-active"));
    if (which === "welcome")      welcomeScreen.classList.add("is-active");
    else if (which === "quiz")    quizScreen.classList.add("is-active");
    else if (which === "summary") summaryScreen.classList.add("is-active");
    else if (which === "leaderboard") leaderboardScreen.classList.add("is-active");
    // po přepnutí vyjedeme nahoru (na mobilu zabrání „odskoku“ mimo obraz)
    window.scrollTo({ top: 0, behavior: "instant" });
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
  }

  // --- Generátor otázek ---
  function rand(max){ return Math.floor(Math.random()*(max+1)); }
  function generateQuestionForLevel(level){
    let a,b,op,ans;
    if (level===1){ a=rand(9); b=rand(9); op="+"; ans=a+b; }
    else if (level===2){ a=rand(9); b=rand(9); if(b>a)[a,b]=[b,a]; op="-"; ans=a-b; }
    else if (level===3){ a=rand(20); b=rand(20); op="+"; ans=a+b; }
    else if (level===4){ a=rand(20); b=rand(20); if(b>a)[a,b]=[b,a]; op="-"; ans=a-b; }
    else if (level===5){ a=rand(50); b=rand(10); op="+"; ans=a+b; }
    else if (level===6){ a=rand(50); b=rand(20); if(b>a)[a,b]=[b,a]; op="-"; ans=a-b; }
    else if (level===7){ a=rand(100); b=rand(100); op="+"; ans=a+b; }
    else if (level===8){ a=rand(100); b=rand(100); if(b>a)[a,b]=[b,a]; op="-"; ans=a-b; }
    else { if(Math.random()<0.5){ a=rand(100); b=rand(100); op="+"; ans=a+b; }
           else { a=rand(100); b=rand(100); if(b>a)[a,b]=[b,a]; op="-"; ans=a-b; } }
    return { text:`${a} ${op} ${b} = ?`, answer:ans };
  }
  function generateChallengeQuestion(){ return generateQuestionForLevel(9+(Math.random()<0.5?0:1)); }

  // --- Průběh hry ---
  function startLevel(level){
    isChallengeMode=false; currentLevel=level; questionIndex=0; score=0;
    showSection("quiz"); loadNextQuestion();
  }
  function startFromBeginning(){ startLevel(1); }
  function startSelectedLevel(){
    const val=Number(levelSelect.value);
    if(Number.isNaN(val)||val<1||val>10){ alert("Vyber úroveň 1–10."); levelSelect.focus(); return; }
    startLevel(val);
  }
  function loadNextQuestion(){
    if (!isChallengeMode && questionIndex >= TOTAL_QUESTIONS) { endLevel(); return; }
    const q = isChallengeMode ? generateChallengeQuestion() : generateQuestionForLevel(currentLevel);
    currentCorrectAnswer = q.answer;
    questionText.textContent = q.text;
    answerInput.value = "";
    feedback.textContent = "";
    feedback.className = "chip";
    questionCard.classList.remove("flash-ok","flash-bad");
    updateHud();
  }
  function endLevel(){
    const msg =
      score===TOTAL_QUESTIONS ? "Skvělé! 10/10 🎉" :
      score>=7 ? "Výborná práce!" :
      score>=5 ? "Dobrá práce – zkus ještě vylepšit." :
      "Zkus to znovu a nedej se!";
    summaryTitle.textContent = `Úroveň ${currentLevel} dokončena`;
    summaryText.textContent  = `${msg}  Správně ${score} z ${TOTAL_QUESTIONS}.`;
    showSection("summary");
    nextLevelBtn.style.display = (currentLevel>=10) ? "none" : "inline-block";
    saveHighScore(currentLevel).catch(console.error);
  }

  // Denní výzva
  function startDailyChallenge(){ isChallengeMode=true; showSection("quiz"); questionIndex=0; loadNextQuestion(); }
  function finishDailyChallenge(correct){
    showSection("summary"); nextLevelBtn.style.display="none"; retryBtn.style.display="none";
    if(correct){ summaryTitle.textContent="Denní výzva splněna!"; summaryText.textContent="Skvělé! Streak +1 🔥"; completeDailyChallenge(); }
    else{ summaryTitle.textContent="Denní výzva nesplněna"; summaryText.textContent="Nevadí, zkus to znovu z domovské obrazovky."; }
  }

  // Supabase
  async function saveHighScore(levelReached){
    if(!playerName) return;
    const {data,error} = await supabaseClient.from("scores").select("highscore").eq("name",playerName).maybeSingle();
    if(error && error.code!=="PGRST116"){ console.error(error); return; }
    const oldHigh = data?.highscore ?? 0;
    if(levelReached>oldHigh){
      const {error:upsertErr} = await supabaseClient.from("scores").upsert({name:playerName,highscore:levelReached},{onConflict:"name"});
      if(upsertErr) console.error(upsertErr);
    }
  }
  async function loadLeaderboard(){
    leaderboardList.innerHTML="<li>Načítám…</li>";
    try{
      const {data,error} = await supabaseClient.from("scores").select("name, highscore").order("highscore",{ascending:false}).limit(10);
      if(error) throw error;
      leaderboardList.innerHTML="";
      if(!data || data.length===0){ leaderboardList.innerHTML="<li>Zatím žádné výsledky.</li>"; return; }
      data.forEach((row,idx)=>{
        const li=document.createElement("li");
        li.textContent=`${idx+1}. ${row.name} — úroveň ${row.highscore}`;
        leaderboardList.appendChild(li);
      });
    }catch(e){ console.error(e); leaderboardList.innerHTML="<li>Chyba při načítání žebříčku.</li>"; }
  }

  // --- Handlery ---
  function goToMenu(){ showSection("welcome"); initStreak(); feedback.textContent=""; feedback.className="chip"; questionCard.classList.remove("flash-ok","flash-bad"); answerInput.value=""; isChallengeMode=false; }

  startBeginningBtn.addEventListener("click",()=>{
    const name=(playerNameInput.value||"").trim();
    if(!name){ alert("Prosím, zadej své jméno."); playerNameInput.focus(); return; }
    playerName=name; startFromBeginning();
  });
  startSelectedBtn.addEventListener("click",()=>{
    const name=(playerNameInput.value||"").trim();
    if(!name){ alert("Prosím, zadej své jméno."); playerNameInput.focus(); return; }
    playerName=name; startSelectedLevel();
  });
  dailyBtn.addEventListener("click",()=> startDailyChallenge());
  showLbBtn.addEventListener("click",async()=>{ await loadLeaderboard(); showSection("leaderboard"); });
  summaryLbBtn.addEventListener("click",async()=>{ await loadLeaderboard(); showSection("leaderboard"); });
  lbBackBtn.addEventListener("click",()=> showSection("welcome"));
  menuBtn.addEventListener("click",()=> goToMenu());

  submitBtn.addEventListener("click", handleSubmit);
  answerInput.addEventListener("keydown",(e)=>{ if(e.key==="Enter") handleSubmit(); });

  function handleSubmit(){
    const val=Number(answerInput.value);
    if(Number.isNaN(val)){ feedback.className="chip chip--bad"; feedback.textContent="Zadej číslo."; return; }
    const correct = (val===currentCorrectAnswer);
    if(!isChallengeMode){
      if(correct){ score++; feedback.className="chip chip--ok"; feedback.textContent="Správně!"; questionCard.classList.add("flash-ok"); }
      else { feedback.className="chip chip--bad"; feedback.textContent=`Špatně. Správná je ${currentCorrectAnswer}.`; questionCard.classList.add("flash-bad"); }
      questionCard.addEventListener("animationend",()=>{ questionCard.classList.remove("flash-ok","flash-bad"); },{once:true});
      questionIndex++; updateHud(); setTimeout(loadNextQuestion, 650);
      if(questionIndex> TOTAL_QUESTIONS) endLevel();
    } else {
      if(correct){ feedback.className="chip chip--ok"; feedback.textContent="Správně!"; questionCard.classList.add("flash-ok"); }
      else { feedback.className="chip chip--bad"; feedback.textContent=`Špatně. Správná je ${currentCorrectAnswer}.`; questionCard.classList.add("flash-bad"); }
      questionCard.addEventListener("animationend",()=>{ questionCard.classList.remove("flash-ok","flash-bad"); finishDailyChallenge(correct); },{once:true});
    }
  }

  nextLevelBtn.addEventListener("click",()=> startLevel(currentLevel+1));
  retryBtn.addEventListener("click",()=> startLevel(currentLevel));
  restartBtn.addEventListener("click",()=> goToMenu());
  summaryStartBeginningBtn.addEventListener("click",()=>{
    showSection("welcome");
    const name=(playerNameInput.value||"").trim()||playerName;
    if(!name){ playerName=""; playerNameInput.focus(); }
    else { playerName=name; startFromBeginning(); }
  });
  summaryGoToLevelSelectBtn.addEventListener("click",()=>{ showSection("welcome"); levelSelect.focus(); });

  playerNameInput.focus();
});
