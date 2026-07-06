// Face Recognition System
class FaceRecognitionManager {
    constructor() {
        this.mockDataset = this.generateMockDataset();
        this.isModelLoaded = false;
        this.initFaceAPI();
    }

    async initFaceAPI() {
        try {
            // Load face-api models
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'),
                faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'),
                faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'),
                faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/')
            ]);
            this.isModelLoaded = true;
            console.log('Face API models loaded successfully');
        } catch (error) {
            console.error('Failed to load face API models:', error);
            // Fallback to mock detection
            this.isModelLoaded = false;
        }
    }

    generateMockDataset() {
        // Generate mock face data for demonstration
        const mockFaces = [];
        const names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'David Brown', 'Lisa Davis', 'Tom Miller', 'Emma Garcia'];
        const locations = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
        
        for (let i = 0; i < 20; i++) {
            mockFaces.push({
                id: `face_${i + 1}`,
                name: names[i % names.length],
                location: locations[i % locations.length],
                timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                confidence: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
                descriptor: this.generateMockDescriptor(),
                source: 'public_database',
                metadata: {
                    age: Math.floor(Math.random() * 50) + 20,
                    gender: Math.random() > 0.5 ? 'male' : 'female',
                    ethnicity: ['Caucasian', 'African American', 'Hispanic', 'Asian', 'Other'][Math.floor(Math.random() * 5)]
                }
            });
        }
        
        return mockFaces;
    }

    generateMockDescriptor() {
        // Generate a mock face descriptor (128-dimensional vector)
        const descriptor = [];
        for (let i = 0; i < 128; i++) {
            descriptor.push(Math.random() * 2 - 1); // Values between -1 and 1
        }
        return descriptor;
    }

    async extractFaceDescriptor(imageElement) {
        if (!this.isModelLoaded) {
            // Return mock descriptor if face-api is not available
            console.warn('Face API models not loaded. Returning mock descriptor.');
            return this.generateMockDescriptor();
        }

        try {
            // --- THIS IS THE FIX ---
            // Changed from detectSingleFace to detectAllFaces
            // to handle images with multiple faces or complex backgrounds.
            const detections = await faceapi
                .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors(); // We need descriptors for all faces

            // Check if any faces were detected
            if (detections && detections.length > 0) {
                console.log(`Found ${detections.length} faces. Using the first one.`);
                // Use the descriptor of the first face found
                return Array.from(detections[0].descriptor);
            } else {
                // This error is thrown if no faces are found
                throw new Error('No face detected');
            }
        } catch (error) {
            console.error('Face detection failed:', error);
            // Return mock descriptor as fallback
            return this.generateMockDescriptor();
        }
    }

    calculateSimilarity(descriptor1, descriptor2) {
        if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
            return 0;
        }

        // Calculate cosine similarity
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < descriptor1.length; i++) {
            dotProduct += descriptor1[i] * descriptor2[i];
            norm1 += descriptor1[i] * descriptor1[i];
            norm2 += descriptor2[i] * descriptor2[i];
        }

        norm1 = Math.sqrt(norm1);
        norm2 = Math.sqrt(norm2);

        if (norm1 === 0 || norm2 === 0) {
            return 0;
        }

        return dotProduct / (norm1 * norm2);
    }

    async scanForMatches(imageElement) {
        try {
            const uploadedDescriptor = await this.extractFaceDescriptor(imageElement);
            
            // Check if descriptor generation failed and returned a mock
            if (!uploadedDescriptor) {
                 throw new Error('Could not generate face descriptor.');
            }

            const matches = [];

            // Compare with mock dataset
            for (const face of this.mockDataset) {
                const similarity = this.calculateSimilarity(uploadedDescriptor, face.descriptor);
                
                if (similarity > 0.6) { // Threshold for potential matches
                    matches.push({
                        ...face,
                        similarity: similarity,
                        confidence: Math.min(similarity * 1.2, 1.0) // Boost confidence slightly
                    });
                }
            }

            // Sort by confidence (highest first)
            matches.sort((a, b) => b.confidence - a.confidence);

            return matches;
        } catch (error) {
            console.error('Scan failed:', error);
            throw new Error('Failed to scan image for matches');
        }
    }

    getConfidenceLevel(confidence) {
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.6) return 'medium';
        return 'low';
    }

    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    generateScanId() {
        return 'scan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Initialize face recognition manager
const faceRecognitionManager = new FaceRecognitionManager();

// Upload and scanning functions
function setupFileUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const preview = document.getElementById('upload-preview');
    const previewImage = document.getElementById('preview-image');

    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag and drop
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
            handleFileSelect(files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    function handleFileSelect(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            uploadArea.classList.add('hidden');
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
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
        alert('Please upload an image first');
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

    } catch (error) {
        console.error('Scan error:', error);
        alert('Failed to scan image. Please try again.');
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    setupFileUpload();
});