// Media Service — placeholder entry point (to be built in Phase 2)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ service: 'media-service', status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`[Media Service] Running on port ${PORT}`);
});
