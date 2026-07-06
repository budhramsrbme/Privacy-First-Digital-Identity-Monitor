// Main Application Controller
class AppController {
    constructor() {
        this.init();
    }

    init() {
        // Initialize the application
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Global event listeners
        document.addEventListener('DOMContentLoaded', () => {
            this.onDOMReady();
        });

        // Handle page visibility changes for security
        document.addEventListener('visibilitychange', () => {
            this.onVisibilityChange();
        });

        // Handle beforeunload for data protection
        window.addEventListener('beforeunload', (e) => {
            this.onBeforeUnload(e);
        });
    }

    onDOMReady() {
        // Initialize file upload system
        this.setupFileUpload();
        
        // Check if user is authenticated
        this.checkAuthStatus();
        
        // Initialize any other components
        this.initializeComponents();
    }

    onVisibilityChange() {
        // If page becomes hidden, clear sensitive data from memory
        if (document.hidden) {
            this.clearSensitiveData();
        }
    }

    onBeforeUnload(e) {
        // Clear sensitive data before page unload
        this.clearSensitiveData();
    }

    checkAuthStatus() {
        const currentUser = authManager.getCurrentUser();
        if (currentUser) {
            this.showAuthenticatedState();
        } else {
            this.showUnauthenticatedState();
        }
    }

    showAuthenticatedState() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('app-section').classList.remove('hidden');
        
        const currentUser = authManager.getCurrentUser();
        if (currentUser) {
            document.getElementById('user-email').textContent = currentUser.email;
            this.loadUserData();
        }
    }

    showUnauthenticatedState() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('app-section').classList.add('hidden');
    }

    loadUserData() {
        const currentUser = authManager.getCurrentUser();
        if (currentUser && currentUser.scans && currentUser.scans.length > 0) {
            // Show the most recent scan results
            const latestScan = currentUser.scans[currentUser.scans.length - 1];
            displayScanResults(latestScan);
            
            // Enable report generation if there are scans
            document.getElementById('generate-report').disabled = false;
        }
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        const preview = document.getElementById('upload-preview');
        const previewImage = document.getElementById('preview-image');

        // Click to upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop handlers
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Store reference for external access
        this.handleFileSelect = this.handleFileSelect.bind(this);
    }

    handleFileSelect(file) {
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select an image file', 'error');
            return;
        }

        // Check file size (limit to 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('File size must be less than 10MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImage = document.getElementById('preview-image');
            previewImage.src = e.target.result;
            
            document.getElementById('upload-area').classList.add('hidden');
            document.getElementById('upload-preview').classList.remove('hidden');
            
            this.showNotification('Image uploaded successfully', 'success');
        };
        
        reader.onerror = () => {
            this.showNotification('Failed to read file', 'error');
        };
        
        reader.readAsDataURL(file);
    }

    initializeComponents() {
        // Initialize any additional components
        this.setupNotifications();
    }

    setupNotifications() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            const notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 300px;
            `;
            document.body.appendChild(notificationContainer);
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }

    clearSensitiveData() {
        // Clear any sensitive data from memory
        // This is called when the page becomes hidden or before unload
        const previewImage = document.getElementById('preview-image');
        if (previewImage && previewImage.src) {
            // Clear the image source to free memory
            previewImage.src = '';
        }
    }

    // Utility methods
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    generateSecureId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Global functions for HTML event handlers
function showTab(tabName) {
    // Remove active class from all tabs and forms
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    // Add active class to selected tab and form
    event.target.classList.add('active');
    document.getElementById(tabName + '-form').classList.add('active');
}

function register() {
    authManager.register();
}

function login() {
    authManager.login();
}

function webauthnRegister() {
    authManager.webauthnRegister();
}

function webauthnLogin() {
    authManager.webauthnLogin();
}

function logout() {
    authManager.logout();
}

function clearUpload() {
    document.getElementById('upload-area').classList.remove('hidden');
    document.getElementById('upload-preview').classList.add('hidden');
    document.getElementById('file-input').value = '';
}

async function scanImage() {
    const previewImage = document.getElementById('preview-image');
    const scanButton = document.querySelector('.preview-actions button:first-child');
    
    if (!previewImage.src) {
        appController.showNotification('Please upload an image first', 'error');
        return;
    }

    // Show loading state
    const originalText = scanButton.textContent;
    scanButton.innerHTML = '<span class="loading"></span> Scanning...';
    scanButton.disabled = true;

    try {
        const matches = await faceRecognitionManager.scanForMatches(previewImage);
        
        // Store scan results
        const scanResult = {
            id: faceRecognitionManager.generateScanId(),
            timestamp: new Date().toISOString(),
            imageData: previewImage.src,
            matches: matches,
            totalMatches: matches.length
        };

        // Update user's scan history
        const currentUser = authManager.getCurrentUser();
        if (currentUser) {
            currentUser.scans = currentUser.scans || [];
            currentUser.scans.push(scanResult);
            authManager.updateUser(currentUser);
        }

        // Display results
        displayScanResults(scanResult);
        
        // Enable report generation
        document.getElementById('generate-report').disabled = false;

        appController.showNotification(`Scan completed. Found ${matches.length} potential matches.`, 'success');

    } catch (error) {
        console.error('Scan error:', error);
        appController.showNotification('Failed to scan image. Please try again.', 'error');
    } finally {
        // Reset button
        scanButton.textContent = originalText;
        scanButton.disabled = false;
    }
}

function displayScanResults(scanResult) {
    const resultsContainer = document.getElementById('scan-results');
    
    if (scanResult.matches.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <h3>No Matches Found</h3>
                <p>No similar faces were found in our database.</p>
                <p>Scan completed at: ${faceRecognitionManager.formatTimestamp(scanResult.timestamp)}</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="scan-summary">
            <h3>Scan Results</h3>
            <p>Found ${scanResult.matches.length} potential match(es)</p>
            <p>Scan completed at: ${faceRecognitionManager.formatTimestamp(scanResult.timestamp)}</p>
        </div>
    `;

    scanResult.matches.forEach(match => {
        const confidenceLevel = faceRecognitionManager.getConfidenceLevel(match.confidence);
        const confidenceClass = confidenceLevel + '-confidence';
        
        html += `
            <div class="match-item ${confidenceClass}">
                <div class="match-header">
                    <span class="match-id">${match.name}</span>
                    <span class="confidence-score ${confidenceLevel}">
                        ${Math.round(match.confidence * 100)}% confidence
                    </span>
                </div>
                <div class="match-timestamp">
                    Last seen: ${faceRecognitionManager.formatTimestamp(match.timestamp)}
                </div>
                <div class="match-details">
                    <p><strong>Location:</strong> ${match.location}</p>
                    <p><strong>Source:</strong> ${match.source}</p>
                    <p><strong>Age:</strong> ${match.metadata.age} years old</p>
                    <p><strong>Gender:</strong> ${match.metadata.gender}</p>
                    <p><strong>Ethnicity:</strong> ${match.metadata.ethnicity}</p>
                </div>
            </div>
        `;
    });

    resultsContainer.innerHTML = html;
}

function generateReport() {
    pdfGenerator.generateReport();
}

function deleteAllData() {
    privacyManager.deleteAllUserData();
}

function exportData() {
    privacyManager.exportUserData();
}

// Initialize the application
const appController = new AppController();

// Add CSS for notifications
const notificationStyles = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);
