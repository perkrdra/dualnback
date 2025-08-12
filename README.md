# UltimateBrain.io - Dual N-Back Study Platform

A web-based dual n-back cognitive training game with participant data collection for research studies.

## Features

- **Dual N-Back Game**: Position and letter matching cognitive training
- **Study Enrollment**: Participant registration system
- **Data Collection**: Session tracking and participant management
- **Admin Dashboard**: Real-time monitoring and data export
- **Server Storage**: Centralized data storage with localStorage fallback

## Setup Instructions

### 1. Install Dependencies

```bash
cd "/home/perkrdra/Prosjekter/Dual n back"
npm install
```

### 2. Start the Server

```bash
npm start
```

The server will run on `http://localhost:3000`

### 3. Access the Application

- **Main Game**: `http://localhost:3000/`
- **Study Enrollment**: `http://localhost:3000/study-enrollment.html`
- **Admin Panel**: `http://localhost:3000/admin-panel.html`

### Admin Credentials

- **Username**: `admin`
- **Password**: `ultimatebrain2025`

## Data Storage

### Server Mode (Recommended)
When the server is running, all participant data is stored in:
- Server: JSON files in `./data/participants.json`
- Automatic backup and centralized access
- Real-time admin dashboard updates

### Fallback Mode
If the server is unavailable, the system automatically falls back to:
- Browser localStorage (limited to individual users)
- Data sync when server becomes available

## API Endpoints

- `GET /api/participants` - Get all participants (admin)
- `POST /api/participants` - Create/update participant
- `POST /api/participants/:id/sessions` - Add session data
- `GET /api/participants/:id` - Get specific participant
- `GET /api/health` - Server health check

## File Structure

```
├── server.js              # Express server
├── data-manager.js        # Client-side data management
├── game.js                # Main game logic
├── index.html             # Game interface
├── admin-panel.html       # Administration dashboard
├── study-enrollment.html  # Participant enrollment
├── styles.css             # Styling
├── data/                  # Server data storage
│   └── participants.json  # Participant database
└── package.json           # Dependencies
```

## Development

For development with auto-restart:

```bash
npm run dev
```

## Data Export

The admin panel supports exporting participant data in:
- **CSV Format**: For statistical analysis
- **JSON Format**: For data backup and migration

## Security Notes

- Admin credentials are currently hardcoded (change for production)
- Server stores data in plain JSON files (consider database for production)
- No authentication beyond admin panel login
- CORS enabled for development (restrict for production)