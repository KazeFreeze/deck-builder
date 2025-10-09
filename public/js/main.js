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
    // Prevent re-animation if already in the target mode
    if (currentMode === mode && document.getElementById("sets-section-container").style.display !== 'none' && mode === 'casual') return;
    if (currentMode === mode && document.getElementById("available-decks-section-container").style.display !== 'none' && mode === 'pro') return;


    const setsSection = document.getElementById("sets-section-container");
    const availableDecksSection = document.getElementById("available-decks-section-container");

    const leavingSection = mode === "pro" ? setsSection : availableDecksSection;
    const enteringSection = mode === "pro" ? availableDecksSection : setsSection;

    // 1. Animate the leaving section out
    anime({
        targets: leavingSection,
        opacity: 0,
        translateY: -20,
        duration: 250,
        easing: 'easeInQuad',
        complete: () => {
            leavingSection.style.display = 'none';

            // 2. Update state and render content for the entering section (while it's still invisible)
            currentMode = mode;
            localStorage.setItem("studyAppMode", mode);
            modeToggle.checked = mode === "pro";
            renderAvailableDecks();

            // 3. Animate the entering section in
            enteringSection.style.display = 'block';
            enteringSection.style.opacity = 0; // Start invisible
            anime({
                targets: enteringSection,
                opacity: 1,
                translateY: [20, 0],
                duration: 300,
                easing: 'easeOutQuad'
            });
        }
    });
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
    setsContainer.className = 'space-y-2';

    availableSets.forEach((set, index) => {
      const checkId = `set-${index}`;

      // Create the hidden checkbox
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = checkId;
      checkbox.value = index;
      checkbox.className = "hidden"; // Visually hide it
      checkbox.addEventListener("change", handleSetSelection);

      // Create the label which acts as the clickable panel
      const panelLabel = document.createElement("label");
      panelLabel.setAttribute("for", checkId);
      panelLabel.className = "set-item-panel block p-4 rounded-lg cursor-pointer transition-all duration-200 border-2";

      // Create title and description
      const titleStrong = document.createElement("strong");
      titleStrong.textContent = set.title;
      titleStrong.className = "text-lg";

      const descriptionP = document.createElement("p");
      descriptionP.textContent = set.description;
      descriptionP.className = "text-sm opacity-75 mt-1";

      panelLabel.appendChild(titleStrong);
      panelLabel.appendChild(descriptionP);

      // Append both to the container
      setsContainer.appendChild(checkbox);
      setsContainer.appendChild(panelLabel);
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
    el.addEventListener("click", (e) => addDeckToSelection(deck, type, topicDir, e.currentTarget));
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
        removeDeckFromSelection(index, item);
    });
    return item;
  }

  // --- EVENT HANDLERS & LOGIC ---
  function handleSetSelection(e) {
    // 1. Create a flattened, comprehensive list of all available decks for easy lookup.
    const allDecks = availableTopics.flatMap(topic => [
        ...(topic.flashcards || []).map(deck => ({ ...deck, type: 'flashcards', topicDir: topic.directory, topicName: topic.name })),
        ...(topic.multiplechoice || []).map(deck => ({ ...deck, type: 'multiplechoice', topicDir: topic.directory, topicName: topic.name }))
    ]);

    // 2. Collect all decks from all currently checked sets.
    const decksFromSelectedSets = [];
    const checkedSetCheckboxes = document.querySelectorAll("#sets-container input[type='checkbox']:checked");

    checkedSetCheckboxes.forEach(checkbox => {
        const setIndex = parseInt(checkbox.value, 10);
        const selectedSet = availableSets[setIndex];
        if (!selectedSet || !selectedSet.decks) return;

        selectedSet.decks.forEach(setDeck => {
            const foundDeck = allDecks.find(d => d.file === setDeck.file && d.type === setDeck.type);
            if (foundDeck) {
                decksFromSelectedSets.push(foundDeck);
            }
        });
    });

    // 3. Filter the collected decks to ensure uniqueness, creating the final list.
    const uniqueSelectedDecks = [];
    const seenDeckIdentifiers = new Set();
    decksFromSelectedSets.forEach(deck => {
        const identifier = `${deck.topicDir}/${deck.type}/${deck.file}`;
        if (!seenDeckIdentifiers.has(identifier)) {
            seenDeckIdentifiers.add(identifier);
            uniqueSelectedDecks.push(deck);
        }
    });

    selectedDecks = uniqueSelectedDecks;

    // 4. Re-render the UI to reflect the new state.
    renderSelectedDecks();
    renderAvailableDecks();
  }

  function removeDeckFromSelection(index, sourceElement) {
    anime({
      targets: sourceElement,
      opacity: 0,
      translateX: 20,
      duration: 200,
      easing: 'easeInQuad',
      complete: () => {
        selectedDecks.splice(index, 1);
        renderSelectedDecks();
        renderAvailableDecks();
      }
    });
  }

  function addDeckToSelection(deck, type, topicDir, sourceElement) {
    // 1. Animate the source element out
    anime({
      targets: sourceElement,
      opacity: 0,
      scale: 0.9,
      duration: 200,
      easing: 'easeInQuad',
      complete: () => {
        // 2. Update state after animation
        const topic = availableTopics.find(t => t.directory === topicDir);
        selectedDecks.push({ ...deck, type, topicDir, topicName: topic.name });

        // 3. Re-render the lists
        renderSelectedDecks();
        renderAvailableDecks();

        // 4. Animate the new element in
        const newSelectedElement = selectedDecksContainer.lastElementChild;
        if (newSelectedElement) {
            anime({
                targets: newSelectedElement,
                opacity: [0, 1],
                translateX: [-20, 0],
                duration: 250,
                easing: 'easeOutQuad'
            });
        }
      }
    });
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
