/**
 * State Machine Utility
 * Reusable FSM pattern for controllers with transition validation
 */

type StateWithStatus = { status: string };

interface StateMachineConfig<TState extends StateWithStatus> {
  name: string;
  allowedTransitions: Record<string, string[]>;
  getState: () => TState;
  setState: (state: TState) => void;
}

interface StateMachine<TState extends StateWithStatus> {
  transition: (next: TState) => void;
  canTransition: (to: TState["status"]) => boolean;
}

/**
 * Creates a state machine with transition validation
 * Logs warnings in development for invalid transitions
 */
export function createStateMachine<TState extends StateWithStatus>(
  config: StateMachineConfig<TState>
): StateMachine<TState> {
  const { name, allowedTransitions, getState, setState } = config;

  const canTransition = (to: TState["status"]): boolean => {
    const current = getState().status;
    return allowedTransitions[current]?.includes(to) ?? false;
  };

  const transition = (next: TState): void => {
    const current = getState().status;

    if (!canTransition(next.status)) {
      throw new Error(`[${name}] Invalid transition: ${current} → ${next.status}`);
    }

    setState(next);
  };

  return { transition, canTransition };
}
