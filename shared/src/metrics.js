const client = require('prom-client');

const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

function setupMetrics(app, serviceName) {
    client.collectDefaultMetrics({
        prefix: 'heavenly_',
        labels: { service: serviceName }
    });

    const requestDuration = new client.Histogram({
        name: 'heavenly_http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['service', 'method', 'route', 'status_code'],
        buckets
    });

    const requestTotal = new client.Counter({
        name: 'heavenly_http_requests_total',
        help: 'Total HTTP requests',
        labelNames: ['service', 'method', 'route', 'status_code']
    });

    app.use((req, res, next) => {
        if (req.path === '/metrics') {
            return next();
        }

        const end = requestDuration.startTimer();
        res.on('finish', () => {
            const route = req.route?.path || req.baseUrl || req.path || 'unknown';
            const labels = {
                service: serviceName,
                method: req.method,
                route,
                status_code: String(res.statusCode)
            };

            requestTotal.inc(labels);
            end(labels);
        });

        next();
    });

    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', client.register.contentType);
        res.end(await client.register.metrics());
    });
}

module.exports = { setupMetrics };
