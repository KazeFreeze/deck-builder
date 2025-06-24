const fs = require("fs");
const path = require("path");

// Helper function to create a readable title from a filename
function titleFromFile(file) {
  return path
    .basename(file, ".json")
    .replace(/[_-]/g, " ") // Replace underscores and hyphens with spaces
    .replace(/\b\w/g, (l) => l.toUpperCase()); // Capitalize each word
}

// Helper function to read deck files from a directory
function getDecksFromDirectory(dirName) {
  const fullPath = path.join(process.cwd(), "public", dirName);
  if (!fs.existsSync(fullPath)) {
    return [];
  }
  const files = fs.readdirSync(fullPath);

  return files
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      try {
        const content = fs.readFileSync(path.join(fullPath, file), "utf8");
        const jsonContent = JSON.parse(content);
        // Use the title from the JSON if it exists, otherwise generate one from the filename.
        const title = jsonContent.title || titleFromFile(file);
        return { file, title };
      } catch (e) {
        console.error(`Error processing ${file}:`, e);
        return null;
      }
    })
    .filter(Boolean);
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
    const flashcardDecks = getDecksFromDirectory("flashcards");
    const multipleChoiceDecks = getDecksFromDirectory("multiplechoice");
    const sets = getSets();

    const payload = {
      flashcards: flashcardDecks,
      multiplechoice: multipleChoiceDecks,
      sets: sets,
    };

    // Set cache headers to tell browsers to re-validate content every 60 seconds
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    res.status(200).json(payload);
  } catch (error) {
    console.error("Failed to generate deck manifest:", error);
    res.status(500).json({ error: "Failed to generate deck manifest." });
  }
};
