import { describe, it, expect } from "vitest";
import { xdr, nativeToScVal } from "@stellar/stellar-sdk";
import {
  decodeContractSpec,
  extractSpecCustomSection,
  parseScSpecEntries,
  encodeInputToScVal,
  decodeResultNative,
} from "./spec-decoder";

describe("spec-decoder", () => {
  it("decodes functions, structs, unions, enums, and error enums", () => {
    const fnEntry = xdr.ScSpecEntry.scSpecEntryFunctionV0(
      new xdr.ScSpecFunctionV0({
        doc: "Transfer tokens",
        name: "transfer",
        inputs: [
          new xdr.ScSpecFunctionInputV0({
            doc: "Recipient",
            name: "to",
            type: xdr.ScSpecTypeDef.scSpecTypeAddress(),
          }),
          new xdr.ScSpecFunctionInputV0({
            doc: "Amount",
            name: "amount",
            type: xdr.ScSpecTypeDef.scSpecTypeI128(),
          }),
        ],
        outputs: [xdr.ScSpecTypeDef.scSpecTypeBool()],
      })
    );

    const structEntry = xdr.ScSpecEntry.scSpecEntryUdtStructV0(
      new xdr.ScSpecUdtStructV0({
        doc: "User profile",
        lib: "",
        name: "UserProfile",
        fields: [
          new xdr.ScSpecUdtStructFieldV0({
            doc: "User name",
            name: "name",
            type: xdr.ScSpecTypeDef.scSpecTypeString(),
          }),
          new xdr.ScSpecUdtStructFieldV0({
            doc: "Age",
            name: "age",
            type: xdr.ScSpecTypeDef.scSpecTypeU32(),
          }),
        ],
      })
    );

    const unionEntry = xdr.ScSpecEntry.scSpecEntryUdtUnionV0(
      new xdr.ScSpecUdtUnionV0({
        doc: "Action status",
        lib: "",
        name: "ActionStatus",
        cases: [
          xdr.ScSpecUdtUnionCaseV0.scSpecUdtUnionCaseVoidV0(
            new xdr.ScSpecUdtUnionCaseVoidV0({
              doc: "Pending",
              name: "Pending",
            })
          ),
          xdr.ScSpecUdtUnionCaseV0.scSpecUdtUnionCaseTupleV0(
            new xdr.ScSpecUdtUnionCaseTupleV0({
              doc: "Completed",
              name: "Completed",
              type: [xdr.ScSpecTypeDef.scSpecTypeU64()],
            })
          ),
        ],
      })
    );

    const enumEntry = xdr.ScSpecEntry.scSpecEntryUdtEnumV0(
      new xdr.ScSpecUdtEnumV0({
        doc: "Role enum",
        lib: "",
        name: "Role",
        cases: [
          new xdr.ScSpecUdtEnumCaseV0({ doc: "Admin", name: "Admin", value: 0 }),
          new xdr.ScSpecUdtEnumCaseV0({ doc: "User", name: "User", value: 1 }),
        ],
      })
    );

    const errorEnumEntry = xdr.ScSpecEntry.scSpecEntryUdtErrorEnumV0(
      new xdr.ScSpecUdtErrorEnumV0({
        doc: "Contract errors",
        lib: "",
        name: "CustomError",
        cases: [
          new xdr.ScSpecUdtErrorEnumCaseV0({
            doc: "Not authorized",
            name: "Unauthorized",
            value: 1,
          }),
          new xdr.ScSpecUdtErrorEnumCaseV0({
            doc: "Insufficient balance",
            name: "Overflow",
            value: 2,
          }),
        ],
      })
    );

    const parsed = parseScSpecEntries([
      fnEntry,
      structEntry,
      unionEntry,
      enumEntry,
      errorEnumEntry,
    ]);

    expect(parsed.functions).toHaveLength(1);
    expect(parsed.functions[0].name).toBe("transfer");
    expect(parsed.functions[0].inputs).toHaveLength(2);
    expect(parsed.functions[0].inputs[0].type).toEqual({ kind: "address" });

    expect(parsed.structs.has("UserProfile")).toBe(true);
    expect(parsed.structs.get("UserProfile")?.fields).toHaveLength(2);

    expect(parsed.unions.has("ActionStatus")).toBe(true);
    expect(parsed.unions.get("ActionStatus")?.cases).toHaveLength(2);

    expect(parsed.enums.has("Role")).toBe(true);
    expect(parsed.enums.get("Role")?.cases).toHaveLength(2);

    expect(parsed.errorEnums.has("CustomError")).toBe(true);
    expect(parsed.errorEnums.get("CustomError")?.cases).toHaveLength(2);
  });

  it("extracts contractspecv0 from fake WASM buffer", () => {
    const fnEntry = xdr.ScSpecEntry.scSpecEntryFunctionV0(
      new xdr.ScSpecFunctionV0({ doc: "", name: "ping", inputs: [], outputs: [] })
    );
    const specData = fnEntry.toXDR();

    const magic = Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
    const sectionName = Buffer.from("contractspecv0");
    const payload = Buffer.concat([Buffer.from([sectionName.length]), sectionName, specData]);
    const section = Buffer.concat([Buffer.from([0x00, payload.length]), payload]);
    const wasm = Buffer.concat([magic, section]);

    const extracted = extractSpecCustomSection(wasm);
    expect(extracted.length).toBeGreaterThan(0);

    const parsed = decodeContractSpec(wasm);
    expect(parsed.functions).toHaveLength(1);
    expect(parsed.functions[0].name).toBe("ping");
  });

  it("encodes inputs to xdr.ScVal for primitives and UDTs", () => {
    const udtRegistry = new Map();
    udtRegistry.set("UserProfile", {
      udtKind: "struct",
      name: "UserProfile",
      lib: "",
      doc: "",
      fields: [
        { name: "name", doc: "", type: { kind: "string" } },
        { name: "age", doc: "", type: { kind: "u32" } },
      ],
    });

    const addr = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
    const addrScVal = encodeInputToScVal(addr, { kind: "address" }, udtRegistry);
    expect(addrScVal.switch().name).toBe("scvAddress");

    const structScVal = encodeInputToScVal(
      { name: "Alice", age: 30 },
      { kind: "udt", name: "UserProfile" },
      udtRegistry
    );
    expect(structScVal.switch().name).toBe("scvMap");

    const vecScVal = encodeInputToScVal(
      [1, 2, 3],
      { kind: "vec", elementType: { kind: "u32" } },
      udtRegistry
    );
    expect(vecScVal.switch().name).toBe("scvVec");
  });

  it("decodes xdr.ScVal to native JS object", () => {
    const scVal = nativeToScVal(42, { type: "u32" });
    const native = decodeResultNative(scVal);
    expect(native).toBe(42);
  });
});
