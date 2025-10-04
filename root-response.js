// Add this after the adminAuth middleware
app.get('/', (req, res) => {
    res.json({ 
        status: 'API Server Running',
        message: 'This is the backend API server. Use the frontend for marketing.',
        version: '1.0.0'
    });
});

app.get('/signup', (req, res) => {
    res.redirect('https://your-marketing-site.netlify.app/');
});
