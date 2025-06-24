document.addEventListener("DOMContentLoaded", () => {
  const multipleChoiceDecksContainer = document.getElementById(
    "multiplechoice-decks"
  );
  const flashcardDecksContainer = document.getElementById("flashcard-decks");
  const selectedDecksContainer = document.getElementById("selected-decks");
  const setsContainer = document.getElementById("sets-container");
  const startStudyingBtn = document.getElementById("start-studying-btn");

  let availableDecks = {
    multiplechoice: [],
    flashcards: [],
  };
  let availableSets = [];
  let selectedDecks = [];

  // Fetch all necessary data from our new serverless API endpoint
  async function loadData() {
    try {
      const response = await fetch("/api/decks");
      if (!response.ok) {
        throw new Error(`API error! status: ${response.status}`);
      }
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
      flashcardDecksContainer.innerHTML = "";
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
    decks.forEach((deck) => {
      const deckElement = createDeckElement(deck, type);
      container.appendChild(deckElement);
    });
  }

  function renderSets() {
    setsContainer.innerHTML = "";
    if (availableSets.length === 0) {
      setsContainer.innerHTML =
        '<div class="placeholder">No pre-configured sets found.</div>';
      return;
    }
    availableSets.forEach((set, index) => {
      const setEl = document.createElement("div");
      setEl.className = "set-card";
      setEl.innerHTML = `<h3>${set.title}</h3><p>${set.description}</p>`;
      setEl.addEventListener("click", () => handleSetSelection(index));
      setsContainer.appendChild(setEl);
    });
  }

  function renderSelectedDecks() {
    selectedDecksContainer.innerHTML = "";
    if (selectedDecks.length === 0) {
      selectedDecksContainer.innerHTML =
        '<div class="placeholder">Drag or click decks here.</div>';
      return;
    }
    selectedDecks.forEach((deck, index) => {
      const item = createSelectedDeckElement(deck, index);
      selectedDecksContainer.appendChild(item);
    });
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
  function handleSetSelection(setIndex) {
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
    if (selectedDecks.some((d) => d.file === deck.file)) {
      alert("This deck is already in your study plan.");
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
    const deckFiles = selectedDecks
      .map((deck) => `${deck.type}/${deck.file}`)
      .join(",");
    const shuffle = document.getElementById("shuffle-toggle").checked;
    const timer = document.getElementById("timer-toggle").checked;
    const showExplanation = document.getElementById(
      "show-explanation-toggle"
    ).checked;
    const url = `study.html?decks=${encodeURIComponent(
      deckFiles
    )}&shuffle=${shuffle}&timer=${timer}&showExplanation=${showExplanation}`;
    window.location.href = url;
  });

  // --- DRAG & DROP LOGIC ---
  function handleDragStart(e) {
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        file: e.target.dataset.file,
        title: e.target.textContent,
        type: e.target.dataset.type,
      })
    );
  }

  selectedDecksContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
  });

  selectedDecksContainer.addEventListener("dragleave", (e) =>
    e.currentTarget.classList.remove("drag-over")
  );

  selectedDecksContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    const dataStr = e.dataTransfer.getData("text/plain");
    try {
      const droppedDeck = JSON.parse(dataStr);
      if (
        droppedDeck.file &&
        !selectedDecks.some((d) => d.file === droppedDeck.file)
      ) {
        addDeckToSelection(droppedDeck, droppedDeck.type);
      }
    } catch (err) {
      const fromIndex = parseInt(dataStr, 10);
      const list = selectedDecksContainer;
      const y = e.clientY;
      const afterElement = [
        ...list.querySelectorAll(".selected-deck-item:not(.dragging)"),
      ].find(
        (item) =>
          y <
          item.getBoundingClientRect().top +
            item.getBoundingClientRect().height / 2
      );

      const toIndex = afterElement
        ? parseInt(afterElement.dataset.index, 10)
        : selectedDecks.length;

      const [movedItem] = selectedDecks.splice(fromIndex, 1);
      selectedDecks.splice(
        fromIndex < toIndex ? toIndex - 1 : toIndex,
        0,
        movedItem
      );

      renderSelectedDecks();
    }
  });

  // Initial load
  loadData();
});
