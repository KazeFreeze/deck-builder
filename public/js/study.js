document.addEventListener("DOMContentLoaded", () => {
  // --- STATE MANAGEMENT ---
  let allItems = []; // Combined list of questions and flashcards
  let originalItems = []; // For unshuffling
  let userAnswers = []; // To store user's answers for MCQs
  let currentItemIndex = 0;
  let quizCompleted = false;

  // Timer state
  let startTime;
  let timerInterval;
  let elapsedSeconds = 0;

  // URL Configs
  let timerEnabled = true;
  let shuffleEnabled = true;
  let showExplanationImmediately = false;

  // --- DOM ELEMENTS ---
  const quizTitleEl = document.getElementById("quiz-title");
  const timerEl = document.getElementById("timer").querySelector("span");
  const progressEl = document.getElementById("progress").querySelector("span");
  const scoreEl = document.getElementById("score").querySelector("span");
  const indicatorsContainerEl = document.getElementById(
    "question-indicators-container"
  );
  const studyItemContainerEl = document.getElementById("study-item-container");
  const nextBtn = document.getElementById("next");
  const backBtn = document.getElementById("back");
  const backToMenuBtn = document.getElementById("backToMenu");
  const containerEl = document.querySelector(".container");

  // --- INITIALIZATION ---
  function initializeStudySession() {
    const urlParams = new URLSearchParams(window.location.search);
    const decksParam = urlParams.get("decks");

    // Set configs from URL
    shuffleEnabled = urlParams.get("shuffle") === "true";
    timerEnabled = urlParams.get("timer") === "true";
    showExplanationImmediately = urlParams.get("showExplanation") === "true";

    if (!timerEnabled) {
      document.getElementById("timer").style.display = "none";
    }

    if (!decksParam) {
      quizTitleEl.textContent = "Error: No decks selected.";
      return;
    }

    const deckPaths = decksParam.split(",");
    loadAllDecks(deckPaths);

    // Add event listeners
    nextBtn.addEventListener("click", nextItem);
    backBtn.addEventListener("click", previousItem);
    backToMenuBtn.addEventListener(
      "click",
      () => (window.location.href = "index.html")
    );
  }

  async function loadAllDecks(paths) {
    quizTitleEl.textContent = "Loading decks...";
    try {
      const fetchPromises = paths.map((path) =>
        fetch(path.split("/")[1] + "/" + path.split("/")[2]).then((res) =>
          res.json().then((data) => ({ data, type: path.split("/")[0] }))
        )
      );
      const results = await Promise.all(fetchPromises);

      let combinedItems = [];
      results.forEach((result) => {
        const { data, type } = result;
        let itemsToAdd = [];
        if (type === "multiplechoice" && data.questions) {
          itemsToAdd = data.questions.map((q) => ({
            ...q,
            type: "multiplechoice",
          }));
        } else if (type === "flashcards") {
          // Assuming flashcard JSON is an array of {q, a}
          itemsToAdd = data.map((fc) => ({
            question: fc.q,
            answer: fc.a,
            type: "flashcard",
          }));
        }
        combinedItems = combinedItems.concat(itemsToAdd);
      });

      originalItems = [...combinedItems];
      allItems = shuffleEnabled
        ? shuffleArray([...combinedItems])
        : [...combinedItems];

      userAnswers = new Array(allItems.length).fill(null);

      startSession();
    } catch (error) {
      console.error("Failed to load one or more decks:", error);
      quizTitleEl.textContent =
        "Error loading decks. Please go back and try again.";
    }
  }

  function startSession() {
    quizTitleEl.textContent = "Study Session";
    currentItemIndex = 0;
    quizCompleted = false;
    createItemIndicators();
    displayCurrentItem();
    if (timerEnabled) startTimer();
  }

  // --- RENDERING LOGIC ---
  function displayCurrentItem() {
    if (currentItemIndex >= allItems.length) {
      if (!quizCompleted) showResults();
      return;
    }

    const item = allItems[currentItemIndex];
    studyItemContainerEl.innerHTML = ""; // Clear previous item
    studyItemContainerEl.className = `study-item-container ${item.type}`;

    if (item.type === "multiplechoice") {
      renderMultipleChoice(item);
    } else if (item.type === "flashcard") {
      renderFlashcard(item);
    }

    updateStatus();
    updateNavigation();
  }

  function renderMultipleChoice(item) {
    let choicesHtml = "";
    for (const [key, value] of Object.entries(item.choices)) {
      choicesHtml += `<div class="choice" data-answer="${key}"><strong>${key}:</strong> ${value}</div>`;
    }

    studyItemContainerEl.innerHTML = `
            <div id="question">${item.question}</div>
            <div id="choices">${choicesHtml}</div>
            <div id="explanation" class="explanation"></div>
        `;

    const userAnswer = userAnswers[currentItemIndex];
    if (userAnswer) {
      // If already answered, show results for this question
      highlightChoices(userAnswer.selected, item.correctAnswer);
      showExplanation(item.correctAnswer, item.explanation);
    } else {
      // Add click handlers for choices
      studyItemContainerEl.querySelectorAll(".choice").forEach((choice) => {
        choice.addEventListener("click", handleAnswer);
      });
      if (showExplanationImmediately) {
        handleAnswer({ currentTarget: { dataset: { answer: null } } }); // Trigger answer with null to just reveal
      }
    }
  }

  function renderFlashcard(item) {
    studyItemContainerEl.innerHTML = `
            <div class="flashcard" tabindex="0">
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <p>${item.question}</p>
                    </div>
                    <div class="flashcard-back">
                        <p>${item.answer}</p>
                    </div>
                </div>
            </div>
        `;

    const flashcard = studyItemContainerEl.querySelector(".flashcard");
    flashcard.addEventListener("click", () => {
      flashcard.classList.toggle("is-flipped");
    });
    flashcard.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        flashcard.classList.toggle("is-flipped");
      }
    });
  }

  // --- UI/UX HELPERS ---

  function createItemIndicators() {
    indicatorsContainerEl.innerHTML = '<div class="question-indicators"></div>';
    const container = indicatorsContainerEl.querySelector(
      ".question-indicators"
    );

    allItems.forEach((item, index) => {
      const indicator = document.createElement("div");
      indicator.className = "question-indicator";
      indicator.textContent = index + 1;
      indicator.dataset.index = index;

      // Add icon based on type
      const iconClass = item.type === "flashcard" ? "fa-clone" : "fa-list-ul";
      indicator.innerHTML = `<span>${
        index + 1
      }</span> <i class="fas ${iconClass} type-icon"></i>`;

      indicator.addEventListener("click", () => {
        currentItemIndex = index;
        displayCurrentItem();
      });
      container.appendChild(indicator);
    });
  }

  function updateItemIndicators() {
    const indicators = indicatorsContainerEl.querySelectorAll(
      ".question-indicator"
    );
    indicators.forEach((indicator, index) => {
      indicator.classList.remove("current", "answered", "correct", "incorrect");
      if (index === currentItemIndex) indicator.classList.add("current");

      const answer = userAnswers[index];
      if (answer) {
        indicator.classList.add("answered");
        if (answer.correct) indicator.classList.add("correct");
        else indicator.classList.add("incorrect");
      }
    });
  }

  function updateStatus() {
    progressEl.textContent = `${currentItemIndex + 1} / ${allItems.length}`;
    const mcqItems = allItems.filter((i) => i.type === "multiplechoice");
    const answeredMcq = userAnswers.filter((a) => a !== null);
    const score = answeredMcq.reduce(
      (acc, ans) => acc + (ans.correct ? 1 : 0),
      0
    );
    scoreEl.textContent = `${score} / ${answeredMcq.length}`;

    updateItemIndicators();
  }

  function updateNavigation() {
    backBtn.style.display = currentItemIndex > 0 ? "block" : "none";
    nextBtn.textContent =
      currentItemIndex === allItems.length - 1 ? "Finish" : "Next";
  }

  // --- EVENT HANDLERS & LOGIC ---

  function handleAnswer(e) {
    const item = allItems[currentItemIndex];
    if (item.type !== "multiplechoice" || userAnswers[currentItemIndex]) return;

    const selectedAnswer = e.currentTarget.dataset.answer;
    const isCorrect = selectedAnswer === item.correctAnswer;

    userAnswers[currentItemIndex] = {
      selected: selectedAnswer,
      correct: isCorrect,
    };

    highlightChoices(selectedAnswer, item.correctAnswer);
    showExplanation(item.correctAnswer, item.explanation);
    updateStatus();
  }

  function highlightChoices(selected, correct) {
    studyItemContainerEl.querySelectorAll(".choice").forEach((choice) => {
      const answerKey = choice.dataset.answer;
      choice.style.cursor = "not-allowed";

      if (answerKey === correct) {
        choice.classList.add("correct");
      } else if (answerKey === selected) {
        choice.classList.add("incorrect");
      }
      // Prevent further clicks
      choice.removeEventListener("click", handleAnswer);
    });
  }

  function showExplanation(correctAnswer, explanationText) {
    const explanationEl = studyItemContainerEl.querySelector("#explanation");
    if (explanationEl) {
      explanationEl.innerHTML = `<strong>Correct Answer: ${correctAnswer}</strong><br>${
        explanationText || "No explanation provided."
      }`;
      explanationEl.classList.add("show");
    }
  }

  function nextItem() {
    if (currentItemIndex < allItems.length) {
      currentItemIndex++;
    }
    displayCurrentItem();
  }

  function previousItem() {
    if (currentItemIndex > 0) {
      currentItemIndex--;
      displayCurrentItem();
    }
  }

  function showResults() {
    quizCompleted = true;
    if (timerEnabled) stopTimer();

    const mcqTotal = allItems.filter((i) => i.type === "multiplechoice").length;
    const answeredMcq = userAnswers.filter((a) => a !== null);
    const finalScore = answeredMcq.reduce(
      (acc, ans) => acc + (ans.correct ? 1 : 0),
      0
    );
    const percentage =
      mcqTotal > 0 ? Math.round((finalScore / mcqTotal) * 100) : 0;

    // Hide main study area
    document.getElementById("study-item-container").style.display = "none";
    document.querySelector(".nav-buttons").style.display = "none";

    const resultsContainer = document.createElement("div");
    resultsContainer.className = "results-container";
    resultsContainer.innerHTML = `
            <div class="results-header"><h2>Session Complete!</h2></div>
            <div class="results-score">Score: <span>${finalScore} / ${mcqTotal} (${percentage}%)</span></div>
            <div class="results-time">Completion time: ${formatTime(
              elapsedSeconds
            )}</div>
            <div class="result-actions">
                <button id="retry-quiz" class="btn-primary"><i class="fas fa-redo"></i> Try Again</button>
                <button id="return-menu" class="btn-secondary"><i class="fas fa-home"></i> Return to Menu</button>
            </div>
        `;

    containerEl.appendChild(resultsContainer);

    document
      .getElementById("retry-quiz")
      .addEventListener("click", () => location.reload());
    document
      .getElementById("return-menu")
      .addEventListener("click", () => (window.location.href = "index.html"));
  }

  // --- UTILITY FUNCTIONS ---
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
      elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      timerEl.textContent = formatTime(elapsedSeconds);
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  // --- KICK-OFF ---
  initializeStudySession();
});
