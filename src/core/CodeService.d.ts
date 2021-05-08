import { CodeChar, CodeLine, CodePosition, Token, TokenType } from "../types/types";

export interface CodeService {
    getCodeLines(): Array<CodeLine>
    getAllCode(): string
    getCodeLine(ln: number): CodeLine
    setCodeLineByString(ln: number, code: string): void
    insertCode(content: string, ln: number, col: number): CodePosition
    readCharAt_s(ln: number, col: number): CodeChar
    readCharAt(ln: number, col: number): CodeChar
    readNextChar(ln: number, col: number): CodeChar
    readPrevChar(ln: number, col: number): CodeChar
    getCodeToken(ln: number, col: number): Token
}