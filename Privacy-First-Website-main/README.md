# Privacy-First Digital Identity Monitor

A minimal web application that allows users to securely upload face photos and scan them against a mock dataset to identify potential matches, with strong privacy protections and data encryption.

## Features

### 🔐 Secure Authentication
- **Email/Password Authentication**: Traditional login with encrypted password storage
- **WebAuthn Support**: Passwordless authentication using biometrics or security keys
- **Secure Session Management**: Encrypted local storage with automatic cleanup

### 📸 Face Recognition
- **Secure Photo Upload**: Drag-and-drop or click-to-upload interface
- **Face Detection**: Uses Face-API.js for face detection and feature extraction
- **Similarity Matching**: Compares uploaded photos against a mock dataset
- **Confidence Scoring**: Provides confidence levels for each potential match

### 📊 Dashboard & Results
- **Clean Interface**: Modern, responsive design with intuitive navigation
- **Match Display**: Shows potential matches with confidence scores and metadata
- **Scan History**: Tracks all previous scans with timestamps
- **Real-time Updates**: Instant feedback during scanning process

### 📄 Report Generation
- **PDF Export**: Generate comprehensive reports of scan results
- **Detailed Information**: Includes user info, scan summary, and match details
- **Privacy Notice**: Built-in privacy information in reports

### 🛡️ Privacy & Security
- **Data Encryption**: All sensitive data is encrypted before storage
- **Local Processing**: Face recognition runs locally when possible
- **Data Deletion**: Complete data deletion functionality
- **Data Export**: Export all user data in JSON format
- **No Third-party Sharing**: All data stays local to the user's browser

## Getting Started

### Prerequisites
- Modern web browser with JavaScript enabled
- Internet connection (for loading external libraries)
- HTTPS connection (required for WebAuthn)

### Installation
1. Download all files to a local directory
2. Serve the files using a local web server (required for WebAuthn)
3. Open `index.html` in your browser

### Quick Setup with Python
```bash
# Navigate to the project directory
cd "Privacy-First Website"

# Start a simple HTTP server
python -m http.server 8000

# Open your browser to http://localhost:8000
```

## Usage

### 1. Authentication
- **Register**: Create a new account with email and password
- **Login**: Sign in with your credentials
- **WebAuthn**: Use biometric authentication (fingerprint, face, etc.)

### 2. Upload & Scan
- Click the upload area or drag-and-drop a face photo
- Supported formats: JPG, PNG, GIF, WebP
- Maximum file size: 10MB
- Click "Scan for Matches" to analyze the image

### 3. View Results
- Review potential matches with confidence scores
- High confidence (80%+): Red border
- Medium confidence (60-79%): Yellow border  
- Low confidence (60%+): Green border
- Each match shows location, timestamp, and metadata

### 4. Generate Reports
- Click "Generate Report" to create a PDF
- Report includes all scan results and privacy information
- Automatically downloads to your device

### 5. Privacy Controls
- **Export Data**: Download all your data as JSON
- **Delete All Data**: Permanently remove all stored information
- **Secure Storage**: All data is encrypted locally

## Technical Details

### Architecture
- **Frontend**: Pure HTML, CSS, JavaScript (no frameworks)
- **Authentication**: Custom implementation with WebAuthn support
- **Face Recognition**: Face-API.js library for face detection
- **Encryption**: CryptoJS for data encryption
- **PDF Generation**: jsPDF for report creation

### Security Features
- **Password Hashing**: SHA-256 with salt
- **Data Encryption**: AES encryption for sensitive data
- **Secure Storage**: Encrypted localStorage
- **Memory Management**: Automatic cleanup of sensitive data
- **HTTPS Required**: WebAuthn requires secure context

### Mock Dataset
The application includes a mock dataset of 20 synthetic face profiles with:
- Names and locations
- Timestamps and metadata
- Face descriptors for similarity comparison
- Demographic information (age, gender, ethnicity)

## Privacy Considerations

### Data Storage
- All data is stored locally in your browser
- No data is sent to external servers
- Face recognition runs locally when possible
- Encrypted storage prevents unauthorized access

### Data Deletion
- Complete data deletion removes all stored information
- Includes uploaded photos, scan results, and account data
- Cannot be undone - use with caution

### Limitations
- This is a demonstration application
- Mock dataset for testing purposes only
- Not suitable for production use without proper security review

## Browser Compatibility

### Supported Browsers
- Chrome 67+
- Firefox 60+
- Safari 13+
- Edge 79+

### Required Features
- JavaScript ES6+
- Local Storage
- File API
- Canvas API
- WebAuthn (for passwordless authentication)

## Development

### File Structure
```
Privacy-First Website/
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── auth.js            # Authentication system
├── face-recognition.js # Face detection and matching
├── privacy.js         # Privacy controls and PDF generation
└── app.js             # Main application controller
```

### Key Components
- **AuthManager**: Handles user authentication and session management
- **FaceRecognitionManager**: Manages face detection and similarity matching
- **PrivacyManager**: Handles data encryption and privacy controls
- **PDFReportGenerator**: Creates downloadable reports
- **AppController**: Main application logic and event handling

## Security Notes

⚠️ **Important**: This is a demonstration application. For production use:
- Implement proper server-side authentication
- Use secure face recognition APIs
- Add proper input validation and sanitization
- Implement rate limiting and abuse prevention
- Conduct security audits and penetration testing

## License

This project is for educational and demonstration purposes. Use at your own risk.

## Support

For questions or issues, please review the code comments or create an issue in the project repository.
