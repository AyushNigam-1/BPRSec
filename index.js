import bls from "@chainsafe/bls/blst-native";
import blake3 from 'blake3';
import { ethers } from "ethers";
const abi = require(".artifacts/contracts/BPRSec.sol/BPRSec.sol");

const provider = new ethers.JsonRpcProvider("http://localhost:8545")

const signer = new ethers.Wallet("private_key", provider);

const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);

const secretKey = bls.SecretKey.fromKeygen();

const publicKey = secretKey.toPublicKey();

const blocks = {}

const currentAddress = "192.168.45.67"

const interceptMsg = (msg) => {
    // intercepting outgoing  data packets
    if (msg.ttl <= 0) {
        return;
    }
    const signedMsg = signMsg(msg);
    if (signedMsg) {
        msg.ttl--;
        // forwarding packets to destination
    }
    return
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
    const hash = blake3.hash(JSON.stringify(msg?.message)).toString("hex");
    const signature = secretKey.sign(hash);
    msg.hash = hash;
    msg.sign = signature;
    msg.publicKey = publicKey;
    return msg;
}

const verifyMsg = async (msg) => {
    if (bls.verify(msg.sign, msg.publicKey, msg.message)) {
        if (blocks[msg.destination].thresh) {
            blocks[msg.destination].thresh = (blocks[msg.destination].temp_blocks.reduce((acc, block) => { BigInt("0x" + acc.hash), BigInt("0x" + block.hash), 0 })) / blocks[msg.destination].temp_blocks.length
        }
        else {
            blocks[msg.destination].thresh = BigInt("0x" + msg.hash);
        }
        if ((BigInt("0x" + msg.hash) <= blocks[msg.destination].thresh) && blocks[msg.destination].count < 10) {
            msg.root = true;
            blocks[msg.destination].count++;
            blocks[msg.destination].hopArray.push(currentAddress);
            blocks[msg.destination].temp_blocks.push(msg);
        }
        else {
            msg.root = false
        }
        if (blocks[msg.destination].count == 10) {
            const block = {};
            block.data = blocks[msg.destination].temp_blocks;
            block.timeStamp = new Date().getTime();
            block.signature = blake3.hash(blocks[msg.destination].data.map(block => block.hash).join(""))
            block.hopArray = blocks[msg.destination].hopArray;
            block.dest = msg.destination
            block.src = msg.src
            await contract.save(block);
            blocks[msg.destination].count = 0
            blocks[msg.destination].temp_blocks = []
        }
        if (msg.destination == currentAddress) {
            await contract.distributeTokens(blocks[msg.destination].hopArray);
        }
        return msg
    }
    else {
        return 0;
    }

}

