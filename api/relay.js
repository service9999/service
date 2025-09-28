import { PERMIT2_ABI, PERMIT2_ADDRESS } from "./permit2Utils.js";
import dotenv from "dotenv"; // This will use dotenv@17.2.2
import Web3 from "web3"; // Add Web3 import

dotenv.config();

// Initialize Web3 properly
const web3 = new Web3(process.env.RPC_URL || "http://localhost:8545"); 

// Check if private key exists
if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY is missing in environment variables");
}

const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

export default async function relayHandler(req, res) {
  try {
    const { permit, spender, sigDeadline, signature } = req.body;
    
    // Validate required fields
    if (!permit || !spender || !sigDeadline || !signature) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    const contract = new web3.eth.Contract(PERMIT2_ABI, PERMIT2_ADDRESS);
    
    // Split signature safely
    let r, s, v;
    try {
        const splitSig = splitSignature(signature);
        r = splitSig.r;
        s = splitSig.s;
        v = splitSig.v;
    } catch (sigError) {
        return res.status(400).json({ error: "Invalid signature format" });
    }

    try {
        const tx = contract.methods.permitTransferFrom(
            permit,
            spender,
            sigDeadline,
            v,
            r,
            s
        );

        const gas = await tx.estimateGas({ from: account.address });
        const gasPrice = await web3.eth.getGasPrice();
        
        const receipt = await tx.send({
            from: account.address,
            gas,
            gasPrice
        });
        
        console.log(`✅ Relay successful: ${receipt.transactionHash}`);
        return res.json({ success: true, tx: receipt.transactionHash });
        
    } catch (txError) {
        console.error("❌ Transaction failed:", txError);
        return res.status(500).json({ error: txError.message });
    }
    
  } catch (err) {
    console.error("❌ Relay error:", err);
    return res.status(500).json({ error: err.message });
  }
}

function splitSignature(sig) {
    if (typeof sig !== 'string' || !sig.startsWith('0x') || sig.length !== 132) {
        throw new Error("Invalid signature format");
    }
    
    return {
        r: sig.slice(0, 66),
        s: "0x" + sig.slice(66, 130),
        v: parseInt(sig.slice(130, 132), 16)
    };
}
