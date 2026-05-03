import { useEffect, useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import {
  EditorView,
  Decoration,
  hoverTooltip,
  type DecorationSet,
} from "@codemirror/view";
import {
  RangeSetBuilder,
  StateEffect,
  StateField,
  type EditorState,
} from "@codemirror/state";

import { assemblyEditorExtensions } from "@/lib/simulator/assembly-language";
import type { AssemblyErrorDiagnostic } from "@/stores/simulator-store";

const setHighlightedLine = StateEffect.define<number | undefined>();
const setDiagnostic = StateEffect.define<AssemblyErrorDiagnostic | null>();

const highlightedLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(highlights, transaction) {
    for (const effect of transaction.effects) {
      if (!effect.is(setHighlightedLine)) continue;

      const line = effect.value;

      if (!line) {
        return Decoration.none;
      }

      if (line > transaction.state.doc.lines) {
        return Decoration.none;
      }

      const docLine = transaction.state.doc.line(line);
      const builder = new RangeSetBuilder<Decoration>();

      builder.add(
        docLine.from,
        docLine.from,
        Decoration.line({
          class: "cm-current-instruction",
        }),
      );

      return builder.finish();
    }

    return highlights.map(transaction.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

const diagnosticStateField = StateField.define<AssemblyErrorDiagnostic | null>({
  create() {
    return null;
  },
  update(diagnostic, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setDiagnostic)) {
        return effect.value;
      }
    }

    return diagnostic;
  },
});

const diagnosticField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(diagnostics, transaction) {
    for (const effect of transaction.effects) {
      if (!effect.is(setDiagnostic)) continue;

      return buildDiagnosticDecorations(transaction.state, effect.value);
    }

    return diagnostics.map(transaction.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

const diagnosticTooltip = hoverTooltip((view, position) => {
  const diagnostic = view.state.field(diagnosticStateField);

  if (!diagnostic) {
    return null;
  }

  const range = getDiagnosticRange(view.state, diagnostic);

  if (position < range.from || position > range.to) {
    return null;
  }

  return {
    pos: range.from,
    end: range.to,
    above: true,
    create() {
      const container = document.createElement("div");
      container.className = "cm-assembly-error-tooltip";

      const label = document.createElement("div");
      label.className = "cm-assembly-error-tooltip-label";
      label.textContent = diagnostic.severity;

      const message = document.createElement("div");
      message.className = "cm-assembly-error-tooltip-message";
      message.textContent = diagnostic.message;

      container.append(label, message);

      return { dom: container };
    },
  };
});

const simulatorEditorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--card)",
    color: "var(--card-foreground)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.875rem",
  },
  ".cm-editor": {
    height: "100%",
    minHeight: "0",
    backgroundColor: "var(--card)",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "1.75rem",
    backgroundColor: "var(--card)",
  },
  ".cm-content": {
    padding: "1rem",
    caretColor: "var(--primary)",
  },
  ".cm-gutters": {
    backgroundColor: "color-mix(in oklab, var(--muted) 36%, transparent)",
    color: "var(--muted-foreground)",
    borderRight: "1px solid var(--border)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "3rem",
    padding: "0 0.75rem 0 0",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  ".cm-line": {
    color: "var(--card-foreground)",
  },
  ".cm-current-instruction": {
    backgroundColor: "color-mix(in oklab, var(--primary) 14%, transparent)",
    color: "var(--primary)",
  },
  ".cm-assembly-error-line": {
    backgroundColor: "color-mix(in oklab, var(--destructive) 12%, transparent)",
  },
  ".cm-assembly-error-range": {
    cursor: "help",
    textDecoration: "underline wavy var(--destructive)",
    textUnderlineOffset: "0.2rem",
  },
  ".cm-assembly-error-tooltip": {
    maxWidth: "min(28rem, calc(100vw - 2rem))",
    border: "1px solid color-mix(in oklab, var(--destructive) 45%, transparent)",
    borderRadius: "var(--radius-lg)",
    backgroundColor: "color-mix(in oklab, var(--card) 94%, var(--destructive))",
    boxShadow: "var(--shadow-xl)",
    color: "var(--card-foreground)",
    padding: "0.75rem",
  },
  ".cm-tooltip:has(.cm-assembly-error-tooltip)": {
    border: "0",
    borderRadius: "var(--radius-lg)",
    backgroundColor: "transparent",
    boxShadow: "none",
  },
  ".cm-tooltip:has(.cm-assembly-error-tooltip) .cm-tooltip-arrow::before, .cm-tooltip:has(.cm-assembly-error-tooltip) .cm-tooltip-arrow::after": {
    borderTopColor: "color-mix(in oklab, var(--card) 94%, var(--destructive))",
    borderBottomColor: "color-mix(in oklab, var(--card) 94%, var(--destructive))",
  },
  ".cm-assembly-error-tooltip-label": {
    marginBottom: "0.35rem",
    width: "fit-content",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--destructive)",
    color: "var(--destructive-foreground)",
    fontFamily: "var(--font-sans)",
    fontSize: "0.6875rem",
    fontWeight: "700",
    letterSpacing: "0.08em",
    lineHeight: "1rem",
    padding: "0.125rem 0.4rem",
    textTransform: "uppercase",
  },
  ".cm-assembly-error-tooltip-message": {
    color: "var(--card-foreground)",
    fontFamily: "var(--font-sans)",
    fontSize: "0.8125rem",
    lineHeight: "1.25rem",
    whiteSpace: "normal",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--primary)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "color-mix(in oklab, var(--primary) 20%, transparent) !important",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-matchingBracket, .cm-nonmatchingBracket": {
    backgroundColor: "color-mix(in oklab, var(--accent) 16%, transparent)",
    color: "var(--accent)",
  },
  ".cm-searchMatch": {
    backgroundColor: "color-mix(in oklab, var(--accent) 20%, transparent)",
  },
  ".cm-searchMatch-selected": {
    backgroundColor: "color-mix(in oklab, var(--primary) 24%, transparent)",
  },
});

