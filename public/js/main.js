document.addEventListener("DOMContentLoaded", () => {
  // --- DOM ELEMENTS ---
  const availableDecksContainer = document.getElementById("available-decks-container");
  const selectedDecksContainer = document.getElementById("selected-decks");
  const setsContainer = document.getElementById("sets-container");
  const startStudyingBtn = document.getElementById("start-studying-btn");
  const themeToggle = document.getElementById("theme-toggle");
  const modeToggle = document.getElementById("mode-toggle");

  // --- STATE ---
  let availableTopics = [];
  let availableSets = [];
  let selectedDecks = [];
  let currentMode = "casual"; // "casual" or "pro"

  // --- ANALYTICS FUNCTION ---
  async function logEvent(eventType, eventData) {
    try {
      await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, eventData }),
      });
    } catch (error) {
      console.error("Failed to log event:", error);
    }
  }

  // --- THEME & MODE SWITCHER LOGIC ---
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("studyAppTheme", theme);
    themeToggle.checked = theme === "dark";
  }

  function applyMode(mode) {
    currentMode = mode;
    localStorage.setItem("studyAppMode", mode);
    modeToggle.checked = mode === "pro";

    const setsSection = document.getElementById("sets-section-container");
    if (setsSection) {
      setsSection.style.display = mode === "casual" ? "block" : "none";
    }

    const availableDecksSection = document.getElementById("available-decks-section-container");
    if (availableDecksSection) {
      availableDecksSection.style.display = mode === "casual" ? "none" : "block";
    }

    renderAvailableDecks();
  }

  themeToggle.addEventListener("change", () => {
    applyTheme(themeToggle.checked ? "dark" : "light");
  });

  modeToggle.addEventListener("change", () => {
    applyMode(modeToggle.checked ? "pro" : "casual");
  });

  // --- DATA LOADING ---
  async function loadData() {
    try {
      const response = await fetch("/api/decks");
      if (!response.ok) throw new Error(`API error! status: ${response.status}`);
      const data = await response.json();

      availableTopics = data.topics || [];
      availableSets = data.sets || [];

      renderAvailableDecks();
      renderSets();
    } catch (error) {
      console.error("Could not load data from API:", error);
      availableDecksContainer.innerHTML = '<div class="error">Could not load decks from the server.</div>';
      setsContainer.innerHTML = '<div class="error">Could not load pre-configured sets.</div>';
    }
  }

  // --- RENDERING FUNCTIONS ---
  function renderAvailableDecks() {
    availableDecksContainer.innerHTML = "";
    if (currentMode === "casual") {
      renderCasualMode();
    } else {
      renderProMode();
    }
  }

  function renderCasualMode() {
    availableTopics.forEach((topic) => {
      if (topic.flashcards.length === 0 && topic.multiplechoice.length === 0) return;

      const topicEl = document.createElement("div");
      topicEl.className = "collapse collapse-arrow bg-base-200 mb-2";
      topicEl.innerHTML = `
        <input type="radio" name="topic-accordion" />
        <div class="collapse-title text-xl font-medium flex items-center justify-between"><span>${topic.name}</span></div>
        <div class="collapse-content">
          <div class="topic-deck-list">
            <!-- Decks will be rendered here -->
          </div>
        </div>
      `;

      const deckListContainer = topicEl.querySelector(".topic-deck-list");
      renderDeckList(topic.flashcards, deckListContainer, "flashcards", topic.directory);
      renderDeckList(topic.multiplechoice, deckListContainer, "multiplechoice", topic.directory);
      availableDecksContainer.appendChild(topicEl);
    });
  }

  function renderProMode() {
    const allFlashcards = availableTopics.flatMap(topic =>
        topic.flashcards.map(deck => ({...deck, topicDir: topic.directory}))
    );
    const allMultipleChoice = availableTopics.flatMap(topic =>
        topic.multiplechoice.map(deck => ({...deck, topicDir: topic.directory}))
    );

    if (allMultipleChoice.length > 0) {
        const header = document.createElement('h3');
        header.textContent = 'Multiple Choice Decks';
        availableDecksContainer.appendChild(header);
        renderDeckList(allMultipleChoice, availableDecksContainer, "multiplechoice");
    }
    if (allFlashcards.length > 0) {
        const header = document.createElement('h3');
        header.textContent = 'Flashcard Decks';
        availableDecksContainer.appendChild(header);
        renderDeckList(allFlashcards, availableDecksContainer, "flashcards");
    }
  }

  function renderDeckList(decks, container, type, topicDir = null) {
    const unselectedDecks = decks.filter(
      (deck) => !selectedDecks.some((selected) => selected.file === deck.file && selected.type === type && selected.topicDir === (topicDir || deck.topicDir))
    );

    if (unselectedDecks.length === 0 && container.innerHTML === "") {
      container.innerHTML = '<div class="placeholder text-sm">No decks of this type.</div>';
    }

    unselectedDecks.forEach((deck) =>
      container.appendChild(createDeckElement(deck, type, topicDir || deck.topicDir))
    );
  }

  function renderSets() {
    setsContainer.innerHTML = "";
    if (availableSets.length === 0) {
      setsContainer.innerHTML = '<div class="placeholder">No pre-configured sets found.</div>';
      return;
    }

    availableSets.forEach((set, index) => {
      const radioId = `set-${index}`;

      // Create the row div as requested
      const rowDiv = document.createElement("div");

      // Create the selector (now a checkbox)
      const selector = document.createElement("input");
      selector.type = "checkbox";
      selector.id = radioId;
      selector.className = "checkbox checkbox-primary";
      selector.value = index;
      selector.addEventListener("change", handleSetSelection);

      // Create the title element (using a label for accessibility)
      const titleLabel = document.createElement("label");
      titleLabel.setAttribute("for", radioId);
      titleLabel.style.marginLeft = "8px"; // Add a small space between button and text

      const titleStrong = document.createElement("strong");
      titleStrong.textContent = set.title;

      const descriptionSpan = document.createElement("span");
      descriptionSpan.textContent = ` — ${set.description}`;

      titleLabel.appendChild(titleStrong);
      titleLabel.appendChild(descriptionSpan);

      // Append the selector and title to the row
      rowDiv.appendChild(selector);
      rowDiv.appendChild(titleLabel);

      // Append the row to the main container
      setsContainer.appendChild(rowDiv);
    });
  }

  function renderSelectedDecks() {
    selectedDecksContainer.innerHTML = "";
    if (selectedDecks.length === 0) {
      selectedDecksContainer.innerHTML = '<div class="placeholder">Select decks to add them to your study plan.</div>';
      return;
    }
    selectedDecks.forEach((deck, index) =>
      selectedDecksContainer.appendChild(createSelectedDeckElement(deck, index))
    );
  }

  // --- ELEMENT CREATION ---
  function createDeckElement(deck, type, topicDir) {
    const el = document.createElement("div");
    el.className = "deck-item btn btn-ghost btn-outline justify-start m-1"; // DaisyUI button style
    el.textContent = deck.title;
    el.dataset.file = deck.file;
    el.dataset.type = type;
    el.dataset.topicDir = topicDir;
    el.addEventListener("click", () => addDeckToSelection(deck, type, topicDir));
    return el;
  }

  function createSelectedDeckElement(deck, index) {
    const item = document.createElement("div");
    item.className = "selected-deck-item flex items-center justify-between bg-base-100 p-2 rounded mb-1";
    const typeIcon = deck.type === "flashcards" ? "fa-clone" : "fa-list-ul";
    item.innerHTML = `
      <div class="flex items-center gap-2">
        <i class="fas ${typeIcon}"></i>
        <span class="flex-grow">${deck.title}</span>
        <span class="badge badge-ghost badge-sm h-auto whitespace-normal text-right">${deck.topicName}</span>
      </div>
      <button class="remove-deck-btn btn btn-xs btn-circle btn-ghost" data-index="${index}">
        <i class="fas fa-times-circle"></i>
      </button>
    `;
    item.querySelector(".remove-deck-btn").addEventListener("click", () => {
      selectedDecks.splice(index, 1);
      renderSelectedDecks();
      renderAvailableDecks(); // Re-render available to show the deck again
    });
    return item;
  }

  // --- EVENT HANDLERS & LOGIC ---
  function handleSetSelection(e) {
    // This function now rebuilds the entire list of selected decks from scratch
    // based on ALL currently checked boxes. This correctly handles shared decks.
    let newSelectedDecks = [];
    const checkedSetCheckboxes = document.querySelectorAll("#sets-container input[type='checkbox']:checked");

    checkedSetCheckboxes.forEach(checkbox => {
      const setIndex = parseInt(checkbox.value, 10);
      const selectedSet = availableSets[setIndex];
      if (!selectedSet) return;

      const decksInSet = selectedSet.decks.map(setDeck => {
        for (const topic of availableTopics) {
          const deckList = topic[setDeck.type] || [];
          const foundDeck = deckList.find(d => d.file === setDeck.file);
          if (foundDeck) {
            return { ...foundDeck, type: setDeck.type, topicDir: topic.directory, topicName: topic.name };
          }
        }
        return null;
      }).filter(Boolean);

      decksInSet.forEach(deckToAdd => {
        const alreadySelected = newSelectedDecks.some(
          d => d.file === deckToAdd.file && d.type === deckToAdd.type && d.topicDir === deckToAdd.topicDir
        );
        if (!alreadySelected) {
          newSelectedDecks.push(deckToAdd);
        }
      });
    });

    selectedDecks = newSelectedDecks;

    renderSelectedDecks();
    renderAvailableDecks();
  }

  function addDeckToSelection(deck, type, topicDir) {
    const topic = availableTopics.find(t => t.directory === topicDir);
    selectedDecks.push({ ...deck, type, topicDir, topicName: topic.name });
    renderSelectedDecks();
    renderAvailableDecks(); // Re-render available to hide the selected deck
  }

  startStudyingBtn.addEventListener("click", () => {
    if (selectedDecks.length === 0) {
      alert("Please select at least one deck to start studying.");
      return;
    }

    logEvent("Deck Assembled", {
      deckCount: selectedDecks.length,
      decks: selectedDecks.map((d) => d.title),
    });

    const deckFiles = selectedDecks
      .map((deck) => `${deck.topicDir}/${deck.type}/${deck.file}`)
      .join(",");

    const deckTitles = selectedDecks.map((deck) => deck.title);
    const deckTitlesJSON = JSON.stringify(deckTitles);

    const shuffle = document.getElementById("shuffle-toggle").checked;
    const timer = document.getElementById("timer-toggle").checked;
    const showExplanation = document.getElementById("show-explanation-toggle").checked;

    const url = `study.html?decks=${encodeURIComponent(
      deckFiles
    )}&deckTitles=${encodeURIComponent(
      deckTitlesJSON
    )}&shuffle=${shuffle}&timer=${timer}&showExplanation=${showExplanation}`;

    window.location.href = url;
  });

  // --- INITIALIZATION ---
  const savedTheme = localStorage.getItem("studyAppTheme") || "light";
  const savedMode = localStorage.getItem("studyAppMode") || "casual";
  applyTheme(savedTheme);
  applyMode(savedMode); // This will call renderAvailableDecks
  loadData();
  logEvent("Page View", { page: "Home" });
});
