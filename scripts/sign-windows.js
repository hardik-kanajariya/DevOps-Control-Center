const { execSync } = require('child_process');
const path = require('path');

/**
 * Windows Code Signing Script
 * Signs Windows executables using signtool
 */
exports.default = async function (configuration) {
    const { path: filePath } = configuration;
    const certificateFile = process.env.WIN_CSC_LINK;
    const certificatePassword = process.env.WIN_CSC_KEY_PASSWORD;
    const certificateSubjectName = process.env.WIN_CSC_NAME;
    const timestampUrl = process.env.WIN_TIMESTAMP_URL || 'http://timestamp.comodoca.com';

    console.log('🔏 Starting Windows code signing...');
    console.log(`File: ${filePath}`);

    try {
        // Check if certificate file exists
        if (certificateFile && !require('fs').existsSync(certificateFile)) {
            throw new Error(`Certificate file not found: ${certificateFile}`);
        }

        let command;
        const signtoolPath = 'signtool.exe';

        if (certificateFile) {
            // Sign with certificate file
            command = [
                signtoolPath,
                'sign',
                '/f', `"${certificateFile}"`,
                '/p', `"${certificatePassword}"`,
                '/tr', timestampUrl,
                '/td', 'sha256',
                '/fd', 'sha256',
                '/v',
                `"${path.resolve(filePath)}"`
            ].join(' ');
        } else if (certificateSubjectName) {
            // Sign with installed certificate
            command = [
                signtoolPath,
                'sign',
                '/n', `"${certificateSubjectName}"`,
                '/tr', timestampUrl,
                '/td', 'sha256',
                '/fd', 'sha256',
                '/v',
                `"${path.resolve(filePath)}"`
            ].join(' ');
        } else {
            console.log('⚠️ No certificate configuration found, skipping Windows signing');
            return;
        }

        console.log('🔧 Executing signing command...');
        execSync(command, { stdio: 'inherit' });
        console.log('✅ Windows executable signed successfully');

        // Verify signature
        const verifyCommand = `${signtoolPath} verify /pa /v "${path.resolve(filePath)}"`;
        try {
            execSync(verifyCommand, { stdio: 'inherit' });
            console.log('✅ Signature verification passed');
        } catch (verifyError) {
            console.warn('⚠️ Signature verification failed:', verifyError.message);
        }

    } catch (error) {
        console.error('❌ Failed to sign Windows executable:', error.message);

        // Provide helpful error messages
        if (error.message.includes('signtool')) {
            console.error('💡 Ensure Windows SDK is installed and signtool.exe is in PATH');
        }
        if (error.message.includes('certificate')) {
            console.error('💡 Check certificate file path and password');
        }

        throw error;
    }
};

// Export for direct usage
module.exports = exports.default;
