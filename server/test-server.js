const express = require('express');
const app = express();
const PORT = 5003;

app.use(express.json());

app.get('/api/health', (req, res) => {
  console.log('Health check request received');
  res.json({ message: 'Server is working!' });
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});
