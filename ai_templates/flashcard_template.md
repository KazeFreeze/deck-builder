# Flashcard Deck Template

This template is a guide for creating new flashcard decks in JSON format.

## File Structure

The file should be a JSON array of flashcard objects.

## Flashcard Object Structure

Each flashcard object in the array should have the following keys:

- `q`: A string containing the question (the front of the flashcard).
- `a`: A string containing the answer (the back of the flashcard).

## Example

```json
[
  {
    "q": "What is the chemical symbol for water?",
    "a": "H2O"
  },
  {
    "q": "What is the largest planet in our solar system?",
    "a": "Jupiter"
  }
]
```
