/**
 * Solver quote client.
 * Calls solver URL for cross-chain fee/timing configuration.
 */

import type { SolverQuoteRequest, SolverQuote } from "./types.js";

export async function fetchSolverQuote(
  solverUrl: string,
  params: SolverQuoteRequest
): Promise<SolverQuote> {
  const res = await fetch(`${solverUrl}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error(`Solver quote failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<SolverQuote>;
}
