import { describe, it, expect } from "vitest";
import { getNetworkPassphrase, sanitizeContractError } from "./contract-client";

describe("contract-client", () => {
  describe("getNetworkPassphrase", () => {
    it("returns correct network passphrases", () => {
      expect(getNetworkPassphrase("mainnet")).toContain("Public");
      expect(getNetworkPassphrase("testnet")).toContain("Test");
      expect(getNetworkPassphrase("futurenet")).toContain("Future");
    });

    it("defaults to testnet for unknown network", () => {
      expect(getNetworkPassphrase("unknown" as never)).toContain("Test");
    });
  });

  describe("sanitizeContractError", () => {
    it("sanitizes user rejection messages", () => {
      expect(sanitizeContractError("User declined request")).toBe(
        "Transaction signing request was rejected by the wallet."
      );
      expect(sanitizeContractError("User rejected the transaction")).toBe(
        "Transaction signing request was rejected by the wallet."
      );
      expect(sanitizeContractError("Declined by user")).toBe(
        "Transaction signing request was rejected by the wallet."
      );
    });

    it("sanitizes contract invocation errors", () => {
      expect(sanitizeContractError("HostError: ContractNotInvokable")).toBe(
        "Contract invocation failed during simulation. Please verify function arguments and contract state."
      );
      expect(sanitizeContractError("HostError in contract")).toBe(
        "Contract invocation failed during simulation. Please verify function arguments and contract state."
      );
    });

    it("sanitizes resource limit errors", () => {
      expect(sanitizeContractError("ResourceLimitExceeded in VM")).toBe(
        "Resource limit exceeded during contract simulation."
      );
      expect(sanitizeContractError("BudgetExceeded during execution")).toBe(
        "Resource limit exceeded during contract simulation."
      );
    });

    it("sanitizes transaction failure errors", () => {
      expect(sanitizeContractError("TransactionFailed on chain")).toBe(
        "Contract execution failed on chain. Please check parameter values and authorization."
      );
      expect(sanitizeContractError("txFailed in ledger")).toBe(
        "Contract execution failed on chain. Please check parameter values and authorization."
      );
    });

    it("sanitizes wallet-related errors", () => {
      expect(sanitizeContractError("Wallet not connected")).toBe(
        "Wallet connection or signing error. Please ensure your wallet is unlocked and connected."
      );
      expect(sanitizeContractError("Freighter timeout")).toBe(
        "Wallet connection or signing error. Please ensure your wallet is unlocked and connected."
      );
    });

    it("returns fallback message for unknown errors", () => {
      expect(sanitizeContractError("Random internal error 123", "Custom failure")).toBe(
        "Custom failure: Random internal error 123"
      );
    });

    it("truncates long error messages", () => {
      const longMsg = "A".repeat(200);
      const result = sanitizeContractError(longMsg, "Error");
      expect(result.length).toBeLessThan(150);
      expect(result).toContain("A".repeat(120));
    });

    it("handles null and undefined errors", () => {
      expect(sanitizeContractError(null)).toBe("Operation failed");
      expect(sanitizeContractError(undefined)).toBe("Operation failed");
      expect(sanitizeContractError(false)).toBe("Operation failed");
    });

    it("handles Error objects with recognized patterns", () => {
      const err = new Error("User declined the request");
      const result = sanitizeContractError(err);
      expect(result).toBe("Transaction signing request was rejected by the wallet.");
    });

    it("handles unrecognized Error objects with fallback", () => {
      const err = new Error("Something went wrong");
      const result = sanitizeContractError(err);
      expect(result).toBe("Operation failed: Something went wrong");
    });

    it("uses custom fallback message", () => {
      expect(sanitizeContractError("Some error", "Custom fallback")).toBe(
        "Custom fallback: Some error"
      );
    });

    it("handles string error messages with fallback prefix", () => {
      expect(sanitizeContractError("Simple error message")).toBe(
        "Operation failed: Simple error message"
      );
    });
  });
});
