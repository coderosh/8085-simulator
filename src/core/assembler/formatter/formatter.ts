import type {
  CommentNode,
  InstructionNode,
  LabelNode,
  Node,
  Operand,
  OrgNode,
  ProgramNode,
} from "@core/types";

export type FormatterCase = "preserve" | "upper" | "lower";

export type FormatterOptions = {
  directiveCase?: FormatterCase;
  identifierCase?: FormatterCase;
  indent?: string;
  inlineCommentColumn?: number;
  instructionCase?: FormatterCase;
  labelMode?: "preserve" | "sameLine" | "ownLine";
  normalizeCommentSpacing?: boolean;
  numberBase?: "hex" | "decimal";
  operandSeparator?: string;
  registerCase?: FormatterCase;
  tabWidth?: number;
};

const defaultFormatterOptions = {
  directiveCase: "upper",
  identifierCase: "preserve",
  indent: "  ",
  inlineCommentColumn: 32,
  instructionCase: "upper",
  labelMode: "preserve",
  normalizeCommentSpacing: true,
  numberBase: "hex",
  operandSeparator: ", ",
  registerCase: "upper",
  tabWidth: 4,
} satisfies Required<FormatterOptions>;

type FormatContext = Required<FormatterOptions> & {
  instructionColumn: number;
};

export function formatProgram(
  program: ProgramNode,
  options: FormatterOptions = {},
): string {
  const formatterOptions = { ...defaultFormatterOptions, ...options };
  const context = {
    ...formatterOptions,
    instructionColumn: getInstructionColumn(program, formatterOptions),
  };
  const lines: string[] = [];
  const comments = [...(program.comments ?? [])].sort(
    (left, right) => left.span.start.offset - right.span.start.offset,
  );
  const inlineComments = comments.reduce<Map<number, CommentNode[]>>(
    (map, comment) => {
      if (comment.placement === "inline" && comment.afterNodeIndex !== undefined) {
        const existing = map.get(comment.afterNodeIndex) ?? [];
        existing.push(comment);
        map.set(comment.afterNodeIndex, existing);
      }

      return map;
    },
    new Map(),
  );
  const ownLineComments = comments.filter(
    (comment) => comment.placement === "ownLine",
  );
  let commentCursor = 0;
  let nodeIndex = 0;

  while (nodeIndex < program.body.length) {
    const node = program.body[nodeIndex];

    while (
      commentCursor < ownLineComments.length &&
      ownLineComments[commentCursor].span.start.offset < node.span.start.offset
    ) {
      lines.push(formatOwnLineComment(ownLineComments[commentCursor], context));
      commentCursor++;
    }

    const nextNode = program.body[nodeIndex + 1];

    if (node.type === "label" && shouldJoinLabel(node, nextNode, context)) {
      lines.push(
        withInlineComments(
          `${formatLabel(node, context).padEnd(context.instructionColumn)}${formatNode(
            nextNode,
            context,
            false,
          )}`,
          [
            ...(inlineComments.get(nodeIndex) ?? []),
            ...(inlineComments.get(nodeIndex + 1) ?? []),
          ],
          context,
        ),
      );
      nodeIndex += 2;
      continue;
    }

    lines.push(
      withInlineComments(
        formatNode(node, context),
        inlineComments.get(nodeIndex) ?? [],
        context,
      ),
    );
    nodeIndex++;
  }

  while (commentCursor < ownLineComments.length) {
    lines.push(formatOwnLineComment(ownLineComments[commentCursor], context));
    commentCursor++;
  }

  return lines.join("\n");
}

function shouldJoinLabel(
  label: LabelNode,
  nextNode: Node | undefined,
  context: FormatContext,
): nextNode is InstructionNode | OrgNode {
  if (!nextNode || nextNode.type === "label" || nextNode.type === "program") {
    return false;
  }

  if (context.labelMode === "sameLine") {
    return true;
  }

  if (context.labelMode === "ownLine") {
    return false;
  }

  return label.span.start.line === nextNode.span.start.line;
}

function getInstructionColumn(
  program: ProgramNode,
  options: Required<FormatterOptions>,
): number {
  const longestLabel = program.body.reduce((length, node) => {
    if (node.type !== "label") {
      return length;
    }

    return Math.max(length, `${applyCase(node.name, options.identifierCase)}:`.length);
  }, 0);

  return longestLabel > 0 ? longestLabel + options.tabWidth : options.indent.length;
}

function formatNode(
  node: Node,
  context: FormatContext,
  includeIndent = true,
): string {
  if (node.type === "label") {
    return formatLabel(node, context);
  }

  const prefix = includeIndent ? " ".repeat(context.instructionColumn) : "";

  if (node.type === "org") {
    return `${prefix}${applyCase("ORG", context.directiveCase)} ${formatNumber(
      node.address,
      context,
      4,
    )}`;
  }

  if (node.type === "instruction") {
    return `${prefix}${applyCase(node.mnemonic, context.instructionCase)}${formatOperands(
      node.operands,
      context,
    )}`;
  }

  return "";
}

function formatLabel(node: LabelNode, context: FormatContext): string {
  return `${applyCase(node.name, context.identifierCase)}:`;
}

function formatOperands(operands: Operand[], context: FormatContext): string {
  if (operands.length === 0) {
    return "";
  }

  return ` ${operands.map((operand) => formatOperand(operand, context)).join(context.operandSeparator)}`;
}

function formatOperand(operand: Operand, context: FormatContext): string {
  if (operand.type === "register") {
    return applyCase(operand.value, context.registerCase);
  }

  if (operand.type === "identifier") {
    return applyCase(operand.value, context.identifierCase);
  }

  return formatNumber(operand.value, context);
}

function formatNumber(value: number, context: FormatContext, minHexDigits = 2): string {
  if (context.numberBase === "decimal") {
    return String(value);
  }

  const hex = value.toString(16).toUpperCase().padStart(minHexDigits, "0");
  const safeHex = /^[A-F]/.test(hex) ? `0${hex}` : hex;

  return `${safeHex}H`;
}

function formatOwnLineComment(
  comment: CommentNode,
  context: FormatContext,
): string {
  return normalizeComment(comment.value, context);
}

function withInlineComments(
  line: string,
  comments: CommentNode[],
  context: FormatContext,
): string {
  if (comments.length === 0) {
    return line;
  }

  const commentText = comments
    .map((comment) => normalizeComment(comment.value, context))
    .join(" ");
  const gap = Math.max(1, context.inlineCommentColumn - line.length - 1);

  return `${line}${" ".repeat(gap)}${commentText}`;
}

function normalizeComment(value: string, context: FormatContext): string {
  if (!context.normalizeCommentSpacing) {
    return value;
  }

  const text = value.startsWith(";") ? value.slice(1).trim() : value.trim();

  return text ? `; ${text}` : ";";
}

function applyCase(value: string, formatterCase: FormatterCase): string {
  if (formatterCase === "upper") {
    return value.toUpperCase();
  }

  if (formatterCase === "lower") {
    return value.toLowerCase();
  }

  return value;
}
