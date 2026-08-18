import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FunctionForm } from "./function-form";
import { SpecFunction, SpecUdt } from "@/lib/stellar/spec-decoder";

describe("FunctionForm", () => {
  it("renders function name, doc, and input parameters correctly", () => {
    const fn: SpecFunction = {
      name: "balance",
      doc: "Get balance of account",
      inputs: [
        {
          name: "id",
          doc: "Target account",
          type: { kind: "address" },
        },
      ],
      outputs: [{ kind: "i128" }],
    };

    const udtRegistry = new Map<string, SpecUdt>();

    render(
      <FunctionForm
        contractId="CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4"
        fn={fn}
        udtRegistry={udtRegistry}
        network="testnet"
        connectedPublicKey={null}
        onConnectWallet={vi.fn()}
      />
    );

    expect(screen.getByText("balance")).toBeTruthy();
    expect(screen.getByText("Get balance of account")).toBeTruthy();
    expect(screen.getByText("id")).toBeTruthy();
    expect(screen.getByText("Simulate Read")).toBeTruthy();
    expect(screen.getByText("Connect Wallet to Write")).toBeTruthy();
  });
});
