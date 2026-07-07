// Privacy and Security Manager
class PrivacyManager {
    constructor() {
        this.encryptionKey = this.generateEncryptionKey();
    }

    generateEncryptionKey() {
        // Generate a random encryption key
        return CryptoJS.lib.WordArray.random(256/8).toString();
    }

    encryptData(data) {
        try {
            const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), this.encryptionKey).toString();
            return encrypted;
        } catch (error) {
            console.error('Encryption failed:', error);
            return null;
        }
    }

    decryptData(encryptedData) {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey).toString(CryptoJS.enc.Utf8);
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }

    async deleteAllUserData() {
        const confirmed = confirm(
            'Are you sure you want to delete ALL your data? This action cannot be undone.\n\n' +
            'This will delete:\n' +
            '- All uploaded photos\n' +
            '- All scan results\n' +
            '- Your account information\n' +
            '- All stored data\n\n' +
            'Type "DELETE" to confirm:'
        );

        if (!confirmed) return;

        const confirmation = prompt('Type "DELETE" to confirm data deletion:');
        if (confirmation !== 'DELETE') {
            alert('Data deletion cancelled. You must type "DELETE" exactly to confirm.');
            return;
        }

        try {
            const currentUser = authManager.getCurrentUser();
            if (currentUser) {
                // Remove user from users database
                delete authManager.users[currentUser.email];
                authManager.saveUsers();
            }

            // Clear all local storage
            localStorage.clear();
            sessionStorage.clear();

            // Clear any cached data
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }

            alert('All your data has been permanently deleted.');
            location.reload();
        } catch (error) {
            console.error('Data deletion failed:', error);
            alert('Failed to delete data. Please try again.');
        }
    }

    async exportUserData() {
        try {
            console.log('Starting data export...');
            
            const currentUser = authManager.getCurrentUser();
            if (!currentUser) {
                alert('No user data found. Please log in first.');
                return;
            }

            console.log('Current user found:', currentUser.email);

            const exportData = {
                user: {
                    email: currentUser.email,
                    createdAt: currentUser.createdAt,
                    totalScans: currentUser.scans ? currentUser.scans.length : 0
                },
                scans: currentUser.scans || [],
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            console.log('Export data prepared:', exportData);

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            console.log('Blob created, size:', dataBlob.size);
            
            // Method 1: Try direct download
            try {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(dataBlob);
                link.download = `privacy-monitor-data-${new Date().toISOString().split('T')[0]}.json`;
                
                // Add to DOM temporarily
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                URL.revokeObjectURL(link.href);
                
                console.log('Export successful via direct download');
                
                // Show success message
                if (typeof appController !== 'undefined') {
                    appController.showNotification('Data exported successfully!', 'success');
                } else {
                    alert('Data exported successfully!');
                }
                
            } catch (downloadError) {
                console.error('Direct download failed:', downloadError);
                // Fallback: Try alternative method
                this.exportDataFallback(dataStr);
            }
            
        } catch (error) {
            console.error('Data export failed:', error);
            alert('Failed to export data. Please try again. Error: ' + error.message);
        }
    }

    // Fallback export method
    exportDataFallback(dataStr) {
        try {
            console.log('Using fallback export method...');
            
            // Create a text area with the data
            const textArea = document.createElement('textarea');
            textArea.value = dataStr;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    alert('Data copied to clipboard! You can paste it into a text file and save it.');
                } else {
                    throw new Error('Copy command failed');
                }
            } catch (copyError) {
                console.error('Copy failed:', copyError);
                // Last resort: show data in alert
                alert('Export failed. Here is your data (copy manually):\n\n' + dataStr.substring(0, 1000) + (dataStr.length > 1000 ? '...' : ''));
            }
            
            document.body.removeChild(textArea);
            
        } catch (fallbackError) {
            console.error('Fallback export failed:', fallbackError);
            alert('All export methods failed. Please try refreshing the page and try again.');
        }
    }

    // Secure data storage with encryption
    storeEncryptedData(key, data) {
        try {
            const encrypted = this.encryptData(data);
            if (encrypted) {
                localStorage.setItem(key, encrypted);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Secure storage failed:', error);
            return false;
        }
    }

    retrieveEncryptedData(key) {
        try {
            const encrypted = localStorage.getItem(key);
            if (encrypted) {
                return this.decryptData(encrypted);
            }
            return null;
        } catch (error) {
            console.error('Secure retrieval failed:', error);
            return null;
        }
    }
}

// PDF Report Generator
class PDFReportGenerator {
    constructor() {
        this.doc = null;
    }

