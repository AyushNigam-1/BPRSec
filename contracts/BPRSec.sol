// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

struct node {
    string[] data;
    string src;
    string dest;
    string timeStamp;
    string signature;
    string[] hopArray;
}

struct token {
    string add;
    uint token;
}
contract BPRSec {
    token[] public allTokens;
    node[] public allRootNodes;
    mapping(string => uint) public distTokens;
    event TokenUpdated(string hopAddress, uint256 newCount);

    function save(node memory rootNodes) public {
        require(rootNodes.data.length == 10, "Invalid rootNodes length");

        node storage newNode = allRootNodes.push();
        newNode.hopArray = new string[](rootNodes.data.length);
        for (uint i = 0; i < rootNodes.data.length; i++) {
            newNode.data.push(rootNodes.data[i]);
        }
        newNode.timeStamp = rootNodes.timeStamp;
        newNode.signature = rootNodes.signature;
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
            distTokens[(hopArray[i])] = distTokens[(hopArray[i])] + 1;
            allTokens.push(token(hopArray[i], distTokens[(hopArray[i])] + 1));
            emit TokenUpdated(hopArray[i], distTokens[hopArray[i]]);
        }
    }
    function getAllToken() public view returns (token[] memory) {
        return allTokens;
    }
}
