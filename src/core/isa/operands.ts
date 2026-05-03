import {
  REGISTER_CODES,
  REGISTER_PAIR_BD_CODES,
  REGISTER_PAIR_CODES,
  STACK_REGISTER_PAIR_CODES,
} from "@core/constants";
import type {
  DecodedOperand,
  OperandKind,
  ResolvedOperand,
} from "@core/types";
import { lowerByte, toWord } from "@core/utils";

export type OperandCandidate = ResolvedOperand & DecodedOperand;

export function operandCombinations(
  kinds: readonly OperandKind[],
): OperandCandidate[][] {
  return kinds.reduce<OperandCandidate[][]>(
    (combinations, kind) =>
      combinations.flatMap((combination) =>
        operandCandidates(kind).map((candidate) => [
          ...combination,
          candidate,
        ]),
      ),
    [[]],
  );
}

export function resolveImmediateOperand(
  operand: DecodedOperand,
  bytes: ArrayLike<number>,
): DecodedOperand {
  if (operand.kind === "byte" || operand.kind === "port") {
    const value = lowerByte(bytes[0] ?? 0);

    return {
      ...operand,
      value,
      code: value,
    };
  }

  if (operand.kind === "word" || operand.kind === "address") {
    const value = toWord(bytes[1] ?? 0, bytes[0] ?? 0);

    return {
      ...operand,
      value,
      code: value,
    };
  }

  return operand;
}

function operandCandidates(kind: OperandKind): OperandCandidate[] {
  if (kind === "register") {
    return namedOperandCandidates("register", REGISTER_CODES);
  }

  if (kind === "registerPair") {
    return namedOperandCandidates("registerPair", REGISTER_PAIR_CODES);
  }

  if (kind === "registerPairBD") {
    return namedOperandCandidates(
      "registerPairBD",
      Object.fromEntries(
        Object.entries(REGISTER_PAIR_CODES).filter(([, code]) =>
          REGISTER_PAIR_BD_CODES.includes(
            code as (typeof REGISTER_PAIR_BD_CODES)[number],
          ),
        ),
      ),
    );
  }

  if (kind === "stackRegisterPair") {
    return namedOperandCandidates("stackRegisterPair", STACK_REGISTER_PAIR_CODES);
  }

  if (
    kind === "byte" ||
    kind === "word" ||
    kind === "address" ||
    kind === "port"
  ) {
    return [
      {
        kind,
        value: 0,
        code: 0,
      },
    ];
  }

  return Array.from({ length: 8 }, (_, code) => ({
    kind,
    value: code,
    code,
  }));
}

function namedOperandCandidates(
  kind: Extract<
    DecodedOperand["kind"],
    "register" | "registerPair" | "registerPairBD" | "stackRegisterPair"
  >,
  codes: Record<string, number>,
): OperandCandidate[] {
  return Object.entries(codes).map(([value, code]) => ({
    kind,
    value,
    code,
  }));
}
