// backend/index.js
import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
export const io = new SocketIOServer(server);

// Basic middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Drainer SAAS Backend API",
    status: "running", 
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Uptime monitoring endpoint - keep server awake (for cron jobs)
app.get('/ping', (req, res) => {
  res.json({ 
    status: 'pong', 
    timestamp: new Date().toISOString(),
    server: 'drainer-saas',
    version: '1.0'
  });
});

// Route for /panel and /panel.html
app.get(["/panel", "/panel.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "panel.html"));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log("🚀 Server running on http://localhost:" + PORT);
});
