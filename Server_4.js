import bls from "@chainsafe/bls";
import blake3 from 'blake3';
import { ethers } from "ethers";
import express from "express";
import net from 'net';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { abi } = require('./artifacts/contracts/BPRSec.sol/BPRSec.json');

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545/")

const signer = new ethers.Wallet("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", provider);

const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);

const secretKey = bls.SecretKey.fromKeygen();

let blocks = {}

let pendingTransactions = [];
let isSending = false;
let nonce = null;; // Initialize nonce
const currentAddress = "10.0.0.3"
const client = new net.Socket();

client.connect({ port: 8080 }, () => {
    client.on('data', async (data) => {
        console.log("data recieved Server_3",)
        const message = JSON.parse(data.toString());
        const redirectMsg = await onMessageRecieve(JSON.parse(message.msg))
        if (redirectMsg) {
            let nextClient = message.clients[Math.floor(Math.random() * message.clients.length)]
            message.clients = message.clients.filter(cli => cli != nextClient)
            client.write(JSON.stringify({ message: onMessageSend(redirectMsg), clients: message.clients, client: nextClient }))
        }
    });
})

const onMessageSend = (msg) => {
    const signedMsg = signMsg(msg);
    if (signedMsg) {
        return JSON.stringify(signedMsg)
    }
    return
}

const onMessageRecieve = async (msg) => {
    const verifiedMsg = await verifyMsg(msg)
    if (verifiedMsg && msg.ttl > 0) {
        --msg.ttl
        return verifiedMsg
    }
    else {
        return false
    }
}

const signMsg = (msg) => {
    const hash = new TextEncoder().encode(JSON.stringify(msg?.payload))
    const signature = bls.sign(secretKey.toBytes(), hash)
    msg.header.source_address = currentAddress
    msg.hash = hash
    msg.signature = signature
    msg.publicKey = bls.secretKeyToPublicKey(secretKey.toBytes())
    return msg
}

const verifyMsg = async (msg) => {
    if (bls.verify(new Uint8Array([...Object.values(msg.publicKey)]), new Uint8Array([...Object.values(msg.hash)]), (new Uint8Array([...Object.values(msg.signature)])))) {
        msg.hash = parseInt(blake3.hash(new TextDecoder().decode(new Uint8Array([...Object.values(msg.hash)]))).toString("hex"), 16)
        if (Object.keys(blocks).length) {
            blocks.thresh = (blocks.temp_blocks.reduce((acc, block) => acc + parseInt(blake3.hash(new TextDecoder().decode(new Uint8Array([...Object.values(block.hash)]))).toString("hex"), 16), 0)) / blocks.count
        }
        else {
            blocks.count = 0
            blocks.temp_blocks = []
            blocks.thresh = msg.hash
        }
        if (blocks.count < 10) {
            console.log("rootNode found", blocks.thresh)
            msg.hopArray.push({ addr: currentAddress, timeStamp: new Date().getTime() })
            msg.root = true;
            blocks.count++;
            blocks.temp_blocks.push(msg);
            console.log("thresh", blocks.thresh, "temp_blocks", blocks?.temp_blocks[blocks.count - 1]?.hash)
        }
        else {
            msg.root = false
        }
        if (msg.hash >= blocks.thresh && blocks.count == 10) {
            const block = {};
            console.log("msg -->", msg)
            block.data = blocks.temp_blocks.map(block => JSON.stringify({ src: block.header.source_address, dest: block.header.destination_address, payload: block.payload.timestamp, hopArray: block.hopArray, ttl: block.ttl }))
            block.src = msg.header.source_address
            block.dest = msg.header.destination_address
            block.timeStamp = JSON.stringify(new Date().getTime())
            block.signature = blake3.hash(blocks.temp_blocks.map(block => block.hash).join("")).toString('hex')
            block.hopArray = msg.hopArray;
            await sendTransaction(contract, 'save', block);
            blocks = {}
        }
        if (msg.header.destination_address == currentAddress) {
            console.log("Destination Reached")
            msg.ttl = 0
            if (msg.hopArray.length) {
                await sendTransaction(contract, 'distributeTokens', msg.hopArray.map(hop => hop.addr));
            }
        }
        return msg
    }
    else {
        return 0;
    }
}
async function sendTransaction(contract, methodName, args) {
    pendingTransactions.push({ contract, methodName, args });
    console.log(args)
    if (!isSending) {
        isSending = true;
        while (pendingTransactions.length > 0) {
            const { contract, methodName, args } = pendingTransactions.shift();
            try {
                if (nonce === null) {
                    nonce = await provider.getTransactionCount(signer.address);
                }
                const tx = await contract[methodName](args, { nonce: nonce });
                await tx.wait();
                nonce++;
            } catch (error) {
                console.error('Error sending transaction:', error);
                // Handle nonce-related errors here
                if (error.code === ethers.utils.Logger.errors.NONCE_EXPIRED) {
                    console.log('Nonce expired, retrying with incremented nonce...');
                    // Re-add the failed transaction to the pending transactions queue
                    pendingTransactions.unshift({ contract, methodName, args });
                    // Increment nonce for next retry
                    nonce++;
                }
            }
        }
        isSending = false;
    }
}
