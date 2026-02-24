/**
 * Shared cryptographic primitives for note derivation
 */

import { poseidon2 } from "poseidon-lite/poseidon2";
import { AbiParameters, Address, Hash } from "ox";
import { SNARK_SCALAR_FIELD } from "./constants.js";
import { parseUserKey } from "../auth/index.js";

const modF = (x: bigint) => ((x % SNARK_SCALAR_FIELD) + SNARK_SCALAR_FIELD) % SNARK_SCALAR_FIELD;
const fieldFromKeccak = (bytes: `0x${string}`) => modF(BigInt(Hash.keccak256(bytes)));

function contextField(
  poolAddress: string,
  chainId: number | bigint | string,
  depositIndex: number | bigint,
  changeIndex: number | bigint,
  tag: `0x${string}`
) {
  const packed = AbiParameters.encodePacked(
    ["address", "uint64", "uint64", "uint64", "bytes32"],
    [Address.checksum(poolAddress), BigInt(chainId), BigInt(depositIndex), BigInt(changeIndex), tag]
  );
  return fieldFromKeccak(packed);
}

const prf2 = (key: bigint, ctx: bigint, dom: bigint) =>
  modF(poseidon2([key, modF(poseidon2([ctx, dom]))]));

export function derivePrecommitment(nullifier: bigint, secret: bigint): bigint {
  return poseidon2([nullifier, secret]);
}

/** Creates a derivation function for a specific domain */
export function createDeriveFn(tagString: string) {
  const tag = Hash.keccak256(AbiParameters.encodePacked(["string"], [tagString]));
  const dom = fieldFromKeccak(tag);

  return function derive(
    userKey: string | bigint,
    poolAddress: string,
    chainId: number | bigint | string,
    depositIndex: number | bigint,
    changeIndex: number | bigint = 0n
  ): bigint {
    const ctx = contextField(poolAddress, chainId, depositIndex, changeIndex, tag);
    return prf2(parseUserKey(userKey), ctx, dom);
  };
}