    async generateReport() {
        try {
            // Check if jsPDF is available
            if (typeof window.jspdf === 'undefined') {
                alert('PDF generation library not loaded. Please refresh the page and try again.');
                return;
            }

            const currentUser = authManager.getCurrentUser();
            if (!currentUser || !currentUser.scans || currentUser.scans.length === 0) {
                alert('No scan data available to generate report');
                return;
            }

            // Show loading state
            const reportButton = document.getElementById('generate-report');
            const originalText = reportButton.textContent;
            reportButton.innerHTML = '<span class="loading"></span> Generating...';
            reportButton.disabled = true;

            // Create new PDF document
            const { jsPDF } = window.jspdf;
            this.doc = new jsPDF();
            
            // Add header
            this.addHeader();
            
            // Add user information
            // Get the most recent scan
            const latestScan = currentUser.scans[currentUser.scans.length - 1];
            if (!latestScan.matches || latestScan.matches.length === 0) {
                alert('No matches in the latest scan to generate report');
                return;
            }
            
            // Get the top match
            const match = latestScan.matches[0];
            
            this.doc = new window.jspdf.jsPDF();
            
            // 1. Header Background
            this.doc.setFillColor(30, 27, 75); // Dark purple #1E1B4B
            this.doc.rect(0, 0, 210, 40, 'F');
            
            // 2. Header Text
            this.doc.setTextColor(255, 255, 255);
            this.doc.setFontSize(22);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text('Digital Identity OSINT Report', 15, 25);
            
            // 3. Header Image (if available)
            if (latestScan.imageData) {
                try {
                    // Try to add the image in top right corner (approx 30x30)
                    this.doc.addImage(latestScan.imageData, 'JPEG', 165, 5, 30, 30);
                } catch (e) {
                    console.warn('Could not add image to PDF:', e);
                }
            }
            
            // 4. Metadata
            this.doc.setTextColor(100, 100, 100);
            this.doc.setFontSize(10);
            
            const generatedDate = new Date().toLocaleString();
            this.doc.text(`Generated Timestamp: ${generatedDate}`, 15, 50);
            this.doc.text(`Authorized Operator: ${currentUser.email}`, 15, 56);
            
            // Horizontal line
            this.doc.setDrawColor(220, 220, 220);
            this.doc.line(15, 62, 195, 62);
            
            // 5. Subject Profile Title
            this.doc.setTextColor(30, 27, 75); // Dark purple
            this.doc.setFontSize(14);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(`Subject Profile: ${match.name}`, 15, 75);
            
            // 6. Data Table
            const tableData = [
                ['Match Confidence', `${(match.confidence * 100).toFixed(1)}%`],
                ['Age Estimate', match.metadata ? match.metadata.age : 'N/A'],
                ['Gender', match.metadata ? match.metadata.gender : 'N/A'],
                ['Ethnicity', match.metadata ? match.metadata.ethnicity : 'N/A'],
                ['Location Found', match.location || 'N/A']
            ];
            
            if (match.socials) {
                if (match.socials.instagram) tableData.push(['Instagram', match.socials.instagram]);
                if (match.socials.facebook) tableData.push(['Facebook', match.socials.facebook]);
                if (match.socials.news) tableData.push(['News', match.socials.news]);
                if (match.socials.linkedin) tableData.push(['Wikipedia', match.socials.linkedin]);
            }
            
            this.doc.autoTable({
                startY: 85,
                head: [['OSINT Data Point', 'Extracted Information']],
                body: tableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [49, 46, 129], // Dark blue/purple #312E81
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'left'
                },
                bodyStyles: {
                    textColor: [50, 50, 50],
                    halign: 'left'
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 250] // Light gray #F8F9FA
                },
                columnStyles: {
                    0: { cellWidth: 60, fontStyle: 'normal' },
                    1: { cellWidth: 'auto' }
                },
                margin: { top: 85, left: 15, right: 15 }
            });
            
