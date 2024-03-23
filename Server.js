import bls from "@chainsafe/bls/blst-native";
import blake3 from 'blake3';
import { ethers } from "ethers";
import express from "express";
import net from 'net';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { abi } = require('./artifacts/contracts/BPRSec.sol/BPRSec.json');

let app = express();

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545/")

const signer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

const contract = new ethers.Contract("0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e", abi, signer);

const secretKey = bls.SecretKey.fromKeygen();

let blocks = {}

const currentAddress = "10.0.0.3"
// const app = net.createServer((socket) => {
//     console.log('Client connected');
//     socket.on('data', async (data) => {
//         onMessageRecieve(JSON.parse(data.toString()))
//     });

//     socket.on('error', (err) => {
//         console.error('Socket error:', err);
//     });
// });
// const server = new express()
app.listen(8080, () => {
    console.log('Server listening on port 8080');
});


const onMessageSend = (msg) => {
    const signedMsg = signMsg(msg);
    if (signedMsg) {
        return JSON.stringify(signedMsg)
    }
    return
}

const onMessageRecieve = async (msg) => {
    const isVerified = await verifyMsg(msg)
    if (isVerified) {
        console.log("blocks", blocks)
        // console.log({ isVerified })
    }
    else {
    }


}
const signMsg = (msg) => {
    const hash = new TextEncoder().encode(JSON.stringify(msg?.payload));
    const signature = bls.sign(secretKey.toBytes(), hash);
    msg.hash = hash;
    msg.signature = signature;
    msg.publicKey = bls.secretKeyToPublicKey(secretKey.toBytes());
    return msg;
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
            console.log("Hop -->", blocks.hopArray.filter(obj => Object.values(obj)[0] === 0).map(obj => Object.keys(obj)[0]))
            if (blocks.hopArray.length) {
                await contract.distributeTokens(blocks.hopArray.filter(obj => Object.values(obj)[0] === 0).map(obj => Object.keys(obj)[0]));
                blocks.hopArray.forEach((hop) => {
                    hop[Object.keys(hop)[0]] == 1
                });
            }
        }
        return msg
    }
    else {
        return 0;
    }
}


app.get('/', function (req, res) {
    contract.getAllNodes().then((data) =>
        console.log(data)
    )
}); 
