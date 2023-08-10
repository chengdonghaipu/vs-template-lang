import * as ts from 'typescript';
import * as vscode from 'vscode';

export function isInsideInlineTemplateRegion(
    document: vscode.TextDocument, position: vscode.Position): boolean {
  if (document.languageId !== 'typescript') {
    return true;
  }
  return isPropertyAssignmentToStringOrStringInArray(
      document.getText(), document.offsetAt(position), ['template']);
}

export function isInsideStringLiteral(
    document: vscode.TextDocument, position: vscode.Position): boolean {
  if (document.languageId !== 'typescript') {
    return true;
  }
  const offset = document.offsetAt(position);
  const scanner = ts.createScanner(ts.ScriptTarget.ESNext, true /* skipTrivia */);
  scanner.setText(document.getText());

  let token: ts.SyntaxKind = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken && scanner.getStartPos() < offset) {
    const isStringToken = token === ts.SyntaxKind.StringLiteral ||
        token === ts.SyntaxKind.NoSubstitutionTemplateLiteral;
    const isCursorInToken = scanner.getStartPos() <= offset &&
        scanner.getStartPos() + scanner.getTokenText().length >= offset;
    if (isCursorInToken && isStringToken) {
      return true;
    }
    token = scanner.scan();
  }
  return false;
}

export function isInsideComponentDecorator(
    document: vscode.TextDocument, position: vscode.Position): boolean {
  if (document.languageId !== 'typescript') {
    return true;
  }
  return isPropertyAssignmentToStringOrStringInArray(
      document.getText(), document.offsetAt(position), ['template', 'templateUrl', 'styleUrls']);
}

function isPropertyAssignmentToStringOrStringInArray(
    documentText: string, offset: number, propertyAssignmentNames: string[]): boolean {
  const scanner = ts.createScanner(ts.ScriptTarget.ESNext, true /* skipTrivia */);
  scanner.setText(documentText);

  let token: ts.SyntaxKind = scanner.scan();
  let lastToken: ts.SyntaxKind|undefined;
  let lastTokenText: string|undefined;
  let unclosedBraces = 0;
  let unclosedBrackets = 0;
  let propertyAssignmentContext = false;

  while (token !== ts.SyntaxKind.EndOfFileToken && scanner.getStartPos() < offset) {
    if (lastToken === ts.SyntaxKind.Identifier && lastTokenText !== undefined &&
        propertyAssignmentNames.includes(lastTokenText) && token === ts.SyntaxKind.ColonToken) {
      propertyAssignmentContext = true;
      token = scanner.scan();
      continue;
    }
    if (unclosedBraces === 0 && unclosedBrackets === 0 && isPropertyAssignmentTerminator(token)) {
      propertyAssignmentContext = false;
    }

    if (token === ts.SyntaxKind.OpenBracketToken) {
      unclosedBrackets++;
    } else if (token === ts.SyntaxKind.OpenBraceToken) {
      unclosedBraces++;
    } else if (token === ts.SyntaxKind.CloseBracketToken) {
      unclosedBrackets--;
    } else if (token === ts.SyntaxKind.CloseBraceToken) {
      unclosedBraces--;
    }

    const isStringToken = token === ts.SyntaxKind.StringLiteral ||
        token === ts.SyntaxKind.NoSubstitutionTemplateLiteral;
    const isCursorInToken = scanner.getStartPos() <= offset &&
        scanner.getStartPos() + scanner.getTokenText().length >= offset;
    if (propertyAssignmentContext && isCursorInToken && isStringToken) {
      return true;
    }

    lastTokenText = scanner.getTokenText();
    lastToken = token;
    token = scanner.scan();
  }

  return false;
}

function isPropertyAssignmentTerminator(token: ts.SyntaxKind) {
  return token === ts.SyntaxKind.EndOfFileToken || token === ts.SyntaxKind.CommaToken ||
      token === ts.SyntaxKind.SemicolonToken || token === ts.SyntaxKind.CloseBraceToken;
}