import bls from "@chainsafe/bls/blst-native";
import blake3 from 'blake3';
import { ethers } from "ethers";
const abi = require(".artifacts/contracts/BPRSec.sol/BPRSec.sol");

const provider = new ethers.JsonRpcProvider("http://localhost:8545")

const signer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);

const thresh = BigInt("0x" + "f694a1eca435cc9a0af444f69830b5d480f8c9b01e2ce62bb720422fb0a5193e");

const secretKey = bls.SecretKey.fromKeygen();

const publicKey = secretKey.toPublicKey();

const blocks = {}

const currentAddress = "192.168.45.67"

const interceptMsg = (msg) => {
    // intercepting outgoing  data packets
    const signedMsg = signMsg(msg);
    if (signedMsg) {
        // forwarding packets to destination
    }
}

const receieveMsg = (msg) => {
    // intercepting incoming  data packets
    const isVerified = verifyMsg(msg)
    if (isVerified) {
        // let the packet come in 
    }
    else {
        // drop packet
    }
}

const signMsg = (msg) => {
    const hash = blake3.hash(JSON.stringify(msg)).toString("hex");
    const signature = secretKey.sign(hash);
    msg.hash = hash;
    msg.sign = signature;
    msg.publicKey = publicKey;
    return msg;
}

const verifyMsg = (msg) => {
    if (bls.verify(msg.signature, msg.publicKey, msg.message)) {
        if (BigInt("0x" + packet.hash) > thresh && blocks[msg.destination].count < 10) {
            msg.root = true;
            blocks[msg.destination].count++;
            blocks[msg.destination].hopArray.push(msg.source);
            blocks[msg.destination].temp_block.push(msg);
            return;
        }
        else {
            msg.root = false
        }
        if (blocks[msg.destination].count == 10) {
            const block = {};
            block.data = blocks[msg.destination].temp_block;
            block.timeStamp = new Date().getTime();
            block.hash = blake3.hash(JSON.stringify(block.data));
            // delete block[msg.destination].count;
            contract.save(blocks)
        }
        if (msg.destination == currentAddress) {
            contract.distributeTokens(blocks[msg.destination].hopArray)
        }
        return msg
    }
    else {
        return 0;
    }

}

