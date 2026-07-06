// Authentication System
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.users = this.loadUsers();
        this.init();
    }

    init() {
        // Check if user is already logged in
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.showApp();
            } catch (e) {
                localStorage.removeItem('currentUser');
            }
        }
    }

    loadUsers() {
        const users = localStorage.getItem('users');
        return users ? JSON.parse(users) : {};
    }

    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    hashPassword(password) {
        // Simple hash function - in production, use a proper hashing library
        return CryptoJS.SHA256(password).toString();
    }

    generateSalt() {
        return CryptoJS.lib.WordArray.random(128/8).toString();
    }

    hashPasswordWithSalt(password, salt) {
        return CryptoJS.SHA256(password + salt).toString();
    }

    async register() {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!email || !password || !confirmPassword) {
            this.showError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            this.showError('Password must be at least 8 characters long');
            return;
        }

        if (this.users[email]) {
            this.showError('User already exists');
            return;
        }

        const salt = this.generateSalt();
        const hashedPassword = this.hashPasswordWithSalt(password, salt);

        this.users[email] = {
            email,
            password: hashedPassword,
            salt,
            createdAt: new Date().toISOString(),
            scans: []
        };

        this.saveUsers();
        this.showSuccess('Registration successful! Please log in.');
        
        // Clear form
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('confirm-password').value = '';
    }

    async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        const user = this.users[email];
        if (!user) {
            this.showError('Invalid email or password');
            return;
        }

        const hashedPassword = this.hashPasswordWithSalt(password, user.salt);
        if (hashedPassword !== user.password) {
            this.showError('Invalid email or password');
            return;
        }

        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.showApp();
    }

    async webauthnRegister() {
        if (!window.PublicKeyCredential) {
            this.showError('WebAuthn is not supported in this browser');
            return;
        }

        try {
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: challenge,
                    rp: {
                        name: "Privacy-First Digital Identity Monitor",
                        id: window.location.hostname,
                    },
                    user: {
                        id: new TextEncoder().encode(this.generateUserId()),
                        name: "user@example.com",
                        displayName: "User",
                    },
                    pubKeyCredParams: [{alg: -7, type: "public-key"}],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                    },
                    timeout: 60000,
                    attestation: "direct"
                }
            });

            // Store credential for this user
            const email = prompt('Enter your email for WebAuthn registration:');
            if (!email) return;

            if (!this.users[email]) {
                this.users[email] = {
                    email,
                    webauthnCredential: credential,
                    createdAt: new Date().toISOString(),
                    scans: []
                };
            } else {
                this.users[email].webauthnCredential = credential;
            }

            this.saveUsers();
            this.showSuccess('WebAuthn registration successful!');
        } catch (error) {
            console.error('WebAuthn registration failed:', error);
            this.showError('WebAuthn registration failed');
        }
    }

    async webauthnLogin() {
        if (!window.PublicKeyCredential) {
            this.showError('WebAuthn is not supported in this browser');
            return;
        }

        try {
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const credential = await navigator.credentials.get({
                publicKey: {
                    challenge: challenge,
                    timeout: 60000,
                    rpId: window.location.hostname,
                    allowCredentials: [], // In a real app, you'd specify allowed credentials
                }
            });

            // Find user by credential
            const email = prompt('Enter your email for WebAuthn login:');
            if (!email) return;

            const user = this.users[email];
            if (!user || !user.webauthnCredential) {
                this.showError('No WebAuthn credential found for this email');
                return;
            }

            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.showApp();
        } catch (error) {
            console.error('WebAuthn login failed:', error);
            this.showError('WebAuthn login failed');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.showAuth();
    }

    showAuth() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('app-section').classList.add('hidden');
    }

    showApp() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('app-section').classList.remove('hidden');
        
        if (this.currentUser) {
            document.getElementById('user-email').textContent = this.currentUser.email;
        }
    }

    generateUserId() {
        return Math.random().toString(36).substring(2, 15);
    }

    showError(message) {
        // Simple error display - in production, use a proper notification system
        alert('Error: ' + message);
    }

    showSuccess(message) {
        // Simple success display - in production, use a proper notification system
        alert('Success: ' + message);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    updateUser(userData) {
        if (this.currentUser) {
            Object.assign(this.currentUser, userData);
            this.users[this.currentUser.email] = this.currentUser;
            this.saveUsers();
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        }
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Tab switching
function showTab(tabName) {
    // Remove active class from all tabs and forms
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    // Add active class to selected tab and form
    event.target.classList.add('active');
    document.getElementById(tabName + '-form').classList.add('active');
}

// Auth functions
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
