import { AbstractParser, EnclosingContext } from "../../constants";
import Parser = require("web-tree-sitter");
let parser: Parser;

// Initialize Tree-sitter parser
async function initializeParser() {
  if (!parser) {
    await Parser.init();
    parser = new Parser();
    // You'll need to load the WASM file from your node_modules
    const Lang = await Parser.Language.load(
      "/Users/sruthi/Documents/My projects/HEADSTARTER/SecureAgent-1/node_modules/tree-sitter-python/tree-sitter-python.wasm"
    );
    parser.setLanguage(Lang);
  }
  return parser;
}

// Utility function to process nodes and find the largest enclosing context
const processPythonNode = (
  node: Parser.SyntaxNode,
  lineStart: number,
  lineEnd: number,
  largestSize: number,
  largestEnclosingContext: Parser.SyntaxNode | null
) => {
  const startPosition = node.startPosition;
  const endPosition = node.endPosition;

  if (startPosition.row + 1 <= lineStart && lineEnd <= endPosition.row + 1) {
    const size = endPosition.row - startPosition.row;
    if (size > largestSize) {
      largestSize = size;
      largestEnclosingContext = node;
    }
  }

  return { largestSize, largestEnclosingContext };
};

export class PythonParser implements AbstractParser {
  private parser: Parser;

  // Initialize Tree-sitter parser with Python language
  private async getParser(): Promise<Parser> {
    console.log("🔍 Getting Python parser...");
    return await initializeParser();
  }

  findEnclosingContext(
    file: string,
    lineStart: number,
    lineEnd: number
  ): EnclosingContext {
    console.log("Parsing Python file...");
    console.log("Parser state:", parser);
    console.log("Parser language:", parser.getLanguage());

    const tree = parser.parse(file);

    let largestEnclosingContext: Parser.SyntaxNode | null = null;
    let largestSize = 0;

    console.log(
      `Searching for context between lines ${lineStart} and ${lineEnd}`
    );

    const traverseNode = (node: Parser.SyntaxNode) => {
      ({ largestSize, largestEnclosingContext } = processPythonNode(
        node,
        lineStart,
        lineEnd,
        largestSize,
        largestEnclosingContext
      ));

      // Recursively traverse child nodes
      for (let i = 0; i < node.childCount; i++) {
        traverseNode(node.child(i));
      }
    };

    console.log("Starting AST traversal...");
    traverseNode(tree.rootNode);

    console.log(
      "Traversal complete. Largest context found:",
      largestEnclosingContext
    );

    return {
      enclosingContext: largestEnclosingContext,
    } as EnclosingContext;
  }

  dryRun(file: string): { valid: boolean; error: string } {
    try {
      parser.parse(file); // If this succeeds, the file is valid
      console.log("File parsed successfully.");
      return { valid: true, error: "" };
    } catch (error) {
      console.error("Error during dry run:", error);
      return { valid: false, error: error.message || "Unknown error" };
    }
  }
}
