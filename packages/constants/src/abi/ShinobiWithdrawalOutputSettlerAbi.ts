export const ShinobiWithdrawalOutputSettlerAbi = [
    {
      "type": "constructor",
      "inputs": [
        {
          "name": "_owner",
          "type": "address",
          "internalType": "address"
        },
        {
          "name": "_fillOracle",
          "type": "address",
          "internalType": "address"
        }
      ],
      "stateMutability": "nonpayable"
    },
    {
      "type": "receive",
      "stateMutability": "payable"
    },
    {
      "type": "function",
      "name": "fill",
      "inputs": [
        {
          "name": "intent",
          "type": "tuple",
          "internalType": "struct ShinobiIntent",
          "components": [
            {
              "name": "user",
              "type": "address",
              "internalType": "address"
            },
            {
              "name": "nonce",
              "type": "uint256",
              "internalType": "uint256"
            },
            {
              "name": "originChainId",
              "type": "uint256",
              "internalType": "uint256"
            },
            {
              "name": "expires",
              "type": "uint32",
              "internalType": "uint32"
            },
            {
              "name": "fillDeadline",
              "type": "uint32",
              "internalType": "uint32"
            },
            {
              "name": "fillOracle",
              "type": "address",
              "internalType": "address"
            },
            {
              "name": "inputs",
              "type": "uint256[2][]",
              "internalType": "uint256[2][]"
            },
            {
              "name": "outputs",
              "type": "tuple[]",
              "internalType": "struct MandateOutput[]",
              "components": [
                {
                  "name": "oracle",
                  "type": "bytes32",
                  "internalType": "bytes32"
                },
                {
                  "name": "settler",
                  "type": "bytes32",
                  "internalType": "bytes32"
                },
                {
                  "name": "chainId",
                  "type": "uint256",
                  "internalType": "uint256"
                },
                {
                  "name": "token",
                  "type": "bytes32",
                  "internalType": "bytes32"
                },
                {
                  "name": "amount",
                  "type": "uint256",
                  "internalType": "uint256"
                },
                {
                  "name": "recipient",
                  "type": "bytes32",
                  "internalType": "bytes32"
                },
                {
                  "name": "call",
                  "type": "bytes",
                  "internalType": "bytes"
                },
                {
                  "name": "context",
                  "type": "bytes",
                  "internalType": "bytes"
                }
              ]
            },
            {
              "name": "intentOracle",
              "type": "address",
              "internalType": "address"
            },
            {
              "name": "refundCalldata",
              "type": "bytes",
              "internalType": "bytes"
            }
          ]
        }
      ],
      "outputs": [],
      "stateMutability": "payable"
    },
    {
      "type": "function",
      "name": "fillOracle",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "address",
          "internalType": "address"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getFillRecord",
      "inputs": [
        {
          "name": "orderId",
          "type": "bytes32",
          "internalType": "bytes32"
        },
        {
          "name": "outputHash",
          "type": "bytes32",
          "internalType": "bytes32"
        }
      ],
      "outputs": [
        {
          "name": "payloadHash",
          "type": "bytes32",
          "internalType": "bytes32"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "owner",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "address",
          "internalType": "address"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "renounceOwnership",
      "inputs": [],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "transferOwnership",
      "inputs": [
        {
          "name": "newOwner",
          "type": "address",
          "internalType": "address"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "event",
      "name": "OutputFilled",
      "inputs": [
        {
          "name": "orderId",
          "type": "bytes32",
          "indexed": true,
          "internalType": "bytes32"
        },
        {
          "name": "solver",
          "type": "bytes32",
          "indexed": false,
          "internalType": "bytes32"
        },
        {
          "name": "timestamp",
          "type": "uint32",
          "indexed": false,
          "internalType": "uint32"
        },
        {
          "name": "output",
          "type": "tuple",
          "indexed": false,
          "internalType": "struct MandateOutput",
          "components": [
            {
              "name": "oracle",
              "type": "bytes32",
              "internalType": "bytes32"
            },
            {
              "name": "settler",
              "type": "bytes32",
              "internalType": "bytes32"
            },
            {
              "name": "chainId",
              "type": "uint256",
              "internalType": "uint256"
            },
            {
              "name": "token",
              "type": "bytes32",
              "internalType": "bytes32"
            },
            {
              "name": "amount",
              "type": "uint256",
              "internalType": "uint256"
            },
            {
              "name": "recipient",
              "type": "bytes32",
              "internalType": "bytes32"
            },
            {
              "name": "call",
              "type": "bytes",
              "internalType": "bytes"
            },
            {
              "name": "context",
              "type": "bytes",
              "internalType": "bytes"
            }
          ]
        },
        {
          "name": "finalAmount",
          "type": "uint256",
          "indexed": false,
          "internalType": "uint256"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "OwnershipTransferred",
      "inputs": [
        {
          "name": "previousOwner",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "newOwner",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        }
      ],
      "anonymous": false
    },
    {
      "type": "error",
      "name": "AlreadyFilled",
      "inputs": []
    },
    {
      "type": "error",
      "name": "CallOutOfRange",
      "inputs": []
    },
    {
      "type": "error",
      "name": "ContextOutOfRange",
      "inputs": []
    },
    {
      "type": "error",
      "name": "ETHTransferFailed",
      "inputs": []
    },
    {
      "type": "error",
      "name": "FillDeadlinePassed",
      "inputs": []
    },
    {
      "type": "error",
      "name": "FillOracleMismatch",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidAsset",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidChain",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidFillOracle",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidOutput",
      "inputs": []
    },
    {
      "type": "error",
      "name": "OwnableInvalidOwner",
      "inputs": [
        {
          "name": "owner",
          "type": "address",
          "internalType": "address"
        }
      ]
    },
    {
      "type": "error",
      "name": "OwnableUnauthorizedAccount",
      "inputs": [
        {
          "name": "account",
          "type": "address",
          "internalType": "address"
        }
      ]
    },
    {
      "type": "error",
      "name": "ReentrancyGuardReentrantCall",
      "inputs": []
    }
  ] as const;