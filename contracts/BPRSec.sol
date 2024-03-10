// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

struct subNodes {
    string src;
    string des;
    string hashedData;
    string signature;
    string publicKey;
}

struct node {
    subNodes[] data;
    string src;
    string dest;
    string signature;
    string[] hopArray;
}

contract BPRSec {
    node[] public allRootNodes;
    mapping(string => uint) public token;

    function save(node memory rootNodes) public {
        require(rootNodes.data.length == 10, "Invalid rootNodes length");

        node storage newNode = allRootNodes.push();

        for (uint i = 0; i < rootNodes.data.length; i++) {
            newNode.data.push(rootNodes.data[i]);
        }

        newNode.src = rootNodes.src;
        newNode.dest = rootNodes.dest;

        newNode.hopArray = new string[](rootNodes.hopArray.length);

        for (uint i = 0; i < rootNodes.hopArray.length; i++) {
            newNode.hopArray[i] = rootNodes.hopArray[i];
        }
        allRootNodes.push(newNode);
    }
    function distributeTokens(string[] memory hopArray) public {
        for (uint i = 0; i < hopArray.length; i++) {
            token[(hopArray[i])] = 1;
        }
    }
}
