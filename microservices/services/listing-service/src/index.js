// Listing Service — placeholder entry point (to be built in Phase 3)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ service: 'listing-service', status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`[Listing Service] Running on port ${PORT}`);
});
