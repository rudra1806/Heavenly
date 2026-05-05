// BFF Service — placeholder entry point (to be built in Phase 6)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ service: 'bff', status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.json({ message: 'Heavenly BFF — EJS rendering layer (to be built in Phase 6)' });
});

app.listen(PORT, () => {
    console.log(`[BFF] Running on port ${PORT}`);
});
