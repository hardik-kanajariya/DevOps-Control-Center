const { notarize } = require('@electron/notarize');

/**
 * macOS Notarization Script
 * Notarizes macOS applications for Gatekeeper approval
 */
exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context;

    console.log('🍎 Starting macOS notarization process...');

    if (electronPlatformName !== 'darwin') {
        console.log('⏭️ Skipping notarization: not building for macOS');
        return;
    }

    const appName = context.packager.appInfo.productFilename;
    const appPath = `${appOutDir}/${appName}.app`;

    console.log(`App path: ${appPath}`);

    const appleId = process.env.APPLE_ID;
    const appleIdPassword = process.env.APPLE_ID_PASSWORD;
    const teamId = process.env.APPLE_TEAM_ID;

    if (!appleId || !appleIdPassword || !teamId) {
        console.log('⚠️ Skipping notarization: Apple ID credentials not provided');
        console.log('Set APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID environment variables');
        return;
    }

    console.log('🔐 Apple ID credentials found, proceeding with notarization...');
    console.log(`Apple ID: ${appleId}`);
    console.log(`Team ID: ${teamId}`);

    try {
        console.log('📤 Uploading app for notarization...');

        await notarize({
            appBundleId: 'com.devopscontrol.center',
            appPath: appPath,
            appleId: appleId,
            appleIdPassword: appleIdPassword,
            teamId: teamId
        });

        console.log('✅ macOS application notarized successfully');
        console.log('🎉 Your app is now approved by Apple Gatekeeper');

    } catch (error) {
        console.error('❌ Failed to notarize macOS application:', error.message);

        // Provide helpful error messages
        if (error.message.includes('Invalid Apple ID')) {
            console.error('💡 Check your Apple ID credentials');
        }
        if (error.message.includes('Team ID')) {
            console.error('💡 Ensure your Team ID is correct');
        }
        if (error.message.includes('app-specific password')) {
            console.error('💡 Use an app-specific password, not your regular Apple ID password');
            console.error('💡 Generate one at: https://appleid.apple.com/account/manage');
        }

        throw error;
    }
};

// Export for direct usage
module.exports = exports.default;
