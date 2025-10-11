// ES Modules Compatible RPC Suppression
console.log('🔇 RPC SUPPRESSION ACTIVATED - No more spam!');

// Hook into process errors globally (works with both CJS and ESM)
const originalError = console.error;
console.error = function(...args) {
    const msg = String(args[0] || '');
    if (msg.includes('JsonRpcProvider') || 
        msg.includes('ECONNREFUSED') || 
        msg.includes('network') || 
        msg.includes('cannot start up') ||
        msg.includes('failed to detect')) {
        return;
    }
    originalError.apply(console, args);
};

// Hook unhandled rejections
process.on('unhandledRejection', (reason) => {
    const reasonStr = String(reason || '');
    if (reasonStr.includes('JsonRpcProvider') || reasonStr.includes('ECONNREFUSED')) {
        return;
    }
    console.error('Unhandled Rejection:', reason);
});

// Also hook warnings that might contain RPC errors
const originalWarn = console.warn;
console.warn = function(...args) {
    const msg = String(args[0] || '');
    if (msg.includes('JsonRpcProvider') || msg.includes('network')) {
        return;
    }
    originalWarn.apply(console, args);
};
