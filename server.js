const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

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