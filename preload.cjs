// RPC Suppression Preload Script - LOADS BEFORE YOUR APP
const originalError = console.error;
console.error = function(...args) {
    const msg = String(args[0] || '');
    if (msg.includes('JsonRpcProvider') || 
        msg.includes('ECONNREFUSED') || 
        msg.includes('network') || 
        msg.includes('cannot start up') ||
        msg.includes('failed to detect')) {
        return; // SILENCE RPC ERRORS
    }
    originalError.apply(console, args);
};

// Also suppress unhandled promise rejections from RPC
const originalEmit = process.emit;
process.emit = function(event, error) {
    if (event === 'unhandledRejection') {
        const errorMsg = String(error?.message || error || '');
        if (errorMsg.includes('JsonRpcProvider') || errorMsg.includes('ECONNREFUSED')) {
            return false; // SUPPRESS
        }
    }
    return originalEmit.apply(process, arguments);
};

console.log('🔇 RPC SUPPRESSION ACTIVATED - No more spam!');
