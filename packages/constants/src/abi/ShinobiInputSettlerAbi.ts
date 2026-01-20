export const ShinobiInputSettlerAbi = [
    {
      "type": "constructor",
      "inputs": [
        {
          "name": "_entrypoint",
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
      "name": "entrypoint",
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
      "name": "finalise",
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
        },
        {
          "name": "solveParams",
          "type": "tuple[]",
          "internalType": "struct IShinobiInputSettler.SolveParams[]",
          "components": [
            {
              "name": "timestamp",
              "type": "uint32",
              "internalType": "uint32"
            },
            {
              "name": "solver",
              "type": "bytes32",
              "internalType": "bytes32"
            }
          ]
        },
        {
          "name": "destination",
          "type": "bytes32",
          "internalType": "bytes32"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "open",
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
      "name": "orderIdentifier",
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
      "outputs": [
        {
          "name": "",
          "type": "bytes32",
          "internalType": "bytes32"
        }
      ],
      "stateMutability": "pure"
    },
    {
      "type": "function",
      "name": "orderStatus",
      "inputs": [
        {
          "name": "",
          "type": "bytes32",
          "internalType": "bytes32"
        }
      ],
      "outputs": [
        {
          "name": "",
          "type": "uint8",
          "internalType": "enum ShinobiInputSettler.OrderStatus"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "refund",
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
      "stateMutability": "nonpayable"
    },
    {
      "type": "event",
      "name": "Finalised",
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
          "name": "destination",
          "type": "bytes32",
          "indexed": false,
          "internalType": "bytes32"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "Open",
      "inputs": [
        {
          "name": "orderId",
          "type": "bytes32",
          "indexed": true,
          "internalType": "bytes32"
        },
        {
          "name": "intent",
          "type": "tuple",
          "indexed": false,
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
      "anonymous": false
    },
    {
      "type": "event",
      "name": "Refunded",
      "inputs": [
        {
          "name": "orderId",
          "type": "bytes32",
          "indexed": true,
          "internalType": "bytes32"
        }
      ],
      "anonymous": false
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
      "name": "DeadlinePassed",
      "inputs": []
    },
    {
      "type": "error",
      "name": "ETHTransferFailed",
      "inputs": []
    },
    {
      "type": "error",
      "name": "ExpiryNotReached",
      "inputs": []
    },
    {
      "type": "error",
      "name": "FilledTooLate",
      "inputs": [
        {
          "name": "deadline",
          "type": "uint32",
          "internalType": "uint32"
        },
        {
          "name": "filledAt",
          "type": "uint32",
          "internalType": "uint32"
        }
      ]
    },
    {
      "type": "error",
      "name": "InvalidAmount",
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
      "name": "InvalidDeadlineOrder",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidEntrypoint",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidIntent",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidOrderStatus",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidRefundCalldataLength",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidRefundTarget",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidSolveParamsLength",
      "inputs": []
    },
    {
      "type": "error",
      "name": "MultipleSolversNotSupported",
      "inputs": []
    },
    {
      "type": "error",
      "name": "NotOrderOwner",
      "inputs": []
    },
    {
      "type": "error",
      "name": "ReentrancyDetected",
      "inputs": []
    },
    {
      "type": "error",
      "name": "UnauthorizedCaller",
      "inputs": []
    }
  ] as const;