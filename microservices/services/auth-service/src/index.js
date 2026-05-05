// Auth Service — placeholder entry point (to be built in Phase 2)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ service: 'auth-service', status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`[Auth Service] Running on port ${PORT}`);
});
