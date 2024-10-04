// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

struct hopInfo{
   string addr;
   uint timeStamp;
}

struct node {
    string[] data;
    string src;
    string dest;
    string timeStamp;
    string signature;
    hopInfo[] hopArray;
}

struct token {
    string addr;
    uint token;
}
contract BPRSec {
    uint successRate = 0;
    token[] public allTokens;
    node[] public allRootNodes;
    mapping(string => uint) public distTokens;
    uint successfulDeliveries = 0;
    event TokenUpdated(string hopAddress, uint256 newCount);

    function save(node memory rootNodes) public {
        require(rootNodes.data.length == 10, "Invalid rootNodes length");

        node storage newNode = allRootNodes.push();
        for (uint i = 0; i < rootNodes.data.length; i++) {
            newNode.data.push(rootNodes.data[i]);
        }
        newNode.timeStamp = rootNodes.timeStamp;
        newNode.signature = rootNodes.signature;
        newNode.src = rootNodes.src;
        newNode.dest = rootNodes.dest;

        for (uint i = 0; i < rootNodes.hopArray.length; i++) {
            newNode.hopArray.push(rootNodes.hopArray[i]);
        }
    }
    function increaseRate() public {
        successRate = successRate + 1;
    }
    function distributeTokens(string[] memory hopArray) public {
        increaseRate();
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

    function getRate() public view returns (uint) {
        return successRate;
    }
    function getAllToken() public view returns (token[] memory) {
        return allTokens;
    }
    function getAllNodes() public view returns (node[] memory) {
        return allRootNodes;
    }
}
