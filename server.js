const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PARTICIPANTS_FILE = path.join(DATA_DIR, 'participants.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// Load participants data
async function loadParticipants() {
    try {
        const data = await fs.readFile(PARTICIPANTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

// Save participants data
async function saveParticipants(participants) {
    await fs.writeFile(PARTICIPANTS_FILE, JSON.stringify(participants, null, 2));
}

// API Routes

// Get all participants (for admin panel)
app.get('/api/participants', async (req, res) => {
    try {
        const participants = await loadParticipants();
        res.json(participants);
    } catch (error) {
        console.error('Error loading participants:', error);
        res.status(500).json({ error: 'Failed to load participants' });
    }
});

// Create or update participant
app.post('/api/participants', async (req, res) => {
    try {
        const participantData = req.body;
        const participantId = participantData.participantId;
        
        if (!participantId) {
            return res.status(400).json({ error: 'Participant ID required' });
        }

        const participants = await loadParticipants();
        participants[participantId] = {
            ...participants[participantId],
            ...participantData,
            lastUpdated: new Date().toISOString()
        };

        await saveParticipants(participants);
        res.json({ success: true, participantId });
    } catch (error) {
        console.error('Error saving participant:', error);
        res.status(500).json({ error: 'Failed to save participant' });
    }
});

// Add session data for a participant
app.post('/api/participants/:id/sessions', async (req, res) => {
    try {
        const participantId = req.params.id;
        const sessionData = req.body;

        const participants = await loadParticipants();
        
        if (!participants[participantId]) {
            return res.status(404).json({ error: 'Participant not found' });
        }

        if (!participants[participantId].studyData) {
            participants[participantId].studyData = { sessions: [] };
        }
        
        if (!participants[participantId].studyData.sessions) {
            participants[participantId].studyData.sessions = [];
        }

        participants[participantId].studyData.sessions.push({
            ...sessionData,
            timestamp: new Date().toISOString()
        });

        participants[participantId].lastUpdated = new Date().toISOString();

        await saveParticipants(participants);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving session:', error);
        res.status(500).json({ error: 'Failed to save session' });
    }
});

// Get participant data
app.get('/api/participants/:id', async (req, res) => {
    try {
        const participantId = req.params.id;
        const participants = await loadParticipants();
        
        if (!participants[participantId]) {
            return res.status(404).json({ error: 'Participant not found' });
        }

        res.json(participants[participantId]);
    } catch (error) {
        console.error('Error loading participant:', error);
        res.status(500).json({ error: 'Failed to load participant' });
    }
});

// Authentication helpers
function generateSessionToken(participantId) {
    return crypto.randomBytes(32).toString('hex') + ':' + participantId + ':' + Date.now();
}

function hashPassword(password) {
    // Simple hash - in production, use bcrypt or similar
    return crypto.createHash('sha256').update(password + 'salt').digest('hex');
}

function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
}

// Authentication Routes

// Register new participant
app.post('/api/auth/register', async (req, res) => {
    try {
        const userData = req.body;
        const participants = await loadParticipants();
        
        // Check if participant already exists
        if (participants[userData.participantId]) {
            return res.status(400).json({ error: 'Participant ID already exists' });
        }
        
        // Hash the password
        const hashedPassword = hashPassword(userData.password);
        
        // Store participant data with hashed password
        participants[userData.participantId] = {
            ...userData,
            password: hashedPassword,
            registrationDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        await saveParticipants(participants);
        
        // Generate session token
        const token = generateSessionToken(userData.participantId);
        
        // Return success with token (don't send password back)
        const { password, ...userDataWithoutPassword } = participants[userData.participantId];
        
        res.json({
            success: true,
            token: token,
            userData: userDataWithoutPassword
        });
        
    } catch (error) {
        console.error('Error registering participant:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login participant
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const participants = await loadParticipants();
        
        // Find participant
        const participant = participants[username];
        if (!participant) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Verify password
        if (!verifyPassword(password, participant.password)) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Generate new session token
        const token = generateSessionToken(username);
        
        // Update last login
        participant.lastLogin = new Date().toISOString();
        await saveParticipants(participants);
        
        // Return success with token (don't send password back)
        const { password: _, ...userDataWithoutPassword } = participant;
        
        res.json({
            success: true,
            token: token,
            userData: userDataWithoutPassword
        });
        
    } catch (error) {
        console.error('Error logging in participant:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Verify session token
app.post('/api/auth/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.substring(7);
        const tokenParts = token.split(':');
        
        if (tokenParts.length !== 3) {
            return res.status(401).json({ error: 'Invalid token format' });
        }
        
        const participantId = tokenParts[1];
        const timestamp = parseInt(tokenParts[2]);
        
        // Check if token is too old (24 hours)
        const tokenAge = Date.now() - timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (tokenAge > maxAge) {
            return res.status(401).json({ error: 'Token expired' });
        }
        
        // Verify participant exists
        const participants = await loadParticipants();
        const participant = participants[participantId];
        
        if (!participant) {
            return res.status(401).json({ error: 'Participant not found' });
        }
        
        // Return participant data (without password)
        const { password, ...userDataWithoutPassword } = participant;
        
        res.json({
            valid: true,
            userData: userDataWithoutPassword
        });
        
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(500).json({ error: 'Token verification failed' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
async function startServer() {
    await ensureDataDir();
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Data stored in: ${DATA_DIR}`);
    });
}

startServer().catch(console.error);