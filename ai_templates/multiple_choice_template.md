# Multiple Choice Deck Template

This template is a guide for creating new multiple-choice decks in JSON format.

## File Structure

The file should be a JSON object with two main keys: `title` and `questions`.

- `title`: A string representing the title of the deck.
- `questions`: An array of question objects.

## Question Object Structure

Each question object in the `questions` array should have the following keys:

- `module`: (Optional) A string for the module the question belongs to.
- `section`: (Optional) A string for the section within the module.
- `question`: A string containing the question text.
- `choices`: An object where keys are the choice letters (e.g., "A", "B", "C") and values are the choice texts.
- `correctAnswer`: A string that is the key of the correct choice in the `choices` object.
- `explanation`: A string providing an explanation for the correct answer.

## Example

```json
{
  "title": "Deck Title",
  "questions": [
    {
      "module": "Module Name",
      "section": "Section Name",
      "question": "What is the capital of France?",
      "choices": {
        "A": "London",
        "B": "Paris",
        "C": "Berlin",
        "D": "Madrid"
      },
      "correctAnswer": "B",
      "explanation": "Paris is the capital of France."
    }
  ]
}
```
