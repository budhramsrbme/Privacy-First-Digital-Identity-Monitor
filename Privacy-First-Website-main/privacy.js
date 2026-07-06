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
            if (typeof window.jsPDF === 'undefined') {
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
            this.doc = new window.jsPDF();
            
            // Add header
            this.addHeader();
            
            // Add user information
            this.addUserInfo(currentUser);
            
            // Add scan summary
            this.addScanSummary(currentUser.scans);
            
            // Add detailed scan results
            this.addDetailedResults(currentUser.scans);
            
            // Add privacy notice
            this.addPrivacyNotice();
            
            // Generate filename and download
            const filename = `privacy-monitor-report-${new Date().toISOString().split('T')[0]}.pdf`;
            this.doc.save(filename);
            
            // Reset button
            reportButton.textContent = originalText;
            reportButton.disabled = false;
            
            // Show success message
            if (typeof appController !== 'undefined') {
                appController.showNotification('PDF report generated successfully!', 'success');
            } else {
                alert('PDF report generated successfully!');
            }
            
        } catch (error) {
            console.error('PDF generation failed:', error);
            
            // Reset button
            const reportButton = document.getElementById('generate-report');
            reportButton.textContent = 'Generate Report';
            reportButton.disabled = false;
            
            alert('Failed to generate PDF report. Please try again. Error: ' + error.message);
        }
    }

    addHeader() {
        this.doc.setFontSize(20);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Privacy-First Digital Identity Monitor', 20, 30);
        
        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text('Scan Report', 20, 40);
        
        this.doc.setFontSize(10);
        this.doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 50);
        
        // Add line separator
        this.doc.line(20, 55, 190, 55);
    }

    addUserInfo(user) {
        let yPos = 70;
        
        this.doc.setFontSize(14);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('User Information', 20, yPos);
        
        yPos += 10;
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(`Email: ${user.email}`, 20, yPos);
        
        yPos += 8;
        this.doc.text(`Account Created: ${new Date(user.createdAt).toLocaleString()}`, 20, yPos);
        
        yPos += 8;
        this.doc.text(`Total Scans: ${user.scans ? user.scans.length : 0}`, 20, yPos);
        
        yPos += 15;
        this.doc.line(20, yPos, 190, yPos);
    }

    addScanSummary(scans) {
        let yPos = 110;
        
        this.doc.setFontSize(14);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Scan Summary', 20, yPos);
        
        yPos += 10;
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        
        const totalScans = scans.length;
        const totalMatches = scans.reduce((sum, scan) => sum + (scan.matches ? scan.matches.length : 0), 0);
        const highConfidenceMatches = scans.reduce((sum, scan) => {
            return sum + (scan.matches ? scan.matches.filter(m => m.confidence >= 0.8).length : 0);
        }, 0);
        
        this.doc.text(`Total Scans Performed: ${totalScans}`, 20, yPos);
        yPos += 8;
        this.doc.text(`Total Matches Found: ${totalMatches}`, 20, yPos);
        yPos += 8;
        this.doc.text(`High Confidence Matches: ${highConfidenceMatches}`, 20, yPos);
        
        yPos += 15;
        this.doc.line(20, yPos, 190, yPos);
    }

    addDetailedResults(scans) {
        let yPos = 150;
        
        this.doc.setFontSize(14);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Detailed Scan Results', 20, yPos);
        
        yPos += 15;
        
        scans.forEach((scan, index) => {
            if (yPos > 250) {
                this.doc.addPage();
                yPos = 20;
            }
            
            this.doc.setFontSize(12);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(`Scan ${index + 1} - ${new Date(scan.timestamp).toLocaleString()}`, 20, yPos);
            
            yPos += 8;
            this.doc.setFontSize(10);
            this.doc.setFont('helvetica', 'normal');
            
            if (scan.matches && scan.matches.length > 0) {
                this.doc.text(`Matches Found: ${scan.matches.length}`, 20, yPos);
                yPos += 6;
                
                scan.matches.forEach((match, matchIndex) => {
                    if (yPos > 270) {
                        this.doc.addPage();
                        yPos = 20;
                    }
                    
                    this.doc.text(`${matchIndex + 1}. ${match.name} (${Math.round(match.confidence * 100)}% confidence)`, 30, yPos);
                    yPos += 5;
                    this.doc.text(`   Location: ${match.location}`, 30, yPos);
                    yPos += 5;
                    this.doc.text(`   Last Seen: ${new Date(match.timestamp).toLocaleString()}`, 30, yPos);
                    yPos += 5;
                });
            } else {
                this.doc.text('No matches found', 20, yPos);
            }
            
            yPos += 15;
        });
    }

    addPrivacyNotice() {
        const currentPage = this.doc.internal.getCurrentPageInfo().pageNumber;
        const totalPages = this.doc.internal.getNumberOfPages();
        
        if (currentPage < totalPages) {
            this.doc.addPage();
        }
        
        let yPos = 20;
        
        this.doc.setFontSize(14);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Privacy Notice', 20, yPos);
        
        yPos += 15;
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        
        const privacyText = [
            'This report contains sensitive information about your digital identity scans.',
            'Please keep this document secure and do not share it with unauthorized parties.',
            '',
            'Data Protection:',
            '• All uploaded images are encrypted and stored securely',
            '• Scan results are processed locally when possible',
            '• You can delete all your data at any time through the privacy controls',
            '• No data is shared with third parties without your explicit consent',
            '',
            'For questions about your privacy rights, please contact the application administrator.',
            '',
            'Report generated by Privacy-First Digital Identity Monitor',
            `Generated on: ${new Date().toLocaleString()}`
        ];
        
        privacyText.forEach(line => {
            this.doc.text(line, 20, yPos);
            yPos += 6;
        });
    }
}

