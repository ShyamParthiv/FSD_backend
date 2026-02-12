const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prismaClient');

const register = async (req, res) => {
    try {
        console.log('Register request received:', req.body);
        const { name, email, password, role, phone } = req.body;
        const normalizedEmail = email ? email.trim().toLowerCase() : '';
        const normalizedRole = role ? role.trim().toLowerCase() : '';

        if (!normalizedEmail || !password || !name || !normalizedRole) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        if (!['contributor', 'reviewer'].includes(normalizedRole)) {
            return res.status(400).json({ success: false, error: 'Invalid role' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            return res.status(409).json({ success: false, error: 'Email already exists' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email: normalizedEmail,
                password_hash,
                role: normalizedRole,
                phone: phone || null
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                created_at: true
            }
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email ? email.trim().toLowerCase() : '';

        if (!normalizedEmail || !password) {
            return res.status(400).json({ success: false, error: 'Missing credentials' });
        }

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

module.exports = { register, login };
