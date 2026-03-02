import { describe, it, expect } from "vitest";
import { createStateMachine } from "@/utils/stateMachine";

type TestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: string }
  | { status: "error"; error: string };

function createTestMachine() {
  let state: TestState = { status: "idle" };

  const machine = createStateMachine<TestState>({
    name: "Test",
    allowedTransitions: {
      idle: ["loading"],
      loading: ["ready", "error"],
      ready: ["loading", "idle"],
      error: ["idle", "loading"],
    },
    getState: () => state,
    setState: (next) => {
      state = next;
    },
  });

  return { machine, getState: () => state };
}

describe("createStateMachine", () => {
  it("allows valid transitions", () => {
    const { machine, getState } = createTestMachine();

    machine.transition({ status: "loading" });
    expect(getState().status).toBe("loading");

    machine.transition({ status: "ready", data: "hello" });
    expect(getState()).toEqual({ status: "ready", data: "hello" });
  });

  it("throws on invalid transitions", () => {
    const { machine } = createTestMachine();

    expect(() => machine.transition({ status: "ready", data: "x" })).toThrowError(
      "[Test] Invalid transition: idle → ready"
    );
  });

  it("canTransition returns correct values", () => {
    const { machine } = createTestMachine();

    expect(machine.canTransition("loading")).toBe(true);
    expect(machine.canTransition("ready")).toBe(false);
    expect(machine.canTransition("error")).toBe(false);
  });

  it("handles error → idle recovery", () => {
    const { machine, getState } = createTestMachine();

    machine.transition({ status: "loading" });
    machine.transition({ status: "error", error: "failed" });
    expect(getState()).toEqual({ status: "error", error: "failed" });

    machine.transition({ status: "idle" });
    expect(getState().status).toBe("idle");
  });

  it("handles error → loading retry", () => {
    const { machine, getState } = createTestMachine();

    machine.transition({ status: "loading" });
    machine.transition({ status: "error", error: "timeout" });
    machine.transition({ status: "loading" });
    machine.transition({ status: "ready", data: "retried" });

    expect(getState()).toEqual({ status: "ready", data: "retried" });
  });

  it("preserves state data through transitions", () => {
    const { machine, getState } = createTestMachine();

    machine.transition({ status: "loading" });
    machine.transition({ status: "ready", data: "test-data" });

    const readyState = getState();
    expect(readyState.status).toBe("ready");
    if (readyState.status === "ready") {
      expect(readyState.data).toBe("test-data");
    }
  });
});