// Initialize managers
const privacyManager = new PrivacyManager();
const pdfGenerator = new PDFReportGenerator();

// Debug function to check PDF library status
function checkPDFLibraryStatus() {
    console.log('Checking PDF library status...');
    console.log('jsPDF available:', typeof window.jsPDF !== 'undefined');
    console.log('jsPDF version:', window.jsPDF ? window.jsPDF.version : 'Not available');
    console.log('PDF generator available:', typeof pdfGenerator !== 'undefined');
    
    if (typeof window.jsPDF === 'undefined') {
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

// Privacy control functions
function deleteAllData() {
    privacyManager.deleteAllUserData();
}

function exportData() {
    privacyManager.exportUserData();
}

function generateReport() {
    // Try the main PDF generator first
    if (typeof pdfGenerator !== 'undefined') {
        pdfGenerator.generateReport();
    } else {
        // Fallback method
        generateSimpleReport();
    }
}

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
        reportContent += 'Scan Report\n';
        reportContent += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        reportContent += 'USER INFORMATION\n';
        reportContent += `Email: ${currentUser.email}\n`;
        reportContent += `Account Created: ${new Date(currentUser.createdAt).toLocaleString()}\n`;
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
            reportContent += `\nScan ${index + 1} - ${new Date(scan.timestamp).toLocaleString()}\n`;
            
            if (scan.matches && scan.matches.length > 0) {
                reportContent += `Matches Found: ${scan.matches.length}\n`;
                
                scan.matches.forEach((match, matchIndex) => {
                    reportContent += `${matchIndex + 1}. ${match.name} (${Math.round(match.confidence * 100)}% confidence)\n`;
                    reportContent += `   Location: ${match.location}\n`;
                    reportContent += `   Last Seen: ${new Date(match.timestamp).toLocaleString()}\n`;
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
        
        alert('Text report generated successfully!');
        
    } catch (error) {
        console.error('Simple report generation failed:', error);
        alert('Failed to generate report. Please try again.');
    }
}
