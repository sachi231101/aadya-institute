import { test, describe } from "node:test";
import assert from "node:assert";
import {
  applyTemplateVariableMap,
  getVariableMapFromConfig,
  invalidVariableMapTargets,
  isVariableMapComplete,
} from "../modules/whatsapp/variable-map.util";
import { getAutomationMeta } from "../modules/whatsapp/whatsapp.constants";

describe("applyTemplateVariableMap", () => {
  test("fills MSG91 slots from semantic Aadya fields", () => {
    const result = applyTemplateVariableMap(
      {
        student_name: "Rahul Sharma",
        amount: "15000",
        due_date: "15 Sep 2026",
        course_name: "Full Stack",
      },
      { var_1: "student_name", var_2: "amount", var_3: "due_date" },
      ["var_1", "var_2", "var_3"]
    );
    assert.strictEqual(result.var_1, "Rahul Sharma");
    assert.strictEqual(result.var_2, "15000");
    assert.strictEqual(result.var_3, "15 Sep 2026");
    assert.strictEqual(result.student_name, "Rahul Sharma");
  });

  test("leaves slots empty when map or source value missing", () => {
    const result = applyTemplateVariableMap(
      { student_name: "Rahul" },
      { var_1: "student_name", var_2: "amount" },
      ["var_1", "var_2"]
    );
    assert.strictEqual(result.var_1, "Rahul");
    assert.ok(result.var_2 === undefined);
  });

  test("returns semantic params unchanged when map empty", () => {
    const semantic = { student_name: "A" };
    const result = applyTemplateVariableMap(semantic, {}, ["var_1"]);
    assert.deepStrictEqual(result, semantic);
  });
});

describe("variable map completeness and validation", () => {
  test("isVariableMapComplete requires every slot", () => {
    assert.strictEqual(isVariableMapComplete(["var_1", "var_2"], { var_1: "a" }), false);
    assert.strictEqual(
      isVariableMapComplete(["var_1", "var_2"], { var_1: "a", var_2: "b" }),
      true
    );
    assert.strictEqual(isVariableMapComplete([], {}), true);
  });

  test("invalidVariableMapTargets flags fields outside automation catalog", () => {
    const feeFields = Object.keys(getAutomationMeta("FEE_DUE_REMINDER")!.sampleVariables);
    const welcomeFields = Object.keys(getAutomationMeta("STUDENT_WELCOME")!.sampleVariables);
    assert.ok(feeFields.includes("amount"));
    assert.ok(!welcomeFields.includes("amount"));

    const bad = invalidVariableMapTargets(
      { var_1: "amount", var_2: "student_name" },
      welcomeFields
    );
    assert.ok(bad.some((x) => x.includes("amount")));
  });

  test("getVariableMapFromConfig extracts cleaned map", () => {
    assert.deepStrictEqual(
      getVariableMapFromConfig({
        daysBeforeDue: 1,
        variableMap: { var_1: " student_name ", var_2: "" },
      }),
      { var_1: "student_name" }
    );
  });
});

describe("configuration merge preserves timing keys", () => {
  test("spread merge keeps daysBeforeDue when updating variableMap", () => {
    const existing = { daysBeforeDue: 1, offsetMinutes: -120 };
    const next = {
      ...existing,
      variableMap: { var_1: "amount", var_2: "due_date" },
    };
    assert.strictEqual(next.daysBeforeDue, 1);
    assert.strictEqual(next.offsetMinutes, -120);
    assert.strictEqual(next.variableMap.var_1, "amount");
  });
});
