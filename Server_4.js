import bls from "@chainsafe/bls/blst-native";
import blake3 from 'blake3';
import { ethers } from "ethers";
import express from "express";
import net from 'net';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { abi } = require('./artifacts/contracts/BPRSec.sol/BPRSec.json');

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545/")

const signer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

const contract = new ethers.Contract("0x359570B3a0437805D0a71457D61AD26a28cAC9A2", abi, signer);

const secretKey = bls.SecretKey.fromKeygen();

let blocks = {}

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
            blocks.thresh = (blocks.temp_blocks.reduce((acc, block) => acc + parseInt(blake3.hash(new TextDecoder().decode(new Uint8Array([...Object.values(block.hash)]))).toString("hex"), 16), 0)) / blocks.count / blocks.count
        }
        else {
            blocks.count = 0
            blocks.temp_blocks = []
            blocks.thresh = msg.hash
        }

        // if ((msg.hash >= blocks.thresh) && (msg.hash >= blocks.thresh / blocks.count) && blocks.count < 10) {
        if (blocks.count < 10) {
            console.log("rootNode found", blocks.thresh)
            msg.hopArray.push(currentAddress)
            msg.root = true;
            blocks.count++;
            // console.log("msg", msg)
            blocks.temp_blocks.push(msg);
            // console.log("thresh", blocks.thresh, "temp_blocks", blocks?.temp_blocks[blocks.count - 1]?.hash)
            // console.log("temp_blocks", blocks.temp_blocks)
        }
        else {
            msg.root = false
        }
        if (blocks.count == 10) {
            const block = {};
            block.data = blocks.temp_blocks.map(block => JSON.stringify({ src: block.header.source_address, dest: block.header.destination_address, payload: msg.payload.timestamp }))
            block.src = msg.header.source_address
            block.dest = msg.header.destination_address
            block.timeStamp = JSON.stringify(new Date().getTime())
            block.signature = blake3.hash(blocks.temp_blocks.map(block => block.hash).join("")).toString('hex')
            block.hopArray = msg.hopArray;
            // await contract.save(block)
            blocks = {}
        }
        if (msg.header.destination_address == currentAddress) {
            msg.ttl = 0
            console.log("Hop -->", msg.hopArray)
            if (msg.hopArray.length) {
                // await contract.distributeTokens(msg.hopArray);
            }
        }
        return msg
    }
    else {
        return 0;
    }
}
