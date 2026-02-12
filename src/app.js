const express = require('express');
const cors = require('cors');

const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://fsd-frontend-dpt7.onrender.com'
];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        }
    })
);
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
    res.send('Submission Review API is running. Access endpoints at /api/...');
});

// Routes
const authRoutes = require('./routes/auth.routes');
const submissionRoutes = require('./routes/submissions.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/dashboard', dashboardRoutes);

module.exports = { app };
