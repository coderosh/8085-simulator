import { useEffect, useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView, Decoration, type DecorationSet } from "@codemirror/view";
import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";

import { assemblyEditorExtensions } from "@/lib/simulator/assembly-language";

const setHighlightedLine = StateEffect.define<number | undefined>();

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
    padding: "1.25rem 1.5rem",
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
  value: string;
  onChange: (value: string) => void;
};

export function CodeEditor({ activeLine, value, onChange }: CodeEditorProps) {
  const editorRef = useRef<EditorView | null>(null);
  const extensions = useMemo(
    () => [highlightedLineField, ...assemblyEditorExtensions()],
    [],
  );

  useEffect(() => {
    editorRef.current?.dispatch({
      effects: setHighlightedLine.of(activeLine),
    });
  }, [activeLine]);

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
          effects: setHighlightedLine.of(activeLine),
        });
      }}
    />
  );
}
