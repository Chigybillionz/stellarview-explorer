import { describe, it, expect } from "vitest";
import { getNetworkPassphrase, sanitizeContractError } from "./contract-client";

describe("contract-client", () => {
  it("returns correct network passphrases", () => {
    expect(getNetworkPassphrase("mainnet")).toContain("Public");
    expect(getNetworkPassphrase("testnet")).toContain("Test");
    expect(getNetworkPassphrase("futurenet")).toContain("Future");
  });

  it("sanitizes raw contract error messages into user-friendly text", () => {
    expect(sanitizeContractError("User declined request")).toBe(
      "Transaction signing request was rejected by the wallet."
    );
    expect(sanitizeContractError("HostError: ContractNotInvokable")).toBe(
      "Contract invocation failed during simulation. Please verify function arguments and contract state."
    );
    expect(sanitizeContractError("ResourceLimitExceeded in VM")).toBe(
      "Resource limit exceeded during contract simulation."
    );
    expect(sanitizeContractError("Random internal error 123", "Custom failure")).toBe(
      "Custom failure: Random internal error 123"
    );
  });
});
