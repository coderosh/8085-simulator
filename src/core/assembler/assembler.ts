import { CodeGen } from "./codegen";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

export const assemble = (src: string) => {
  const tokens = new Tokenizer(src).getAllTokens();
  const ast = new Parser(tokens).parse();
  const codes = new CodeGen(ast).generate();

  return codes;
};
