export const CrosschainWithdrawalPaymasterAbi = [
    {
      "type": "constructor",
      "inputs": [
        {
          "name": "_entryPoint",
          "type": "address",
          "internalType": "contract IEntryPoint"
        },
        {
          "name": "_shinobiCashEntrypoint",
          "type": "address",
          "internalType": "contract IShinobiCashEntrypoint"
        },
        {
          "name": "_ethShinobiCashPool",
          "type": "address",
          "internalType": "contract ShinobiCashPool"
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
      "name": "ETH_POOL",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "address",
          "internalType": "contract ShinobiCashPool"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "POST_OP_GAS_LIMIT",
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
      "name": "SHINOBI_CASH_ENTRYPOINT",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "address",
          "internalType": "contract IShinobiCashEntrypoint"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "addStake",
      "inputs": [
        {
          "name": "unstakeDelaySec",
          "type": "uint32",
          "internalType": "uint32"
        }
      ],
      "outputs": [],
      "stateMutability": "payable"
    },
    {
      "type": "function",
      "name": "deposit",
      "inputs": [],
      "outputs": [],
      "stateMutability": "payable"
    },
    {
      "type": "function",
      "name": "entryPoint",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "address",
          "internalType": "contract IEntryPoint"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "expectedSmartAccount",
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
      "name": "getDeposit",
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
      "name": "postOp",
      "inputs": [
        {
          "name": "mode",
          "type": "uint8",
          "internalType": "enum IPaymaster.PostOpMode"
        },
        {
          "name": "context",
          "type": "bytes",
          "internalType": "bytes"
        },
        {
          "name": "actualGasCost",
          "type": "uint256",
          "internalType": "uint256"
        },
        {
          "name": "actualUserOpFeePerGas",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "processCrossChainWithdrawal",
      "inputs": [
        {
          "name": "withdrawal",
          "type": "tuple",
          "internalType": "struct IPrivacyPool.Withdrawal",
          "components": [
            {
              "name": "processooor",
              "type": "address",
              "internalType": "address"
            },
            {
              "name": "data",
              "type": "bytes",
              "internalType": "bytes"
            }
          ]
        },
        {
          "name": "proof",
          "type": "tuple",
          "internalType": "struct CrossChainProofLib.CrossChainWithdrawProof",
          "components": [
            {
              "name": "pA",
              "type": "uint256[2]",
              "internalType": "uint256[2]"
            },
            {
              "name": "pB",
              "type": "uint256[2][2]",
              "internalType": "uint256[2][2]"
            },
            {
              "name": "pC",
              "type": "uint256[2]",
              "internalType": "uint256[2]"
            },
            {
              "name": "pubSignals",
              "type": "uint256[9]",
              "internalType": "uint256[9]"
            }
          ]
        },
        {
          "name": "scope",
          "type": "uint256",
          "internalType": "uint256"
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
      "name": "setExpectedSmartAccount",
      "inputs": [
        {
          "name": "account",
          "type": "address",
          "internalType": "address"
        }
      ],
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
      "type": "function",
      "name": "unlockStake",
      "inputs": [],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "validatePaymasterUserOp",
      "inputs": [
        {
          "name": "userOp",
          "type": "tuple",
          "internalType": "struct PackedUserOperation",
          "components": [
            {
              "name": "sender",
              "type": "address",
              "internalType": "address"
            },
            {
              "name": "nonce",
              "type": "uint256",
              "internalType": "uint256"
            },
            {
              "name": "initCode",
              "type": "bytes",
              "internalType": "bytes"
            },
            {
              "name": "callData",
              "type": "bytes",
              "internalType": "bytes"
            },
            {
              "name": "accountGasLimits",
              "type": "bytes32",
              "internalType": "bytes32"
            },
            {
              "name": "preVerificationGas",
              "type": "uint256",
              "internalType": "uint256"
            },
            {
              "name": "gasFees",
              "type": "bytes32",
              "internalType": "bytes32"
            },
            {
              "name": "paymasterAndData",
              "type": "bytes",
              "internalType": "bytes"
            },
            {
              "name": "signature",
              "type": "bytes",
              "internalType": "bytes"
            }
          ]
        },
        {
          "name": "userOpHash",
          "type": "bytes32",
          "internalType": "bytes32"
        },
        {
          "name": "maxCost",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "outputs": [
        {
          "name": "context",
          "type": "bytes",
          "internalType": "bytes"
        },
        {
          "name": "validationData",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "withdrawStake",
      "inputs": [
        {
          "name": "withdrawAddress",
          "type": "address",
          "internalType": "address payable"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "withdrawTo",
      "inputs": [
        {
          "name": "withdrawAddress",
          "type": "address",
          "internalType": "address payable"
        },
        {
          "name": "amount",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "event",
      "name": "CrossChainWithdrawalSponsored",
      "inputs": [
        {
          "name": "userAccount",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "userOpHash",
          "type": "bytes32",
          "indexed": true,
          "internalType": "bytes32"
        },
        {
          "name": "actualWithdrawalCost",
          "type": "uint256",
          "indexed": false,
          "internalType": "uint256"
        },
        {
          "name": "refunded",
          "type": "uint256",
          "indexed": false,
          "internalType": "uint256"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "ExpectedSmartAccountUpdated",
      "inputs": [
        {
          "name": "previousAccount",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "newAccount",
          "type": "address",
          "indexed": true,
          "internalType": "address"
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
      "name": "CrossChainWithdrawalValidationFailed",
      "inputs": []
    },
    {
      "type": "error",
      "name": "ExpectedSmartAccountNotSet",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InsufficientPaymasterCost",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InsufficientPostOpGasLimit",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidCallData",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidProcessooor",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidScope",
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
      "name": "SmartAccountNotDeployed",
      "inputs": []
    },
    {
      "type": "error",
      "name": "UnauthorizedCaller",
      "inputs": []
    },
    {
      "type": "error",
      "name": "UnauthorizedSmartAccount",
      "inputs": []
    },
    {
      "type": "error",
      "name": "WrongFeeRecipient",
      "inputs": []
    },
    {
      "type": "error",
      "name": "ZeroFeeNotAllowed",
      "inputs": []
    }
  ] as const;