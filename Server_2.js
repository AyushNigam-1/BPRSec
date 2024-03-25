import bls from "@chainsafe/bls/blst-native";
import blake3 from 'blake3';
// import { ethers } from "ethers";
import express from "express";
import net from 'net';
import * as fs from 'fs'
let app = express();

// const abi = require(".artifacts/contracts/BPRSec.sol/BPRSec.sol");

// const provider = new ethers.JsonRpcProvider("http://localhost:8545")

// const signer = new ethers.Wallet("private_key", provider);

// const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);

const secretKey = bls.SecretKey.fromKeygen();

const blocks = {}

const currentAddress = "192.168.45.67"
const client = new net.Socket();

client.connect({ port: 8080, host: 'localhost' }, () => {
    client.on('data', (data) => {
        console.log("data recieved Server_2",)
        const message = JSON.parse(data.toString());
        const redirectMsg = onMessageRecieve(JSON.parse(message.msg))
        if (redirectMsg) {
            let client = message.clients[Math.floor(Math.random() * message.clients.length)]
            msg.clients = msg.clients.filter(cli => cli != client)
            client.write(JSON.stringify({ message: onMessageSend(redirectMsg), clients: msg.clients, client }))
        }
    });
})

// server.listen(8082, () => {
//     console.log('Server listening on port 8080');
// });


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
    msg.hash = hash
    msg.signature = signature
    msg.publicKey = bls.secretKeyToPublicKey(secretKey.toBytes())
    msg.ttl = 6
    return msg
}

const verifyMsg = async (msg) => {
    if (bls.verify(new Uint8Array([...Object.values(msg.publicKey)]), new Uint8Array([...Object.values(msg.hash)]), (new Uint8Array([...Object.values(msg.signature)])))) {
        msg.hash = parseInt(blake3.hash(new TextDecoder().decode(new Uint8Array([...Object.values(msg.hash)]))).toString("hex"), 16)
        if (Object.keys(blocks).length) {
            blocks.thresh = (blocks.temp_blocks.reduce((acc, block) => acc + block.hash, 0)) / blocks.count
        }
        else {
            blocks.count = 0
            blocks.hopArray = []
            blocks.temp_blocks = []
            blocks.thresh = msg.hash
        }
        if ((msg.hash >= blocks.thresh) && blocks.count < 10) {
            msg.root = true;
            blocks.count++;
            blocks.hopArray.push({
                [msg.header.destination_address]: 0
            });
            blocks.temp_blocks.push(msg);
        }
        else {
            msg.root = false
        }
        if (blocks.count == 10) {
            const block = {};
            block.data = blocks.temp_blocks.map(block => JSON.stringify(block))
            block.src = msg.header.source_address
            block.dest = msg.header.destination_address
            block.timeStamp = JSON.stringify(new Date().getTime())
            block.signature = blake3.hash(blocks.temp_blocks.map(block => block.hash).join("")).toString('hex')
            block.hopArray = blocks.hopArray.map(hop => Object.keys(hop)[0]);
            await contract.save(block)
            blocks = {}
        }
        if (msg.header.destination_address == currentAddress) {
            msg.ttl = 0
            console.log("Hop -->", blocks.hopArray.filter(obj => Object.values(obj)[0] === 0).map(obj => Object.keys(obj)[0]))
            if (blocks.hopArray.length) {
                await contract.distributeTokens(blocks.hopArray.filter(obj => Object.values(obj)[0] === 0).map(obj => Object.keys(obj)[0]));
                blocks.hopArray.forEach((hop) => {
                    hop[Object.keys(hop)[0]] = 1
                });
            }
        }
        return msg
    }
    else {
        return 0;
    }
}
