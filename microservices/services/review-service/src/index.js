// Review Service — placeholder entry point (to be built in Phase 4)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ service: 'review-service', status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`[Review Service] Running on port ${PORT}`);
});
