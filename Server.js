import bls from "@chainsafe/bls/blst-native";
import blake3 from 'blake3';
// import { ethers } from "ethers";
import express from "express";
import net from 'net';
// import abi from './artifacts/contracts/BPRSec.sol/BPRSec.json'assert { type: 'json' }

let app = express();


// const provider = new ethers.JsonRpcProvider("http://localhost:8545")

// const signer = new ethers.Wallet("0cb0ecd4f01a39ffbe8e8e7f750d4744c70dd27a4472fcc54f27046e138e1157", provider);

// const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);

const secretKey = bls.SecretKey.fromKeygen();

const publicKey = secretKey.toPublicKey();

const blocks = {}

const currentAddress = "192.168.45.67"

const server = net.createServer((socket) => {
    console.log('Client connected');
    socket.on('data', async (data) => {
        // const msg = JSON.parse(data.toString())
        // console.log(msg.publicKey, msg.hash, msg.signature)
        // console.log(bls.verify(msg.publicKey, msg.hash, msg.signature))
        onMessageRecieve(JSON.parse(data.toString()))
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
});

server.listen(8080, () => {
    console.log('Server listening on port 8080');
});


const onMessageSend = (msg) => {
    const signedMsg = signMsg(msg);
    if (signedMsg) {
        return signedMsg
    }
    return
}

const onMessageRecieve = async (msg) => {
    const isVerified = await verifyMsg(msg)

    if (isVerified) {
        // console.log({ isVerified })
    }
    else {
    }


}
const signMsg = (msg) => {
    const hash = blake3.hash(new TextEncoder().encode(JSON.stringify(msg?.message))).toString("hex");
    const signature = secretKey.sign(hash);
    msg.hash = hash;
    msg.signature = signature;
    msg.publicKey = publicKey;
    return msg;
}

const verifyMsg = async (msg) => {
    if (bls.verify(new Uint8Array([...Object.values(msg.publicKey)]), new Uint8Array([...Object.values(msg.hash)]), (new Uint8Array([...Object.values(msg.signature)])))) {
        msg.hash = parseInt(blake3.hash(new TextDecoder().decode(new Uint8Array([...Object.values(msg.hash)]))).toString("hex"), 16)
        if (blocks[msg.header.destination_address]) {
            blocks[msg.header.destination_address].thresh = (blocks[msg.header.destination_address].temp_blocks.reduce((acc, block) => acc + block.hash, 0)) / blocks[msg.header.destination_address].count
        }
        else {
            blocks[msg.header.destination_address] = {}
            blocks[msg.header.destination_address].count = 0
            blocks[msg.header.destination_address].hopArray = []
            blocks[msg.header.destination_address].temp_blocks = []
            blocks[msg.header.destination_address].thresh = msg.hash
        }
        if ((msg.hash <= blocks[msg.header.destination_address].thresh) && blocks[msg.header.destination_address].count < 10) {
            msg.root = true;
            // console.log("root")
            blocks[msg.header.destination_address].count++;
            blocks[msg.header.destination_address].hopArray.push({ [currentAddress]: blocks[msg.header.destination_address].hopArray[currentAddress] == 2 ? 1 : 1 });
            blocks[msg.header.destination_address].temp_blocks.push(msg);
            console.log(blocks[msg.header.destination_address].thresh)
        }
        else {
            msg.root = false
        }
        // console.log(blocks)
        // if (blocks[msg.header.destination_address].count == 10) {
        //     const block = {};
        //     block.data = blocks[msg.header.destination_address].temp_blocks
        //     block.timeStamp = new Date().getTime()
        //     block.signature = blake3.hash(blocks[msg.header.destination_address].data.map(block => block.hash).join(""))
        //     block.hopArray = blocks[msg.header.destination_address].hopArray;
        //     block.dest = msg.header.destination_address
        //     block.src = msg.src
        //     // await contract.save(block)
        //     blocks[msg.header.destination_address].count = 0
        // }
        if (msg.header.destination_address == currentAddress) {
            // await contract.distributeTokens(blocks[msg.header.destination_address].hopArray.map(hop => hop[hop.keys()[0]] == 1));
            blocks[msg.header.destination_address].hopArray.forEach((hop) => {
                hop[hop.keys()[0]] = 2
            });
        }
        return msg
    }
    else {
        return 0;
    }
}


app.get('/', function (req, res) {
    contract.getAllToken().then((data) =>
        res.send(data)
    )
}); 