type CodeEditorProps = {
  activeLine?: number;
  diagnostic?: AssemblyErrorDiagnostic | null;
  value: string;
  onChange: (value: string) => void;
};

export function CodeEditor({
  activeLine,
  diagnostic = null,
  value,
  onChange,
}: CodeEditorProps) {
  const editorRef = useRef<EditorView | null>(null);
  const extensions = useMemo(
    () => [
      highlightedLineField,
      diagnosticStateField,
      diagnosticField,
      diagnosticTooltip,
      ...assemblyEditorExtensions(),
    ],
    [],
  );

  useEffect(() => {
    editorRef.current?.dispatch({
      effects: setHighlightedLine.of(activeLine),
    });
  }, [activeLine]);

  useEffect(() => {
    editorRef.current?.dispatch({
      effects: setDiagnostic.of(diagnostic),
    });
  }, [diagnostic]);

  return (
    <CodeMirror
      className="h-full min-h-0"
      value={value}
      height="100%"
      basicSetup={{
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
      }}
      theme={simulatorEditorTheme}
      extensions={extensions}
      onChange={onChange}
      onCreateEditor={(view) => {
        editorRef.current = view;
        view.dispatch({
          effects: [
            setHighlightedLine.of(activeLine),
            setDiagnostic.of(diagnostic),
          ],
        });
      }}
    />
  );
}

function buildDiagnosticDecorations(
  viewState: EditorState,
  diagnostic: AssemblyErrorDiagnostic | null,
): DecorationSet {
  if (!diagnostic) {
    return Decoration.none;
  }

  const builder = new RangeSetBuilder<Decoration>();
  const { from, to } = getDiagnosticRange(viewState, diagnostic);
  const line = viewState.doc.lineAt(from);

  builder.add(
    line.from,
    line.from,
    Decoration.line({ class: "cm-assembly-error-line" }),
  );
  if (to > from) {
    builder.add(
      from,
      to,
      Decoration.mark({
        attributes: {
          "aria-label": diagnostic.message,
        },
        class: "cm-assembly-error-range",
      }),
    );
  }

  return builder.finish();
}

function getDiagnosticRange(
  viewState: EditorState,
  diagnostic: AssemblyErrorDiagnostic,
) {
  const docLength = viewState.doc.length;
  const from = Math.max(0, Math.min(diagnostic.span.start.offset, docLength));
  const rawTo = Math.max(from, Math.min(diagnostic.span.end.offset, docLength));
  const to = rawTo === from ? Math.min(from + 1, docLength) : rawTo;

  return { from, to };
}
