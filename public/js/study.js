document.addEventListener("DOMContentLoaded", () => {
  // --- STATE MANAGEMENT ---
  let allItems = [];
  let originalItems = [];
  let userAnswers = [];
  let currentItemIndex = 0;
  let quizCompleted = false;
  let deckTitles = [];

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
  const themeToggle = document.getElementById("theme-toggle");

  // --- ANALYTICS FUNCTION ---
  /**
   * Sends an event to the logging endpoint.
   * @param {string} eventType - The type of event (e.g., 'Page View').
   * @param {object} [eventData] - Optional data associated with the event.
   */
  async function logEvent(eventType, eventData) {
    try {
      await fetch("/api/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventType, eventData }),
      });
    } catch (error) {
      console.error("Failed to log event:", error);
    }
  }

  // --- HELPER FUNCTION ---
  /**
   * Replaces markdown-style bolding (**) with HTML <strong> tags.
   * @param {string} text The text to format.
   * @returns {string} The formatted text.
   */
  function formatBold(text) {
    if (typeof text !== "string") {
      return text;
    }
    return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  }

  // --- THEME SWITCHER LOGIC ---
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("studyAppTheme", theme);
    if (themeToggle) {
      themeToggle.checked = theme === "dark";
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener("change", () => {
      applyTheme(themeToggle.checked ? "dark" : "light");
    });
  }

  // --- INITIALIZATION ---
  function initializeStudySession() {
    // Apply theme first to avoid flash of unstyled content
    const savedTheme = localStorage.getItem("studyAppTheme") || "light";
    applyTheme(savedTheme);

    const urlParams = new URLSearchParams(window.location.search);
    const decksParam = urlParams.get("decks");

    // *** FIX START ***
    // Use the "deckTitles" parameter and parse it as JSON for a more robust solution.
    const deckTitlesParam = urlParams.get("deckTitles");
    try {
      deckTitles = deckTitlesParam
        ? JSON.parse(decodeURIComponent(deckTitlesParam))
        : [];
      if (!Array.isArray(deckTitles)) {
        // Fallback to ensure deckTitles is always an array.
        deckTitles = [];
      }
    } catch (e) {
      console.error("Could not parse deck titles from URL parameter.", e);
      deckTitles = [];
    }
    // *** FIX END ***

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

    nextBtn.addEventListener("click", nextItem);
    backBtn.addEventListener("click", previousItem);
    backToMenuBtn.addEventListener(
      "click",
      () => (window.location.href = "index.html")
    );
  }

  // --- DECK LOADING ---
  async function loadAllDecks(paths) {
    quizTitleEl.textContent = "Loading decks...";
    try {
      const fetchPromises = paths.map((path) => {
        const type = path.split("/")[1]; // Bug fix: The type is the second part of the path
        return fetch(path).then((res) => {
          if (!res.ok)
            throw new Error(`Failed to load ${path}: ${res.statusText}`);
          return res.json().then((data) => ({ data, type }));
        });
      });

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
        } else if (type === "flashcards" && Array.isArray(data)) {
          itemsToAdd = data.map((fc) => ({
            question: fc.q,
            answer: fc.a,
            type: "flashcard",
          }));
        }
        combinedItems = combinedItems.concat(itemsToAdd);
      });

      if (combinedItems.length === 0) {
        throw new Error("No valid items found in the selected decks.");
      }

      originalItems = [...combinedItems];
      allItems = shuffleEnabled
        ? shuffleArray([...combinedItems])
        : [...combinedItems];
      userAnswers = new Array(allItems.length).fill(null);

      startSession();
    } catch (error) {
      console.error("Failed to load or process decks:", error);
      quizTitleEl.textContent = "Error: Could not load decks.";
      studyItemContainerEl.innerHTML = `<div class="error">${error.message}<br>Please go back and try again.</div>`;
      document.querySelector(".nav-buttons").style.display = "none";
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
  function displayCurrentItem(direction = 'initial') {
    if (currentItemIndex >= allItems.length) {
      if (!quizCompleted) showResults();
      return;
    }
    const item = allItems[currentItemIndex];

    const renderContent = () => {
      studyItemContainerEl.innerHTML = "";
      studyItemContainerEl.className = `study-item-container ${item.type}`;
      if (item.type === "multiplechoice") {
        renderMultipleChoice(item);
      } else if (item.type === "flashcard") {
        renderFlashcard(item);
      }
      updateStatus();
      updateNavigation();
    };

    if (direction === 'initial') {
      renderContent();
      anime({
        targets: studyItemContainerEl,
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutQuad'
      });
      return;
    }

    const outX = direction === 'next' ? -30 : 30;
    const inX = direction === 'next' ? 30 : -30;

    anime({
      targets: studyItemContainerEl,
      opacity: 0,
      translateX: outX,
      duration: 150,
      easing: 'easeInQuad',
      complete: () => {
        renderContent();
        anime({
          targets: studyItemContainerEl,
          opacity: [0, 1],
          translateX: [inX, 0],
          duration: 200,
          easing: 'easeOutQuad'
        });
      }
    });
  }

  function renderMultipleChoice(item) {
    let choicesHtml = "";
    for (const [key, value] of Object.entries(item.choices)) {
      choicesHtml += `<div class="choice" data-answer="${key}"><strong>${key}:</strong> ${formatBold(
        value
      )}</div>`;
    }
    studyItemContainerEl.innerHTML = `
            <div id="question">${formatBold(
              item.question
            )}</div><div id="choices">${choicesHtml}</div><div id="explanation" class="explanation"></div>`;

    const userAnswer = userAnswers[currentItemIndex];
    if (userAnswer) {
      highlightChoices(userAnswer.selected, item.correctAnswer);
      showExplanation(item.correctAnswer, item.explanation);
    } else {
      studyItemContainerEl
        .querySelectorAll(".choice")
        .forEach((choice) => choice.addEventListener("click", handleAnswer));
      if (showExplanationImmediately) {
        handleAnswer({ currentTarget: { dataset: { answer: null } } });
      }
    }
  }

  function renderFlashcard(item) {
    studyItemContainerEl.innerHTML = `
            <div class="flashcard" tabindex="0">
                <div class="flashcard-inner">
                    <div class="flashcard-front"><p>${formatBold(
                      item.question
                    )}</p></div>
                    <div class="flashcard-back"><p>${formatBold(
                      item.answer
                    )}</p></div>
                </div>
            </div>`;

    const flashcard = studyItemContainerEl.querySelector(".flashcard");
    flashcard.addEventListener("click", () =>
      flashcard.classList.toggle("is-flipped")
    );
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
      const iconClass = item.type === "flashcard" ? "fa-clone" : "fa-list-ul";
      indicator.innerHTML = `<span>${
        index + 1
      }</span> <i class="fas ${iconClass} type-icon"></i>`;
      indicator.dataset.index = index;
      indicator.addEventListener("click", () => {
        if (index === currentItemIndex) return;
        currentItemIndex = index;
        displayCurrentItem('jump');
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
    progressEl.textContent = `${Math.min(
      currentItemIndex + 1,
      allItems.length
    )} / ${allItems.length}`;
    const mcqItems = allItems.filter((i) => i.type === "multiplechoice");
    const answeredMcq = userAnswers.filter((a) => a !== null);
    const score = answeredMcq.reduce(
      (acc, ans) => acc + (ans.correct ? 1 : 0),
      0
    );

    // Animate score update
    const oldScoreText = scoreEl.textContent;
    const newScoreText = `${score} / ${answeredMcq.length}`;
    if (oldScoreText !== newScoreText) {
      animateValue(scoreEl, oldScoreText, newScoreText);
    } else {
      scoreEl.textContent = newScoreText;
    }

    updateItemIndicators();
  }

  function updateNavigation() {
    backBtn.style.display = currentItemIndex > 0 ? "block" : "none";
    nextBtn.textContent =
      currentItemIndex >= allItems.length - 1 ? "Finish" : "Next";
  }

  // --- EVENT HANDLERS & LOGIC ---
  function handleAnswer(e) {
    const item = allItems[currentItemIndex];
    if (item.type !== "multiplechoice" || userAnswers[currentItemIndex]) return;
    const selectedAnswer = e.currentTarget.dataset.answer;
    userAnswers[currentItemIndex] = {
      selected: selectedAnswer,
      correct: selectedAnswer === item.correctAnswer,
    };
    highlightChoices(selectedAnswer, item.correctAnswer);
    showExplanation(item.correctAnswer, item.explanation);
    updateStatus();
  }

  function highlightChoices(selected, correct) {
    studyItemContainerEl.querySelectorAll(".choice").forEach((choice) => {
      const answerKey = choice.dataset.answer;
      choice.style.cursor = "not-allowed";
      if (answerKey === correct) choice.classList.add("correct");
      else if (answerKey === selected) choice.classList.add("incorrect");
      choice.removeEventListener("click", handleAnswer);
    });
  }

  function showExplanation(correctAnswer, explanationText) {
    const explanationEl = studyItemContainerEl.querySelector("#explanation");
    if (explanationEl) {
      explanationEl.innerHTML = `<strong>Correct Answer: ${correctAnswer}</strong><br>${
        formatBold(explanationText) || "No explanation provided."
      }`;
      explanationEl.classList.add("show");
    }
  }

  function nextItem() {
    if (currentItemIndex < allItems.length) currentItemIndex++;
    displayCurrentItem('next');
  }

  function previousItem() {
    if (currentItemIndex > 0) currentItemIndex--;
    displayCurrentItem('back');
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

    // --- Log the "Quiz Finished" event ---
    logEvent("Quiz Finished", {
      score: `${finalScore} / ${mcqTotal}`,
      percentage: `${percentage}%`,
      decks: deckTitles,
      completionTime: formatTime(elapsedSeconds),
    });

    document.getElementById("study-area-wrapper").style.display = "none";
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
            </div>`;
    containerEl.appendChild(resultsContainer);
    document
      .getElementById("retry-quiz")
      .addEventListener("click", () => location.reload());
    document
      .getElementById("return-menu")
      .addEventListener("click", () => (window.location.href = "index.html"));
  }

  // --- UTILITY FUNCTIONS ---
  function animateValue(element, start, end) {
    const duration = 250;
    const frame = { val: 0 };
    anime({
      targets: frame,
      val: 1,
      duration,
      easing: 'easeOutQuad',
      update: function() {
        element.style.opacity = frame.val;
        element.style.transform = `translateY(${(1 - frame.val) * 10}px)`;
      }
    });
    element.textContent = end;
  }

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
      const oldTime = timerEl.textContent;
      elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const newTime = formatTime(elapsedSeconds);
      if (oldTime !== newTime) {
        animateValue(timerEl, oldTime, newTime);
      }
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
