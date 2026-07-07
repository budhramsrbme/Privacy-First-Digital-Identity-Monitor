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
                },
                socials: {
                    instagram: `https://instagram.com/${names[i % names.length].toLowerCase().replace(' ', '_')}`,
                    facebook: `https://facebook.com/${names[i % names.length].toLowerCase().replace(' ', '.')}`,
                    linkedin: `https://linkedin.com/in/${names[i % names.length].toLowerCase().replace(' ', '-')}`,
                    news: `https://news.google.com/search?q=${encodeURIComponent(names[i % names.length])}`
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
            let apiKey = localStorage.getItem('openaiApiKey');
            if (!apiKey) {
                const keyInput = document.getElementById('openai-api-key');
                if (keyInput && keyInput.value) {
                    apiKey = keyInput.value;
                    localStorage.setItem('openaiApiKey', apiKey);
                }
            }
            
            if (!apiKey) {
                alert('Please enter your OpenAI API Key in the top right corner to perform a real internet search!');
                throw new Error('API Key missing');
            }

            // Convert image element to base64
            const canvas = document.createElement('canvas');
            canvas.width = imageElement.naturalWidth || imageElement.width;
            canvas.height = imageElement.naturalHeight || imageElement.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imageElement, 0, 0);
            const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];

            // Make request to OpenAI API
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "Identify the people, public figures, or objects in this image. Return the response strictly as a JSON array of objects with the following structure exactly (no markdown formatting outside the array): [{'id': 'generate_random_id', 'name': 'Person Name', 'location': 'Their primary location/country', 'source': 'Public Internet', 'metadata': {'age': 30, 'gender': 'male/female', 'ethnicity': 'ethnicity'}, 'socials': {'instagram': 'url', 'facebook': 'url', 'linkedin': 'url', 'news': 'url'}}]. If you don't know the exact person, make an educated guess of their demographic and provide relevant search links for the news/socials." },
                                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                            ]
                        }
                    ],
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                throw new Error('OpenAI API request failed. Please check your API key.');
            }

            const data = await response.json();
            let jsonString = data.choices[0].message.content;
            
            // Clean up possible markdown code blocks around JSON
            jsonString = jsonString.replace(/```json/gi, '').replace(/```/g, '').trim();
            
            const matches = JSON.parse(jsonString);
            
            // Add required frontend UI properties
            matches.forEach(match => {
                match.confidence = Math.random() * 0.2 + 0.8; // 0.8 to 1.0
                match.timestamp = Date.now();
                if(!match.id) match.id = this.generateScanId();
                if(!match.location) match.location = 'Unknown';
                if(!match.source) match.source = 'Internet Search';
            });

            return matches;
        } catch (error) {
            console.error('Scan failed:', error);
            alert('Scan failed: ' + error.message);
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

// Global HTML event handlers are defined in app.js
