import type { ShinobiSolver, SolverQuoteRequest, SolverQuote } from "@shinobi-cash/client";

export function createShinobiSolver(): ShinobiSolver {
  return {
    async getQuote(params: SolverQuoteRequest): Promise<SolverQuote> {
      const res = await fetch("/api/solver/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        throw new Error(`Solver quote failed: ${res.status} ${res.statusText}`);
      }

      return res.json() as Promise<SolverQuote>;
    },
  };
}
