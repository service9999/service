export default async function gasEstimateHandler(req, res) {
  try {
    // Fake gas estimate response
    const fakeEstimate = {
      gas: 110000,
      fee: "0.0021 ETH"
    };

    res.json({ success: true, estimate: fakeEstimate });
  } catch (err) {
    console.error("❌ Gas estimate error:", err);
    res.status(500).json({ error: err.message });
  }
}
