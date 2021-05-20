import { CodeChar, CodeCharWrapper, CodeLine, CodePosition, Token, TokenType } from "../types/types";

export interface CodeService {
    getCodeLines(): Array<CodeLine>
    getCodeLine(ln: number): CodeLine
    getAllCode(): string
    resetCode(content: string): void
    insertCode(content: string, ln: number, col: number): CodePosition
    deletePrevChar(ln: number, col: number): CodePosition
    deleteNextChar(ln: number, col: number): CodePosition
    deleteCodeLine(ln: number, col: number): CodeCharWrapper
    readCharAt_s(ln: number, col: number): CodeCharWrapper
    readCharAt(ln: number, col: number): CodeCharWrapper
    readNextChar(ln: number, col: number): CodeCharWrapper
    readPrevChar(ln: number, col: number): CodeCharWrapper
    getCodeToken(ln: number, col: number): Token
    compile(): void
    step(): void
}