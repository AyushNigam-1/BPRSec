// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

struct subNodes {
    string src;
    string des;
    string hash;
}

struct node {
    subNodes[] data;
    string src;
    string dest; // Corrected typo (dest instead of des)
    string hash;
    address[] hopArray;
}

contract BPRSec {
    node[] public allRootNodes;
    mapping(address => uint) public token;

    function getBlocks(node memory rootNodes) public {
        require(rootNodes.data.length == 10, "Invalid rootNodes length");

        // Create a new node instance directly in storage
        node storage newNode = allRootNodes.push();

        // Copy data from memory to storage element-wise
        for (uint i = 0; i < rootNodes.data.length; i++) {
            newNode.data.push(rootNodes.data[i]);
        }

        newNode.src = rootNodes.src;
        newNode.dest = rootNodes.dest;
        newNode.hash = rootNodes.hash;

        // Create a new array for hop addresses in storage
        newNode.hopArray = new address[](rootNodes.hopArray.length);

        // Copy hop addresses element by element
        for (uint i = 0; i < rootNodes.hopArray.length; i++) { // Corrected loop limit (should be hopArray.length)
            newNode.hopArray[i] = rootNodes.hopArray[i];
        }
        allRootNodes.push(newNode);
        // Assign tokens for hop addresses
        for (uint i = 0; i < newNode.hopArray.length; i++) {
            token[address(newNode.hopArray[i])] = 1;
        }
    }
}