            this.doc.save(`osint-report-${match.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
            
            if (typeof appController !== 'undefined') {
                appController.showNotification('PDF Report generated successfully!', 'success');
            }
        } catch (error) {
            console.error('PDF generation failed:', error);
            if (typeof generateSimpleReport === 'function') {
                console.log('Falling back to simple text report');
                generateSimpleReport();
            } else {
                alert('Failed to generate report. Please try again.');
            }
        }
    }
}

// Initialize managers
const privacyManager = new PrivacyManager();
const pdfGenerator = new PDFReportGenerator();

// Debug function to check PDF library status
function checkPDFLibraryStatus() {
    console.log('Checking PDF library status...');
    console.log('jsPDF available:', typeof window.jspdf !== 'undefined');
    console.log('jsPDF version:', window.jspdf ? window.jspdf.jsPDF.version : 'Not available');
    console.log('PDF generator available:', typeof pdfGenerator !== 'undefined');
    
    if (typeof window.jspdf === 'undefined') {
        console.error('jsPDF library not loaded! Check network connection and CDN availability.');
        return false;
    }
    return true;
}

// Check library status when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkPDFLibraryStatus, 1000); // Check after 1 second to allow libraries to load
    setTimeout(checkExportCapabilities, 2000); // Check export capabilities after 2 seconds
});

// Debug function to check export capabilities
function checkExportCapabilities() {
    console.log('Checking export capabilities...');
    console.log('Blob support:', typeof Blob !== 'undefined');
    console.log('URL.createObjectURL support:', typeof URL !== 'undefined' && typeof URL.createObjectURL !== 'undefined');
    console.log('Document execCommand support:', typeof document.execCommand !== 'undefined');
    console.log('Clipboard API support:', typeof navigator.clipboard !== 'undefined');
    
    // Test blob creation
    try {
        const testBlob = new Blob(['test'], { type: 'text/plain' });
        console.log('Blob creation test:', testBlob.size > 0 ? 'SUCCESS' : 'FAILED');
    } catch (error) {
        console.error('Blob creation test failed:', error);
    }
    
    // Test URL creation
    try {
        const testBlob = new Blob(['test'], { type: 'text/plain' });
        const testUrl = URL.createObjectURL(testBlob);
        console.log('URL creation test:', testUrl ? 'SUCCESS' : 'FAILED');
        URL.revokeObjectURL(testUrl);
    } catch (error) {
        console.error('URL creation test failed:', error);
    }
}

// Global event handlers for privacy are in app.js

// Fallback PDF generation method
function generateSimpleReport() {
    try {
        const currentUser = authManager.getCurrentUser();
        if (!currentUser || !currentUser.scans || currentUser.scans.length === 0) {
            alert('No scan data available to generate report');
            return;
        }

        // Create a simple text report
        let reportContent = 'PRIVACY-FIRST DIGITAL IDENTITY MONITOR\n';
        reportContent += 'SCAN REPORT\n';
        
        // format date as YYYY-MM-DD HH:MM:SS
        const formatDateTime = (dateString) => {
            const d = new Date(dateString);
            return d.getFullYear() + '-' + 
                String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                String(d.getDate()).padStart(2, '0') + ' ' + 
                String(d.getHours()).padStart(2, '0') + ':' + 
                String(d.getMinutes()).padStart(2, '0') + ':' + 
                String(d.getSeconds()).padStart(2, '0');
        };
        
        reportContent += `Generated: ${formatDateTime(new Date().toISOString())}\n\n`;
        
        reportContent += 'USER INFORMATION\n';
        reportContent += `Email: ${currentUser.email}\n`;
        reportContent += `Account Created: ${formatDateTime(currentUser.createdAt)}\n`;
        reportContent += `Total Scans: ${currentUser.scans ? currentUser.scans.length : 0}\n\n`;
        
        reportContent += 'SCAN SUMMARY\n';
        const totalScans = currentUser.scans.length;
        const totalMatches = currentUser.scans.reduce((sum, scan) => sum + (scan.matches ? scan.matches.length : 0), 0);
        const highConfidenceMatches = currentUser.scans.reduce((sum, scan) => {
            return sum + (scan.matches ? scan.matches.filter(m => m.confidence >= 0.8).length : 0);
        }, 0);
        
        reportContent += `Total Scans Performed: ${totalScans}\n`;
        reportContent += `Total Matches Found: ${totalMatches}\n`;
        reportContent += `High Confidence Matches: ${highConfidenceMatches}\n\n`;
        
        reportContent += 'DETAILED SCAN RESULTS\n';
        currentUser.scans.forEach((scan, index) => {
            reportContent += `\nScan ${index + 1} - ${formatDateTime(scan.timestamp)}\n`;
            
            if (scan.matches && scan.matches.length > 0) {
                reportContent += `Matches Found: ${scan.matches.length}\n`;
                
                scan.matches.forEach((match, matchIndex) => {
                    reportContent += `${matchIndex + 1}. ${match.name} (${Math.round(match.confidence * 100)}% Match)\n`;
                    if (match.metadata) {
                        reportContent += `   Age: ${match.metadata.age}\n`;
                        reportContent += `   Gender: ${match.metadata.gender}\n`;
                        reportContent += `   Ethnicity: ${match.metadata.ethnicity}\n`;
                    }
                    reportContent += `   Found At: ${match.location}\n`;
                });
            } else {
                reportContent += 'No matches found\n';
            }
        });
        
        reportContent += '\n\nPRIVACY NOTICE\n';
        reportContent += 'This report contains sensitive information about your digital identity scans.\n';
        reportContent += 'Please keep this document secure and do not share it with unauthorized parties.\n';
        reportContent += 'All data is encrypted and stored securely. You can delete all your data at any time.\n';
        
        // Create and download text file
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `privacy-monitor-report-${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        
        if (typeof appController !== 'undefined') {
            appController.showNotification('Report generated successfully!', 'success');
        } else {
            alert('Text report generated successfully!');
        }
        
    } catch (error) {
        console.error('Simple report generation failed:', error);
        alert('Failed to generate report. Please try again.');
    }
}
