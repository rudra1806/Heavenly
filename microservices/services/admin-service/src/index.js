// Admin Service — placeholder entry point (to be built in Phase 5)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3007;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ service: 'admin-service', status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`[Admin Service] Running on port ${PORT}`);
});
