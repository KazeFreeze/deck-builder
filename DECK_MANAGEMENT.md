# How to Add New Decks and Sets

This guide explains how to add new study decks and pre-configured sets to the application.

## Adding a New Deck

Decks are the individual JSON files containing questions and answers. The application's backend automatically discovers these decks.

### 1. File Location

Place your new deck file in a subdirectory within the `public/` folder. The structure is designed to be organized by topic and type:

`public/<topic_directory>/<deck_type>/<your_deck_file>.json`

-   `<topic_directory>`: The subject of the deck (e.g., `theology`, `general_chemistry`).
-   `<deck_type>`: Must be either `flashcards` or `multiplechoice`.
-   `<your_deck_file>.json`: The name of your JSON file.

**Example:** `public/environmental_science/flashcards/air_pollution.json`

### 2. Deck JSON Format

The content of your JSON file must follow a specific format depending on the deck type.

#### Multiple Choice Format

A multiple-choice deck is a JSON object with a `title` and a `questions` array.

-   `title`: The name of the deck as it will appear in the UI.
-   `questions`: An array of question objects. Each object must have:
    -   `question` (string): The question text.
    -   `choices` (object): An object where keys are the choice identifiers (e.g., "A", "B") and values are the choice text.
    -   `correctAnswer` (string): The key of the correct choice from the `choices` object.
    -   `explanation` (string): An explanation for the correct answer.

**Example (`<your_deck_file>.json`):**
```json
{
  "title": "Introduction to Microelectronics",
  "questions": [
    {
      "question": "What is the most common semiconductor material used in the industry?",
      "choices": {
        "A": "Germanium",
        "B": "Silicon",
        "C": "Gallium Arsenide",
        "D": "Carbon"
      },
      "correctAnswer": "B",
      "explanation": "Silicon is the most widely used semiconductor material due to its abundance, stability, and well-understood properties."
    }
  ]
}
```

#### Flashcard Format

A flashcard deck is a JSON array of objects.

-   Each object in the array represents a single flashcard and must have:
    -   `q` (string): The question or front side of the card.
    -   `a` (string): The answer or back side of the card.

**Example (`<your_deck_file>.json`):**
```json
[
  {
    "q": "What does 'CPU' stand for?",
    "a": "Central Processing Unit"
  },
  {
    "q": "What is the purpose of RAM?",
    "a": "To provide temporary storage for data that the CPU needs to access quickly."
  }
]
```

---

## Adding a New Set

Sets are pre-configured "playlists" or collections of decks that can be studied together. This allows users to quickly start a session covering a specific curriculum without selecting decks individually.

### 1. File Location

All sets are defined within a single JSON file:

`public/sets/sets.json`

This file contains an array of all available sets.

### 2. Set JSON Format

To add a new set, you need to add a new object to the main array in `sets.json`.

-   Each set object must have:
    -   `title` (string): The name of the set as it will appear on the main page.
    -   `description` (string): A short description of what the set includes.
    -   `decks` (array): An array of objects, where each object represents a deck to be included in the set.
        -   `type` (string): The type of the deck (`flashcards` or `multiplechoice`).
        -   `file` (string): The **filename** of the deck to include (e.g., `air_pollution.json`).

**Important:** You only need to provide the `file` and `type`. The application will automatically find the full path to the deck based on these two properties.

### 3. How to Add Your New Set

1.  Open the `public/sets/sets.json` file.
2.  Add a new JSON object for your set to the array.

**Example (adding a new "Midterm Review" set):**

```json
[
  {
    "title": "Full Chemistry Review",
    "description": "Covers all available chemistry decks...",
    "decks": [
      { "type": "flashcards", "file": "air_pollution.json" },
      { "type": "flashcards", "file": "gen_chem.json" }
    ]
  },
  {
    "title": "Complete Theology Course",
    "description": "A comprehensive study plan for the entire theology course...",
    "decks": [
       { "type": "multiplechoice", "file": "Q1-questions.json" }
    ]
  },
  {
    "title": "Midterm Review",
    "description": "A mix of topics for the upcoming midterm exam.",
    "decks": [
       { "type": "multiplechoice", "file": "micro1.json" },
       { "type": "flashcards", "file": "air_pollution.json" }
    ]
  }
]
```
