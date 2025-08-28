// Main entry point for the combined Jarvis-Void Editor application
const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, 'frontend', 'build')));

// API routes for Jarvis functionality
app.use('/api', require('./backend/api/chat'));
app.use('/api', require('./backend/api/execute'));

// Serve the main application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'build', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Jarvis-Void Editor running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop the server');
});

// Optional: Start the Void Editor components if available
try {
  // This would start the Void Editor backend if it were properly installed
  console.log('Void Editor integration would start here');
} catch (error) {
  console.log('Void Editor components not available:', error.message);
}
