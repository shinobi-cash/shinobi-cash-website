/**
 * Notes Error Types
 * Error domain typing for better error handling
 */

// ============ ERROR DOMAINS ============

/**
 * Error domain typing - discriminated union
 * Allows UI to handle different error types appropriately
 *
 * Current implementation status:
 * - discovery: ✅ Implemented in useNotesController
 * - storage: 🚧 TODO: Wire up storage/cache errors
 * - network: 🚧 TODO: Wire up network/RPC errors
 */
export type NotesError =
  | { type: "discovery"; message: string } // Note discovery errors
  | { type: "storage"; message: string } // Storage/cache errors (TODO)
  | { type: "network"; message: string } // Network/RPC errors (TODO)
  | null;
