import { memo, useEffect, useMemo, useState } from "react";
import { Binary, Braces, ListTree } from "lucide-react";

import type {
  CommentNode,
  InstructionNode,
  Node,
  OrgNode,
  Operand,
  ProgramNode,
  SourceSpan,
} from "@/core/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatByte, formatWord } from "@/lib/simulator/format";
import { cn } from "@/lib/utils";
import { useSimulatorStore } from "@/stores";

type AstPrimitive = {
  kind: "primitive";
  type: "string" | "number" | "null";
  value: string | number | null;
};

type AstObject = {
  kind: "object";
  entries: AstProperty[];
  name?: string;
  span?: SourceSpan;
};

type AstArray = {
  kind: "array";
  items: AstValue[];
  span?: SourceSpan;
};

type AstValue = AstPrimitive | AstObject | AstArray;

type AstProperty = {
  key: string;
  value: AstValue;
  span?: SourceSpan;
};

export const AssembledPanel = memo(function AssembledPanel() {
  const activeAddress = useSimulatorStore((state) => state.activeAddress);
  const ast = useSimulatorStore((state) => state.ast);
  const astError = useSimulatorStore((state) => state.astError);
  const byteCount = useSimulatorStore((state) => state.result.bytes.length);
  const outputExplorerTab = useSimulatorStore((state) => state.outputExplorerTab);
  const rows = useSimulatorStore((state) => state.rows);
  const setAstHoverSpan = useSimulatorStore((state) => state.setAstHoverSpan);
  const setOutputExplorerTab = useSimulatorStore(
    (state) => state.setOutputExplorerTab,
  );

  useEffect(() => {
    if (outputExplorerTab !== "ast") {
      setAstHoverSpan(null);
    }
  }, [outputExplorerTab, setAstHoverSpan]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-[3.25rem] shrink-0 items-center justify-between gap-3 border-b px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <Braces />
          <h2 className="truncate font-serif text-lg font-semibold">
            Assembly Explorer
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="xs"
            variant={outputExplorerTab === "assembled" ? "secondary" : "ghost"}
            aria-pressed={outputExplorerTab === "assembled"}
            onClick={() => setOutputExplorerTab("assembled")}
          >
            <Binary data-icon="inline-start" />
            Bytes
          </Button>
          <Button
            size="xs"
            variant={outputExplorerTab === "ast" ? "secondary" : "ghost"}
            aria-pressed={outputExplorerTab === "ast"}
            onClick={() => setOutputExplorerTab("ast")}
          >
            <ListTree data-icon="inline-start" />
            AST
          </Button>
        </div>
      </div>

      {outputExplorerTab === "assembled" ? (
        <>
          <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b px-3 sm:px-5">
            <div className="text-sm font-medium">Assembled Code</div>
            <Badge variant="secondary">{byteCount} bytes</Badge>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-3 sm:p-5">
              {rows.map((row) => (
                <div
                  key={`${row.address}-${row.line}`}
                  className={cn(
                    "grid grid-cols-[3.5rem_5rem_minmax(0,1fr)] items-center border-b px-1 py-3 font-mono text-xs sm:grid-cols-[3.75rem_6rem_minmax(0,1fr)] sm:text-sm",
                    activeAddress >= row.address &&
                      activeAddress < row.address + row.bytes.length &&
                      "bg-primary/10 text-primary",
                  )}
                >
                  <span className="text-muted-foreground">
                    {formatWord(row.address)}
                  </span>
                  <span className="font-semibold">
                    {row.bytes.map(formatByte).join(" ")}
                  </span>
                  <span className="truncate text-muted-foreground">{row.source}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      ) : (
        <AstPanel ast={ast} astError={astError} />
      )}
    </div>
  );
});

function AstPanel({
  ast,
  astError,
}: {
  ast: ProgramNode | null;
  astError: string | null;
}) {
  const setAstHoverSpan = useSimulatorStore((state) => state.setAstHoverSpan);
  const tree = useMemo(() => (ast ? programToAstValue(ast) : null), [ast]);
  const nodeCount = useMemo(() => (tree ? countAstNodes(tree) : 0), [tree]);

  if (!ast) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b px-3 sm:px-5">
          <div className="text-sm font-medium">Abstract Syntax Tree</div>
          <Badge variant="outline">Unavailable</Badge>
        </div>
        <div className="flex flex-1 items-center px-4 py-5 sm:px-5">
          <p className="text-sm leading-6 text-muted-foreground">
            {astError ?? "AST unavailable for the current editor contents."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b px-3 sm:px-5">
        <div className="text-sm font-medium">Abstract Syntax Tree</div>
        <Badge variant="secondary">{nodeCount} nodes</Badge>
      </div>
      <ScrollArea
        className="min-h-0 flex-1 bg-background text-foreground"
        onMouseLeave={() => setAstHoverSpan(null)}
      >
        <div className="min-w-max px-3 py-2 font-mono text-[13px] leading-6">
          {tree ? (
            <AstValueRow value={tree} depth={0} onHover={setAstHoverSpan} />
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}

function AstValueRow({
  depth,
  onHover,
  propertyKey,
  value,
}: {
  depth: number;
  onHover: (span: SourceSpan | null) => void;
  propertyKey?: string;
  value: AstValue;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const astHoverSpan = useSimulatorStore((state) => state.astHoverSpan);
  const span = value.kind === "primitive" ? undefined : value.span;
  const isActive =
    span &&
    astHoverSpan?.start.offset === span.start.offset &&
    astHoverSpan?.end.offset === span.end.offset;
  const nodeHoverSpan = value.kind === "object" && value.name ? span : null;
  const isExpandable =
    value.kind === "object"
      ? value.entries.length > 0
      : value.kind === "array"
        ? value.items.length > 0
        : false;
  const indentation = `${depth * 1.5}rem`;

  if (value.kind === "primitive") {
    return (
      <div className="whitespace-nowrap px-1" style={{ paddingLeft: indentation }}>
        {propertyKey ? <AstKey name={propertyKey} /> : null}
        <AstPrimitiveValue value={value} />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-1 whitespace-nowrap rounded-sm px-1 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        style={{ paddingLeft: indentation }}
        onBlur={() => onHover(null)}
        onClick={() => {
          if (isExpandable) {
            setCollapsed((value) => !value);
          }
        }}
      >
        <span
          className={cn(
            "w-3 text-center text-sm leading-none",
            collapsed ? "text-emerald-500" : "text-destructive",
          )}
        >
          {isExpandable ? (collapsed ? "+" : "-") : ""}
        </span>
        <span className="min-w-0 flex-1 truncate">
          {propertyKey ? <AstKey name={propertyKey} /> : null}
          {value.kind === "object" && value.name ? (
            <span
              className={cn(
                "text-primary underline-offset-4",
                isActive && "underline decoration-primary decoration-2",
              )}
              onMouseEnter={() => onHover(nodeHoverSpan ?? null)}
              onMouseLeave={() => onHover(null)}
            >
              {value.name}
            </span>
          ) : null}
          <span className="ml-1 text-muted-foreground">
            {value.kind === "object" ? "{" : "["}
          </span>
          {collapsed ? <AstSummary value={value} /> : null}
        </span>
      </button>
      {!collapsed ? (
        <div>
          {value.kind === "object"
            ? value.entries.map((entry) => (
                <AstValueRow
                  key={entry.key}
                  depth={depth + 1}
                  onHover={onHover}
                  propertyKey={entry.key}
                  value={entry.value}
                />
              ))
            : value.items.map((item, index) => (
                <AstValueRow
                  key={index}
                  depth={depth + 1}
                  onHover={onHover}
                  value={item}
                />
              ))}
          <div
            className="whitespace-nowrap px-1 text-muted-foreground"
            style={{ paddingLeft: indentation }}
          >
            {value.kind === "object" ? "}" : "]"}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AstKey({ name }: { name: string }) {
  return <span className="text-amber-500">{name}: </span>;
}

function AstPrimitiveValue({ value }: { value: AstPrimitive }) {
  if (value.type === "null") {
    return <span className="text-cyan-500">null</span>;
  }

  if (value.type === "string") {
    return <span className="text-cyan-500">"{value.value}"</span>;
  }

  return <span className="text-cyan-500">{value.value}</span>;
}

function AstSummary({ value }: { value: AstObject | AstArray }) {
  if (value.kind === "array") {
    return (
      <span className="ml-2 text-muted-foreground/80 italic">
        {value.items.length} element{value.items.length === 1 ? "" : "s"}]
      </span>
    );
  }

  const keys = value.entries.slice(0, 4).map((entry) => entry.key);
  const extra = value.entries.length > keys.length ? ", ..." : "";

  return (
    <span className="ml-2 text-muted-foreground/80 italic">
      {keys.join(", ")}
      {extra}
      {"}"}
    </span>
  );
}

function programToAstValue(ast: ProgramNode): AstObject {
  return {
    kind: "object",
    name: "Program",
    span: ast.span,
    entries: [
      property("type", stringValue("Program")),
      property("loc", locToAstValue(ast.span), ast.span),
      property("body", arrayValue(ast.body.map(nodeToAstValue), ast.span), ast.span),
      property(
        "comments",
        arrayValue((ast.comments ?? []).map(commentToAstValue), ast.span),
        ast.span,
      ),
    ],
  };
}

function nodeToAstValue(node: Node): AstObject {
  switch (node.type) {
    case "program":
      return programToAstValue(node);
    case "instruction":
      return instructionToAstValue(node);
    case "label":
      return objectValue("Label", node.span, [
        property("type", stringValue("Label")),
        property("loc", locToAstValue(node.span), node.span),
        property("name", stringValue(node.name)),
      ]);
    case "org":
      return orgToAstValue(node);
  }
}

function instructionToAstValue(node: InstructionNode): AstObject {
  return objectValue("Instruction", node.span, [
    property("type", stringValue("Instruction")),
    property("loc", locToAstValue(node.span), node.span),
    property("mnemonic", stringValue(node.mnemonic)),
    property("operands", arrayValue(node.operands.map(operandToAstValue), node.span), node.span),
  ]);
}

function orgToAstValue(node: OrgNode): AstObject {
  return objectValue("Org", node.span, [
    property("type", stringValue("Org")),
    property("loc", locToAstValue(node.span), node.span),
    property("address", numberValue(node.address)),
  ]);
}

function operandToAstValue(operand: Operand): AstObject {
  return objectValue(capitalize(operand.type), operand.span, [
    property("type", stringValue(capitalize(operand.type))),
    property("loc", locToAstValue(operand.span), operand.span),
    property(
      "value",
      operand.type === "number"
        ? numberValue(operand.value)
        : stringValue(operand.value),
    ),
  ]);
}

function commentToAstValue(comment: CommentNode): AstObject {
  return objectValue("Comment", comment.span, [
    property("type", stringValue("Comment")),
    property("loc", locToAstValue(comment.span), comment.span),
    property("value", stringValue(comment.value)),
    property("placement", stringValue(comment.placement)),
  ]);
}

function locToAstValue(span: SourceSpan): AstObject {
  return objectValue(undefined, span, [
    property("source", nullValue()),
    property("start", positionToAstValue(span.start.line, span.start.column)),
    property("end", positionToAstValue(span.end.line, span.end.column)),
  ]);
}

function positionToAstValue(line: number, column: number): AstObject {
  return objectValue(undefined, undefined, [
    property("line", numberValue(line)),
    property("column", numberValue(column)),
  ]);
}

function objectValue(
  name: string | undefined,
  span: SourceSpan | undefined,
  entries: AstProperty[],
): AstObject {
  return {
    kind: "object",
    name,
    span,
    entries,
  };
}

function arrayValue(items: AstValue[], span?: SourceSpan): AstArray {
  return {
    kind: "array",
    span,
    items,
  };
}

function property(key: string, value: AstValue, span?: SourceSpan): AstProperty {
  return { key, value, span };
}

function stringValue(value: string): AstPrimitive {
  return { kind: "primitive", type: "string", value };
}

function numberValue(value: number): AstPrimitive {
  return { kind: "primitive", type: "number", value };
}

function nullValue(): AstPrimitive {
  return { kind: "primitive", type: "null", value: null };
}

function countAstNodes(value: AstValue): number {
  if (value.kind === "primitive") {
    return 1;
  }

  if (value.kind === "array") {
    return 1 + value.items.reduce((total, item) => total + countAstNodes(item), 0);
  }

  return (
    1 +
    value.entries.reduce(
      (total, entry) => total + countAstNodes(entry.value),
      0,
    )
  );
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
