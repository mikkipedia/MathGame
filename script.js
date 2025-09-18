// Supabase - inicializace klienta (DOPLŇTE své údaje projektu)
const SUPABASE_URL = "https://ypdotsfelxlkvdlicynd.supabase.co";  // sem vložte URL svého projektu
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZG90c2ZlbHhsa3ZkbGljeW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNjM2NjksImV4cCI6MjA3MzczOTY2OX0.pJg2tCaECGDIvJOrRDSQd714hmmskxxfkZf8YolmGt8";        // sem vložte svůj anon veřejný klíč
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Hra – proměnné stavu
let playerName = "";
let level = 1;
let questionNumber = 0;
let score = 0;
let correctAnswer = null;

// HTML elementy
const startScreen = document.getElementById("start-screen");
const questionScreen = document.getElementById("question-screen");
const resultScreen = document.getElementById("result-screen");
const levelTitle = document.getElementById("levelTitle");
const questionText = document.getElementById("questionText");
const answerInput = document.getElementById("answerInput");
const feedback = document.getElementById("feedback");
const finalScoreText = document.getElementById("finalScoreText");
const startBtn = document.getElementById("startBtn");
const submitAnswerBtn = document.getElementById("submitAnswerBtn");
const restartBtn = document.getElementById("restartBtn");

// Začátek hry – klik na "Začít hru"
startBtn.addEventListener("click", () => {
  const nameInput = document.getElementById("playerName");
  if (!nameInput.value) {
    alert("Prosím zadej své jméno."); 
    return;
  }
  playerName = nameInput.value;
  // Přechod do hry
  startScreen.style.display = "none";
  questionScreen.style.display = "block";
  level = 1;
  questionNumber = 0;
  score = 0;
  levelTitle.textContent = "Úroveň " + level;
  generateQuestion();
});

// Generování náhodné otázky pro aktuální úroveň
function generateQuestion() {
  questionNumber++;
  // Náhodná jednoduchá aritmetika: sčítání nebo odčítání do 20
  let a = Math.floor(Math.random() * 21);  // číslo 0-20
  let b = Math.floor(Math.random() * 21);
  let operator;
  if (Math.random() < 0.5) {
    operator = "+"; 
    correctAnswer = a + b;
  } else {
    operator = "-";
    // Abychom nedostali záporný výsledek, prohodíme čísla pokud a < b
    if (a < b) [a, b] = [b, a];
    correctAnswer = a - b;
  }
  questionText.textContent = `Kolik je ${a} ${operator} ${b}?`;
  answerInput.value = "";
  answerInput.focus();
  feedback.textContent = "";
}

// Odeslání odpovědi
submitAnswerBtn.addEventListener("click", () => {
  if (correctAnswer === null) return;
  const answer = Number(answerInput.value);
  if (answer === correctAnswer) {
    score++;
    feedback.style.color = "green";
    feedback.textContent = "Správně!";
  } else {
    feedback.style.color = "red";
    feedback.textContent = `Špatně. Správná odpověď byla ${correctAnswer}.`;
  }
  // Po malé pauze přejdeme k další otázce nebo úrovni
  setTimeout(nextStep, 800);
});

// Tlačítko "Hrát znovu" – restartuje hru (načtením stránky)
restartBtn.addEventListener("click", () => {
  window.location.reload();
});

// Funkce pro přechod na další otázku / úroveň / konec hry
function nextStep() {
  // Ještě nejsme na konci úrovně?
  if (questionNumber < 10) {
    generateQuestion();
    return;
  }
  // Úroveň dokončena - buď jdeme na další, nebo konec
  if (level < 10) {
    level++;
    questionNumber = 0;
    levelTitle.textContent = "Úroveň " + level;
    generateQuestion();
  } else {
    // 10. úroveň dokončena -> konec hry
    questionScreen.style.display = "none";
    resultScreen.style.display = "block";
    finalScoreText.textContent = `Skóre: ${score} z 100 možných bodů.`;
    saveHighScore();
  }
}

// Uložení skóre do databáze (Supabase)
async function saveHighScore() {
  if (!playerName) return;
  // Zjistit dosavadní nejvyšší skóre hráče (pokud existuje)
  const { data, error } = await supabase
    .from("scores")
    .select("highscore")
    .eq("name", playerName)
    .single();
  let oldHigh = data ? data.highscore : null;
  if (error && error.code !== "PGRST116") {
    console.error("Chyba při čtení skóre:", error);
    return;
  }
  if (oldHigh === null || score > oldHigh) {
    // Uložit nové skóre (vložit nebo aktualizovat)
    const { error: upsertError } = await supabase
      .from("scores")
      .upsert({ name: playerName, highscore: score }, { onConflict: "name" });
    if (upsertError) {
      console.error("Chyba při ukládání skóre:", upsertError);
    } else {
      console.log("Skóre uloženo.");
    }
  } else {
    console.log("Skóre nebylo vyšší než dosavadní rekord, neukládá se.");
  }
}
