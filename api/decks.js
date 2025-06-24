const fs = require("fs");
const path = require("path");

// Helper function to read deck files from a directory
function getDecksFromDirectory(dirName) {
  // Construct the full path to the directory within the 'public' folder
  const fullPath = path.join(process.cwd(), "public", dirName);

  // If the directory doesn't exist, return an empty array
  if (!fs.existsSync(fullPath)) {
    return [];
  }

  // Read all file names in the directory
  const files = fs.readdirSync(fullPath);

  return (
    files
      // Filter for .json files only
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        try {
          // Read the content of the JSON file
          const content = fs.readFileSync(path.join(fullPath, file), "utf8");
          const jsonContent = JSON.parse(content);

          // For multiple choice, the title is inside the JSON.
          // For flashcards, we'll create a title from the filename.
          const title =
            jsonContent.title ||
            path
              .basename(file, ".json")
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());

          return { file, title };
        } catch (e) {
          // If a JSON file is malformed, log the error and skip it
          console.error(`Error processing ${file}:`, e);
          return null;
        }
      })
      // Filter out any null results from failed file processing
      .filter(Boolean)
  );
}

// Helper function to read pre-configured sets
function getSets() {
  const setsPath = path.join(process.cwd(), "public", "sets", "sets.json");
  if (!fs.existsSync(setsPath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(setsPath, "utf8");
    return JSON.parse(content);
  } catch (e) {
    console.error("Error reading or parsing sets.json:", e);
    return [];
  }
}

// The main serverless function handler
module.exports = (req, res) => {
  try {
    // Fetch all data
    const flashcardDecks = getDecksFromDirectory("flashcards");
    const multipleChoiceDecks = getDecksFromDirectory("multiplechoice");
    const sets = getSets();

    // Construct the final JSON payload
    const payload = {
      flashcards: flashcardDecks,
      multiplechoice: multipleChoiceDecks,
      sets: sets,
    };

    // Send a successful response
    res.status(200).json(payload);
  } catch (error) {
    // If a major error occurs, send a server error response
    console.error("Failed to generate deck manifest:", error);
    res.status(500).json({ error: "Failed to generate deck manifest." });
  }
};
