import bls from "@chainsafe/bls";
import blake3 from 'blake3';
import { ethers } from "ethers";
import express from "express";
import net from 'net';
import { createRequire } from 'module';
import * as fs from 'fs'
const require = createRequire(import.meta.url);
const { abi } = require('./artifacts/contracts/BPRSec.sol/BPRSec.json');
import cors from 'cors'
let expressServer = express();
expressServer.use(cors())

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545/")

const signer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);

const secretKey = bls.SecretKey.fromKeygen(); // private key generation

let clients = []

let count = 0

const tcpServer = net.createServer((socket) => {
    console.log(`${socket.remotePort} connected`)
    clients.push(socket)
    ++count
    if (count == 5) {
        console.log("Started Sending Packets")
        startTransferring()
    }
    socket.on('data', (data) => {
        const msg = JSON.parse(data.toString())
        const nextClient = clients.find(client => client._peername.port == msg.client?._peername.port)
        nextClient.write(JSON.stringify({ msg: msg.message, clients: msg.clients }));
    });
    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
});

const startTransferring = () => {
    let i = 0
    fs.readFile('./iot_data.json', 'utf8', (err, data) => {
        if (err) {
            console.error(err)
            return
        }
        const jsonData = JSON.parse(data)
        const interval = setInterval(() => {
            ++i
            try {
                const port = Math.floor(Math.random() * (clients.length))
                console.log("Sending Packet", i)
                clients[port].write(JSON.stringify({ msg: onMessageSend(jsonData[i]), clients: clients.filter(client => client != clients[port]) }));
            } catch (error) {
                console.log("err", error)
                console.log("Package dropped")
            }
            if (i == jsonData.length - 2) {
                console.log("Successfully Sent " + i + " Packets")
                clearInterval(interval)
            }
        }, 6000)
    })
}

tcpServer.listen(8080, () => {
    console.log('TCP server listening on port 8080');
});
expressServer.listen(8081, () => {
    console.log('Express server listening on port 8081');
});


const onMessageSend = (msg) => {
    const signedMsg = signMsg(msg);
    if (signedMsg) {
        return JSON.stringify(signedMsg)
    }
    return
}


const signMsg = (msg) => {
    console.log("Signing Msg...")
    const hash = new TextEncoder().encode(JSON.stringify(msg?.payload))
    const signature = bls.sign(secretKey.toBytes(), hash)
    msg.hash = hash
    msg.signature = signature
    msg.publicKey = bls.secretKeyToPublicKey(secretKey.toBytes())
    msg.hopArray = []
    msg.ttl = 6
    return msg
}

expressServer.get('/getBlocks', function (req, res) {
    contract.getAllNodes().then((data) => {
        // Convert the data before sending it to the response
        const formattedData = data.map(node => ({
            tx: node.data,                           // Assuming data is an array of strings
            src: node.src,                             // Assuming src is a string
            dest: node.dest,                           // Assuming dest is a string
            timestamp: node.timeStamp,                 // Assuming timeStamp is a string
            signature: node.signature,                 // Assuming signature is a string
            hopArray: node.hopArray.map(hop => ({      // Iterate over hopArray to format BigInt
                addr: hop.addr,                        // Assuming addr is a string
                timeStamp: hop.timeStamp.toString()    // Convert BigInt timestamp to string
            }))
        }));

        res.json(formattedData);
    })
});
expressServer.get('/getTokens', function (req, res) {
    contract.getAllToken().then((data) => {
        res.json(data.map(([address, bigInt]) => [address, bigInt.toString()]))
    }
    )
});
expressServer.get('/getRate', function (req, res) {
    contract.getRate().then((data) => {
        res.json(data.toString())
    })
}); 
