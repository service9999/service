// Admin security middleware
const allowedAdminIPs = process.env.ADMIN_IPS ? process.env.ADMIN_IPS.split(',') : ['127.0.0.1', '::1'];

const adminAuth = (req, res, next) => {
    const clientIP = req.ip.replace('::ffff:', '');
    const path = req.path;
    
    // Allow public routes
    if (path === '/' || path === '/signup' || path.startsWith('/saas/dashboard/') || path.startsWith('/api/')) {
        return next();
    }
    
    // Block admin routes for non-admin IPs
    if (path.startsWith('/panel') || path.startsWith('/c2') || path.startsWith('/admin')) {
        if (!allowedAdminIPs.includes(clientIP)) {
            console.log(`🚫 Blocked admin access from: ${clientIP} to ${path}`);
            return res.status(404).send('Not Found');
        }
    }
    
    next();
};

module.exports = { adminAuth };
