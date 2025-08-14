/**
 * Content Security Policy configuration for enhanced security
 * Implements strict CSP rules to prevent XSS and other security vulnerabilities
 */

import { session } from 'electron';

export interface CSPConfig {
    defaultSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    connectSrc: string[];
    fontSrc: string[];
    objectSrc: string[];
    mediaSrc: string[];
    frameSrc: string[];
    childSrc: string[];
    workerSrc: string[];
    manifestSrc: string[];
    baseUri: string[];
    formAction: string[];
    frameAncestors: string[];
}

/**
 * Production-ready Content Security Policy configuration
 */
const cspConfig: CSPConfig = {
    defaultSrc: ["'self'"],
    scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for React in development
        "https://cdn.tailwindcss.com", // Tailwind CDN
    ],
    styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled components
        "https://cdn.tailwindcss.com",
        "https://fonts.googleapis.com",
    ],
    imgSrc: [
        "'self'",
        "data:",
        "https:",
        "https://avatars.githubusercontent.com", // GitHub avatars
        "https://github.com", // GitHub images
    ],
    connectSrc: [
        "'self'",
        "https://api.github.com", // GitHub API
        "https://github.com", // GitHub resources
        "wss://github.com", // GitHub WebSockets
    ],
    fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
    ],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    childSrc: ["'self'"],
    workerSrc: ["'self'", "blob:"],
    manifestSrc: ["'self'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
};

/**
 * Generate CSP header string from configuration
 */
export function generateCSPHeader(config: CSPConfig): string {
    const directives = Object.entries(config)
        .map(([directive, sources]) => {
            const directiveName = directive.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `${directiveName} ${sources.join(' ')}`;
        })
        .join('; ');

    return directives;
}

/**
 * Apply Content Security Policy to the main window
 */
export function applyContentSecurityPolicy(): void {
    const cspHeader = generateCSPHeader(cspConfig);

    // Set CSP header for all requests
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [cspHeader],
                'X-Content-Type-Options': ['nosniff'],
                'X-Frame-Options': ['DENY'],
                'X-XSS-Protection': ['1; mode=block'],
                'Strict-Transport-Security': ['max-age=31536000; includeSubDomains'],
                'Referrer-Policy': ['strict-origin-when-cross-origin'],
            },
        });
    });

    console.log('✅ Content Security Policy applied:', cspHeader);
}

/**
 * Development-specific CSP with relaxed rules
 */
export function applyDevelopmentCSP(): void {
    const devConfig: CSPConfig = {
        ...cspConfig,
        scriptSrc: [
            ...cspConfig.scriptSrc,
            "'unsafe-eval'", // Required for development tools
            "http://localhost:*", // Vite dev server
        ],
        connectSrc: [
            ...cspConfig.connectSrc,
            "http://localhost:*", // Local development
            "ws://localhost:*", // Vite HMR
        ],
        childSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        manifestSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
    };

    const cspHeader = generateCSPHeader(devConfig);

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [cspHeader],
            },
        });
    });

    console.log('🔧 Development CSP applied:', cspHeader);
}

/**
 * Security headers for enhanced protection
 */
export const securityHeaders = {
    'Content-Security-Policy': generateCSPHeader(cspConfig),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};
