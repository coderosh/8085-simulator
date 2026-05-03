import { ChevronDown, ChevronUp, FileCode2, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";

import { CodeEditor } from "./code-editor";

type EditorPanelProps = {
  activeLine?: number;
  consoleOpen: boolean;
  message: string;
  source: string;
  onConsoleToggle: () => void;
  onSourceChange: (source: string) => void;
};

export function EditorPanel({
  activeLine,
  consoleOpen,
  message,
  source,
  onConsoleToggle,
  onSourceChange,
}: EditorPanelProps) {
  return (
    <section className="grid h-full min-h-0 grid-rows-[3.25rem_minmax(0,1fr)_auto] bg-card">
      <div className="flex items-center justify-between border-b px-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileCode2 />
          main.asm
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={consoleOpen ? "secondary" : "ghost"}
            aria-pressed={consoleOpen}
            onClick={onConsoleToggle}
          >
            <Terminal data-icon="inline-start" />
            {consoleOpen ? (
              <ChevronDown data-icon="inline-end" />
            ) : (
              <ChevronUp data-icon="inline-end" />
            )}
            <span className="sr-only">Toggle console</span>
          </Button>
        </div>
      </div>

      <div className="h-full min-h-0 overflow-hidden">
        <CodeEditor
          activeLine={activeLine}
          value={source}
          onChange={onSourceChange}
        />
      </div>
      {consoleOpen ? (
        <div className="h-32 border-t bg-background">
          <div className="flex h-10 items-center justify-between border-b px-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Terminal />
              Console
            </div>
          </div>
          <div className="h-[calc(8rem-2.5rem)] overflow-auto px-5 py-3 font-mono text-sm text-muted-foreground">
            {message}
          </div>
        </div>
      ) : null}
    </section>
  );
}
