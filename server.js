const express = require('express');
const decksHandler = require('./api/decks.js');
const path = require('path');

const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API route for decks
app.get('/api/decks', (req, res) => {
  // The Vercel handler function takes request and response objects
  decksHandler(req, res);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
