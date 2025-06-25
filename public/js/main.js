document.addEventListener("DOMContentLoaded", () => {
  // --- DOM ELEMENTS ---
  const multipleChoiceDecksContainer = document.getElementById(
    "multiplechoice-decks"
  );
  const flashcardDecksContainer = document.getElementById("flashcard-decks");
  const selectedDecksContainer = document.getElementById("selected-decks");
  const setsContainer = document.getElementById("sets-container");
  const startStudyingBtn = document.getElementById("start-studying-btn");
  const themeToggle = document.getElementById("theme-toggle");

  // --- STATE ---
  let availableDecks = { multiplechoice: [], flashcards: [] };
  let availableSets = [];
  let selectedDecks = [];

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

  // --- THEME SWITCHER LOGIC ---
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("studyAppTheme", theme);
    themeToggle.checked = theme === "dark";
  }

  themeToggle.addEventListener("change", () => {
    applyTheme(themeToggle.checked ? "dark" : "light");
  });

  // --- DATA LOADING ---
  async function loadData() {
    try {
      const response = await fetch("/api/decks");
      if (!response.ok)
        throw new Error(`API error! status: ${response.status}`);
      const data = await response.json();

      availableDecks.multiplechoice = data.multiplechoice || [];
      availableDecks.flashcards = data.flashcards || [];
      availableSets = data.sets || [];

      renderAvailableDecks();
      renderSets();
    } catch (error) {
      console.error("Could not load data from API:", error);
      multipleChoiceDecksContainer.innerHTML =
        '<div class="error">Could not load decks from the server.</div>';
      setsContainer.innerHTML =
        '<div class="error">Could not load pre-configured sets.</div>';
    }
  }

  // --- RENDERING FUNCTIONS ---
  function renderAvailableDecks() {
    renderDeckList(
      availableDecks.multiplechoice,
      multipleChoiceDecksContainer,
      "multiplechoice"
    );
    renderDeckList(
      availableDecks.flashcards,
      flashcardDecksContainer,
      "flashcards"
    );
  }

  function renderDeckList(decks, container, type) {
    container.innerHTML = "";
    if (decks.length === 0) {
      container.innerHTML = '<div class="placeholder">No decks found.</div>';
      return;
    }
    decks.forEach((deck) =>
      container.appendChild(createDeckElement(deck, type))
    );
  }

  function renderSets() {
    setsContainer.innerHTML = "";
    if (availableSets.length === 0) {
      setsContainer.innerHTML =
        '<div class="placeholder">No pre-configured sets found.</div>';
      return;
    }
    availableSets.forEach((set, index) => {
      const radioId = `set-${index}`;
      const setEl = document.createElement("div");
      setEl.className = "radio-set-item";
      setEl.innerHTML = `
                <input type="radio" id="${radioId}" name="preconfigured-set" value="${index}">
                <label for="${radioId}">
                    <strong>${set.title}</strong>
                    <span>${set.description}</span>
                </label>
            `;
      setEl
        .querySelector("input")
        .addEventListener("change", handleSetSelection);
      setsContainer.appendChild(setEl);
    });
  }

  function renderSelectedDecks() {
    selectedDecksContainer.innerHTML = "";
    if (selectedDecks.length === 0) {
      selectedDecksContainer.innerHTML =
        '<div class="placeholder">Drag decks or select a set.</div>';
      return;
    }
    selectedDecks.forEach((deck, index) =>
      selectedDecksContainer.appendChild(createSelectedDeckElement(deck, index))
    );
  }

  // --- ELEMENT CREATION ---
  function createDeckElement(deck, type) {
    const el = document.createElement("div");
    el.className = "deck-item";
    el.textContent = deck.title;
    el.draggable = true;
    el.dataset.file = deck.file;
    el.dataset.type = type;
    el.addEventListener("dragstart", handleDragStart);
    el.addEventListener("click", () => addDeckToSelection(deck, type));
    return el;
  }

  function createSelectedDeckElement(deck, index) {
    const item = document.createElement("div");
    item.className = "selected-deck-item";
    item.draggable = true;
    item.dataset.index = index;
    const typeIcon =
      deck.type === "flashcards"
        ? '<i class="fas fa-clone"></i>'
        : '<i class="fas fa-list-ul"></i>';
    item.innerHTML = `
            <span class="drag-handle"><i class="fas fa-grip-vertical"></i></span>
            ${typeIcon} ${deck.title}
            <button class="remove-deck-btn" data-index="${index}"><i class="fas fa-times-circle"></i></button>
        `;
    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", index);
      e.currentTarget.classList.add("dragging");
    });
    item.addEventListener("dragend", (e) =>
      e.currentTarget.classList.remove("dragging")
    );
    item.querySelector(".remove-deck-btn").addEventListener("click", () => {
      selectedDecks.splice(index, 1);
      renderSelectedDecks();
    });
    return item;
  }

  // --- EVENT HANDLERS & LOGIC ---
  function handleSetSelection(e) {
    const setIndex = parseInt(e.target.value, 10);
    const selectedSet = availableSets[setIndex];
    if (!selectedSet) return;

    selectedDecks = selectedSet.decks
      .map((setDeck) => {
        const deckList = availableDecks[setDeck.type] || [];
        const foundDeck = deckList.find((d) => d.file === setDeck.file);
        return foundDeck ? { ...foundDeck, type: setDeck.type } : null;
      })
      .filter(Boolean);
    renderSelectedDecks();
  }

  function addDeckToSelection(deck, type) {
    if (selectedDecks.some((d) => d.file === deck.file && d.type === type)) {
      // Simple alert for user feedback
      const notification = document.createElement("div");
      notification.className = "deck-add-notification";
      notification.textContent = "This deck is already in your study plan.";
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.remove();
      }, 3000);
      return;
    }
    selectedDecks.push({ ...deck, type });
    renderSelectedDecks();
  }

  startStudyingBtn.addEventListener("click", () => {
    if (selectedDecks.length === 0) {
      alert("Please select at least one deck to start studying.");
      return;
    }

    // --- Log the "Deck Assembled" event ---
    logEvent("Deck Assembled", {
      deckCount: selectedDecks.length,
      decks: selectedDecks.map((d) => d.title),
    });

    const deckFiles = selectedDecks
      .map((deck) => `${deck.type}/${deck.file}`)
      .join(",");
    // *** FIX START ***
    // Get the human-readable titles of the decks to pass to the study page
    const deckNames = selectedDecks.map((deck) => deck.title).join(",");
    // *** FIX END ***

    const shuffle = document.getElementById("shuffle-toggle").checked;
    const timer = document.getElementById("timer-toggle").checked;
    const showExplanation = document.getElementById(
      "show-explanation-toggle"
    ).checked;

    // *** FIX START ***
    // Add the encoded deckNames parameter to the URL
    const url = `study.html?decks=${encodeURIComponent(
      deckFiles
    )}&deckNames=${encodeURIComponent(
      deckNames
    )}&shuffle=${shuffle}&timer=${timer}&showExplanation=${showExplanation}`;
    // *** FIX END ***

    window.location.href = url;
  });

  // --- DRAG & DROP LOGIC ---
  function handleDragStart(e) {
    e.dataTransfer.setData(
      "application/json", // Use a more specific MIME type
      JSON.stringify({
        file: e.target.dataset.file,
        title: e.target.textContent,
        type: e.target.dataset.type,
      })
    );
  }

  selectedDecksContainer.addEventListener("dragover", (e) => {
    e.preventDefault(); // Necessary to allow drop
    e.currentTarget.classList.add("drag-over");
  });

  selectedDecksContainer.addEventListener("dragleave", (e) => {
    e.currentTarget.classList.remove("drag-over");
  });

  selectedDecksContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");

    const droppedData = e.dataTransfer.getData("application/json");
    if (droppedData) {
      // Handle drop from available decks
      const droppedDeck = JSON.parse(droppedData);
      addDeckToSelection(droppedDeck, droppedDeck.type);
    } else {
      // Handle reordering within the selected list
      const fromIndex = e.dataTransfer.getData("text/plain");
      const draggedElement = document.querySelector(
        `[data-index='${fromIndex}']`
      );
      const afterElement = getDragAfterElement(
        selectedDecksContainer,
        e.clientY
      );
      const toIndex = afterElement
        ? Number(afterElement.dataset.index)
        : selectedDecks.length;

      const [movedItem] = selectedDecks.splice(fromIndex, 1);
      selectedDecks.splice(
        toIndex > fromIndex ? toIndex - 1 : toIndex,
        0,
        movedItem
      );
      renderSelectedDecks();
    }
  });

  function getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll(".selected-deck-item:not(.dragging)"),
    ];
    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  // --- INITIALIZATION ---
  const savedTheme = localStorage.getItem("studyAppTheme") || "light";
  applyTheme(savedTheme);
  loadData();
  // Log the initial page view
  logEvent("Page View", { page: "Home" });
});
