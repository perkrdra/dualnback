// Data Manager - Handles communication with the server
class DataManager {
    constructor() {
        this.baseUrl = window.location.origin;
        this.apiUrl = `${this.baseUrl}/api`;
        this.fallbackToLocalStorage = true;
    }

    // Check if server is available
    async isServerAvailable() {
        try {
            const response = await fetch(`${this.apiUrl}/health`);
            return response.ok;
        } catch {
            return false;
        }
    }

    // Save participant enrollment data
    async saveParticipant(participantData) {
        try {
            if (await this.isServerAvailable()) {
                const response = await fetch(`${this.apiUrl}/participants`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(participantData)
                });
                
                if (response.ok) {
                    console.log('Participant data saved to server');
                    return true;
                }
            }
        } catch (error) {
            console.warn('Failed to save to server:', error);
        }

        // Fallback to localStorage
        if (this.fallbackToLocalStorage) {
            try {
                localStorage.setItem('studyUserData', JSON.stringify(participantData));
                console.log('Participant data saved to localStorage (fallback)');
                return true;
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
            }
        }

        return false;
    }

    // Save session data
    async saveSession(participantId, sessionData) {
        try {
            if (await this.isServerAvailable()) {
                const response = await fetch(`${this.apiUrl}/participants/${participantId}/sessions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(sessionData)
                });
                
                if (response.ok) {
                    console.log('Session data saved to server');
                    return true;
                }
            }
        } catch (error) {
            console.warn('Failed to save session to server:', error);
        }

        // Fallback to localStorage
        if (this.fallbackToLocalStorage) {
            try {
                const userData = JSON.parse(localStorage.getItem('studyUserData') || '{}');
                if (!userData.studyData) userData.studyData = { sessions: [] };
                if (!userData.studyData.sessions) userData.studyData.sessions = [];
                
                userData.studyData.sessions.push({
                    ...sessionData,
                    timestamp: new Date().toISOString()
                });
                
                localStorage.setItem('studyUserData', JSON.stringify(userData));
                console.log('Session data saved to localStorage (fallback)');
                return true;
            } catch (error) {
                console.error('Failed to save session to localStorage:', error);
            }
        }

        return false;
    }

    // Load participant data
    async loadParticipant(participantId) {
        try {
            if (await this.isServerAvailable()) {
                const response = await fetch(`${this.apiUrl}/participants/${participantId}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log('Participant data loaded from server');
                    return data;
                }
            }
        } catch (error) {
            console.warn('Failed to load from server:', error);
        }

        // Fallback to localStorage
        if (this.fallbackToLocalStorage) {
            try {
                const data = localStorage.getItem('studyUserData');
                if (data) {
                    const userData = JSON.parse(data);
                    if (userData.participantId === participantId) {
                        console.log('Participant data loaded from localStorage (fallback)');
                        return userData;
                    }
                }
            } catch (error) {
                console.error('Failed to load from localStorage:', error);
            }
        }

        return null;
    }

    // Load all participants (admin only)
    async loadAllParticipants() {
        try {
            if (await this.isServerAvailable()) {
                const response = await fetch(`${this.apiUrl}/participants`);
                if (response.ok) {
                    const data = await response.json();
                    console.log('All participants loaded from server');
                    return data;
                }
            }
        } catch (error) {
            console.warn('Failed to load all participants from server:', error);
        }

        // Fallback to localStorage (limited to current user)
        if (this.fallbackToLocalStorage) {
            try {
                const data = localStorage.getItem('studyUserData');
                if (data) {
                    const userData = JSON.parse(data);
                    const fallbackData = {};
                    fallbackData[userData.participantId] = userData;
                    console.log('Participant data loaded from localStorage (fallback - limited)');
                    return fallbackData;
                }
            } catch (error) {
                console.error('Failed to load from localStorage:', error);
            }
        }

        return {};
    }

    // Sync localStorage data to server (migration helper)
    async syncLocalStorageToServer() {
        try {
            const userData = localStorage.getItem('studyUserData');
            if (userData && await this.isServerAvailable()) {
                const data = JSON.parse(userData);
                const response = await fetch(`${this.apiUrl}/participants`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    console.log('LocalStorage data synced to server');
                    return true;
                }
            }
        } catch (error) {
            console.error('Failed to sync to server:', error);
        }
        return false;
    }
}

// Global instance
window.dataManager = new DataManager();