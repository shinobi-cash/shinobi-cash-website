export const ShinobiCrosschainDepositEntrypointAbi = [
    {
      "type": "constructor",
      "inputs": [
        {
          "name": "_owner",
          "type": "address",
          "internalType": "address"
        }
      ],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "defaultExpiry",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "uint32",
          "internalType": "uint32"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "defaultFillDeadline",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "uint32",
          "internalType": "uint32"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "deposit",
      "inputs": [
        {
          "name": "precommitment",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "outputs": [],
      "stateMutability": "payable"
    },
    {
      "type": "function",
      "name": "depositWithCustomFee",
      "inputs": [
        {
          "name": "precommitment",
          "type": "uint256",
          "internalType": "uint256"
        },
        {
          "name": "customSolverFeeBPS",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "outputs": [],
      "stateMutability": "payable"
    },
    {
      "type": "function",
      "name": "destinationChainId",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "destinationEntrypoint",
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
      "name": "destinationOracle",
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
      "name": "destinationOutputSettler",
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
      "name": "inputSettler",
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
      "name": "intentOracle",
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
      "name": "maxSolverFeeBPS",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "minimumDepositAmount",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "nonce",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "uint256",
          "internalType": "uint256"
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
      "type": "function",
      "name": "renounceOwnership",
      "inputs": [],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "setDefaultExpiry",
      "inputs": [
        {
          "name": "_expiry",
          "type": "uint32",
          "internalType": "uint32"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "setDefaultFillDeadline",
      "inputs": [
        {
          "name": "_fillDeadline",
          "type": "uint32",
          "internalType": "uint32"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "setDestinationConfig",
      "inputs": [
        {
          "name": "_chainId",
          "type": "uint256",
          "internalType": "uint256"
        },
        {
          "name": "_entrypoint",
          "type": "address",
          "internalType": "address"
        },
        {
          "name": "_outputSettler",
          "type": "address",
          "internalType": "address"
        },
        {
          "name": "_oracle",
          "type": "address",
          "internalType": "address"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "setFillOracle",
      "inputs": [
        {
          "name": "_fillOracle",
          "type": "address",
          "internalType": "address"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "setInputSettler",
      "inputs": [
        {
          "name": "_inputSettler",
          "type": "address",
          "internalType": "address"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "setIntentOracle",
      "inputs": [
        {
          "name": "_intentOracle",
          "type": "address",
          "internalType": "address"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "setMaxSolverFeeBPS",
      "inputs": [
        {
          "name": "_maxFeeBPS",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "setMinimumDepositAmount",
      "inputs": [
        {
          "name": "_minimumAmount",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "setSolverFeeBPS",
      "inputs": [
        {
          "name": "_feeBPS",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "solverFeeBPS",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "stateMutability": "view"
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
      "name": "CrossChainDepositIntent",
      "inputs": [
        {
          "name": "depositor",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "precommitment",
          "type": "uint256",
          "indexed": true,
          "internalType": "uint256"
        },
        {
          "name": "totalPaid",
          "type": "uint256",
          "indexed": false,
          "internalType": "uint256"
        },
        {
          "name": "depositAmount",
          "type": "uint256",
          "indexed": false,
          "internalType": "uint256"
        },
        {
          "name": "solverFee",
          "type": "uint256",
          "indexed": false,
          "internalType": "uint256"
        },
        {
          "name": "destinationChainId",
          "type": "uint256",
          "indexed": false,
          "internalType": "uint256"
        },
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
      "type": "event",
      "name": "DefaultExpiryUpdated",
      "inputs": [
        {
          "name": "previousExpiry",
          "type": "uint32",
          "indexed": false,
          "internalType": "uint32"
        },
        {
          "name": "newExpiry",
          "type": "uint32",
          "indexed": false,
          "internalType": "uint32"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "DefaultFillDeadlineUpdated",
      "inputs": [
        {
          "name": "previousFillDeadline",
          "type": "uint32",
          "indexed": false,
          "internalType": "uint32"
        },
        {
          "name": "newFillDeadline",
          "type": "uint32",
          "indexed": false,
          "internalType": "uint32"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "DestinationConfigUpdated",
      "inputs": [
        {
          "name": "chainId",
          "type": "uint256",
          "indexed": true,
          "internalType": "uint256"
        },
        {
          "name": "entrypoint",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "outputSettler",
          "type": "address",
          "indexed": false,
          "internalType": "address"
        },
        {
          "name": "oracle",
          "type": "address",
          "indexed": false,
          "internalType": "address"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "FillOracleUpdated",
      "inputs": [
        {
          "name": "previousFillOracle",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "newFillOracle",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "InputSettlerUpdated",
      "inputs": [
        {
          "name": "previousInputSettler",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "newInputSettler",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "IntentOracleUpdated",
      "inputs": [
        {
          "name": "previousIntentOracle",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "newIntentOracle",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "MaxSolverFeeBPSUpdated",
      "inputs": [
        {
          "name": "previousMaxFeeBPS",
          "type": "uint256",
          "indexed": false,
          "internalType": "uint256"
        },
        {
          "name": "newMaxFeeBPS",
          "type": "uint256",
          "indexed": false,
          "internalType": "uint256"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "MinimumDepositAmountUpdated",
      "inputs": [
        {
          "name": "previousMinimum",
          "type": "uint256",
          "indexed": false,
          "internalType": "uint256"
        },
        {
          "name": "newMinimum",
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
      "type": "event",
      "name": "SolverFeeBPSUpdated",
      "inputs": [
        {
          "name": "previousFeeBPS",
          "type": "uint256",
          "indexed": false,
          "internalType": "uint256"
        },
        {
          "name": "newFeeBPS",
          "type": "uint256",
          "indexed": false,
          "internalType": "uint256"
        }
      ],
      "anonymous": false
    },
    {
      "type": "error",
      "name": "ConfigurationNotSet",
      "inputs": []
    },
    {
      "type": "error",
      "name": "DepositAmountBelowMinimumAfterFee",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InputSettlerNotSet",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidAddress",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidAmount",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidChainId",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidFeeBPS",
      "inputs": []
    },
    {
      "type": "error",
      "name": "MinimumDepositAmount",
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
    },
    {
      "type": "error",
      "name": "SolverFeeExceedsMax",
      "inputs": []
    }
  ] as const;