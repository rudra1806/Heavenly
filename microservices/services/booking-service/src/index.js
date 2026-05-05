// Booking Service — placeholder entry point (to be built in Phase 4)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ service: 'booking-service', status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`[Booking Service] Running on port ${PORT}`);
});
