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
    string addr;
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
        // allRootNodes.push(newNode);
    }
    function distributeTokens(string[] memory hopArray) public {
        for (uint i = 0; i < hopArray.length; i++) {
            string memory addr = hopArray[i];
            bool isFound = false;
            for (uint j = 0; j < allTokens.length; j++) {
                if (
                    keccak256(abi.encodePacked(allTokens[j].addr)) ==
                    keccak256(abi.encodePacked(addr))
                ) {
                    allTokens[j].token = allTokens[j].token + 1;
                    isFound = true;
                    break;
                }
            }
            if (!isFound) {
                allTokens.push(token(addr, 1));
            }
        }
    }
    function getAllToken() public view returns (token[] memory) {
        return allTokens;
    }
    function getAllNodes() public view returns (node[] memory) {
        return allRootNodes;
    }
}
