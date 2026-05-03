import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { tags } from "@lezer/highlight";

import { MNEMONICS, REGISTERS } from "@/core/constants";

type AssemblyParserState = Record<string, never>;

const labelPattern = /^[A-Za-z_][A-Za-z_0-9]*(?=\s*:)/;
const wordPattern = /^[A-Za-z_][A-Za-z_0-9]*/;
const hexPrefixPattern = /^0x[\dA-Fa-f]+/;
const hexSuffixPattern = /^[\dA-Fa-f]+[Hh]\b/;
const decimalPattern = /^\d+/;

const assemblyHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--primary)", fontWeight: "600" },
  { tag: tags.atom, color: "var(--accent-foreground)", fontWeight: "600" },
  { tag: tags.number, color: "oklch(0.7859 0.1342 83.6986)" },
  { tag: tags.labelName, color: "oklch(0.7124 0.0606 248.6896)", fontWeight: "600" },
  { tag: tags.variableName, color: "var(--card-foreground)" },
  { tag: tags.comment, color: "var(--muted-foreground)", fontStyle: "italic" },
  { tag: tags.punctuation, color: "var(--muted-foreground)" },
]);

const assemblyLanguage = StreamLanguage.define<AssemblyParserState>({
  name: "8085-assembly",
  token(stream) {
    if (stream.eatSpace()) return null;

    if (stream.peek() === ";") {
      stream.skipToEnd();
      return "comment";
    }

    if (stream.match(labelPattern)) {
      return "labelName";
    }

    if (stream.match(hexPrefixPattern) || stream.match(hexSuffixPattern)) {
      return "number";
    }

    if (stream.match(decimalPattern)) {
      return "number";
    }

    const word = stream.match(wordPattern);

    if (word && word !== true) {
      const upperWord = word[0].toUpperCase();

      if (MNEMONICS.has(upperWord)) return "keyword";
      if (REGISTERS.has(upperWord)) return "atom";

      return "variableName";
    }

    stream.next();
    return "punctuation";
  },
  languageData: {
    commentTokens: {
      line: ";",
    },
  },
});

export function assemblyEditorExtensions(): Extension[] {
  return [
    assemblyLanguage,
    syntaxHighlighting(assemblyHighlightStyle),
  ];
}
