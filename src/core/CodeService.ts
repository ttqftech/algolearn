import EventEmitter from "events";
import { CodeChar, CodeLine, CodePosition, Token, TokenType } from "../types/types";
import { mid } from "../utils";

export enum CodeServiceEvent {
	CodeUpdated = 'CodeUpdated',
}

export class CodeService extends EventEmitter {
	private codeLines: Array<CodeLine>;

	constructor() {
		super();
		this.codeLines = [
			{
				code: '\n',
				tokenMap: [],
			}
		];
	}

	public getCodeLines(): Array<CodeLine> {
		return this.codeLines;
	}

	/**
	 * 获取全部代码，即把所有行都拼接起来输出
	 */
	public getAllCode(): string {
		let ret = '';
		for (const codeLine of this.codeLines) {
			ret += codeLine.code;
		}
		return ret;
	}

	/**
	 * 获取单个代码行的内容
	 */
	public getCodeLine(ln: number): CodeLine {
		return this.codeLines[ln];
	}

	/**
	 * 替换单个代码行的内容
	 */
	public setCodeLineByString(ln: number, code: string): void {
		this.codeLines[ln] = {
			code,
			tokenMap: [],
		}
	}

	/**
	 * 在某个位置插入代码
	 */
	public insertCode(content: string, ln: number, col: number): CodePosition {
		// 前操作
		if (content.length === 0) {
			return {ln, col};
		}
		content = content.replace(/\r\n/g, '\n');
		content = content.replace(/\r/g, '\n');
		// 直接替换本行内容
		let codeLine = this.codeLines[ln];
		let newCodeLines: Array<CodeLine> = [{
			code: codeLine.code.slice(0, col) + content + codeLine.code.slice(col, -1) + '\n',
			tokenMap: [],
		}];
		newCodeLines[0].tokenMap = new Array(newCodeLines[0].code.length).fill(TokenType.unknown);
		// 一直往后搜索 \n，搜到后在此处裁剪内容，新增一行
		let endLinePos = newCodeLines[0].code.indexOf('\n');
		for (let i = 0; endLinePos >= 0 && endLinePos < newCodeLines[i].code.length - 1; i++) {
			// 将此行换行符后面的东西裁走加入到新行
			newCodeLines.push({
				code: newCodeLines[i].code.slice(endLinePos + 1, -1) + '\n',
				tokenMap: new Array(newCodeLines[i].code.length - 1 - endLinePos).fill(TokenType.unknown),
			})
			// 将前面的内容裁走
			newCodeLines[i] = {
				code: newCodeLines[i].code.slice(0, endLinePos) + '\n',
				tokenMap: new Array(endLinePos).fill(TokenType.unknown),
			}
			endLinePos = newCodeLines[i + 1].code.indexOf('\n');
		}
		// 替换第一行的内容
		this.codeLines[ln] = newCodeLines[0];
		// 从插入内容的第二行开始遍历，进行插入
		for (let i = 1; i < newCodeLines.length; i++) {
			this.codeLines.splice(ln + i, 0, newCodeLines[i]);
		}

		this.emit(CodeServiceEvent.CodeUpdated);
		if (newCodeLines.length === 1) {
			return {
				ln: ln,
				col: col + content.length,
			}
		} else {
			return {
				ln: ln + newCodeLines.length - 1,
				col: 0,
			}
		}
	}

	/**
	 * 删除前一位代码
	 */
	public deletePrevChar(ln: number, col: number): CodePosition {
		if (col === 0) {	// 删除行
			if (ln === 0) {
				return { ln, col };
			} else {
				let upperLine = this.codeLines[ln - 1];
				let lowerLine = this.codeLines[ln];
				let pos: CodePosition = {
					ln: ln - 1,
					col: upperLine.code.length - 1,
				}
				this.codeLines[ln - 1] = {
					code: upperLine.code.slice(0, -1) + lowerLine.code.slice(0, -1) + '\n',
					tokenMap: new Array(upperLine.code.length + lowerLine.code.length - 2).fill(TokenType.unknown),
				};
				this.codeLines.splice(ln, 1);
				return pos;
			}
		} else {			// 删除非行
			let codeLine = this.codeLines[ln];
			codeLine.code = codeLine.code.slice(0, col - 1) + codeLine.code.slice(col);
			codeLine.tokenMap = new Array(codeLine.code.length - 1).fill(TokenType.unknown);
			this.codeLines[ln] = codeLine;
			return {
				ln,
				col: col - 1
			};
		}
	}

	/**
	 * 删除后一位代码
	 */
	public deleteNextChar(ln: number, col: number): CodePosition {
		if (col === this.codeLines[ln].code.length - 1) {	// 删除行
			if (ln === this.codeLines.length - 1) {
				return { ln, col };
			} else {
				let upperLine = this.codeLines[ln];
				let lowerLine = this.codeLines[ln + 1];
				let pos: CodePosition = {
					ln: ln,
					col: upperLine.code.length - 1,
				}
				this.codeLines[ln] = {
					code: upperLine.code.slice(0, -1) + lowerLine.code.slice(0, -1) + '\n',
					tokenMap: new Array(upperLine.code.length + lowerLine.code.length - 2).fill(TokenType.unknown),
				};
				this.codeLines.splice(ln + 1, 1);
				return pos;
			}
		} else {			// 删除非行
			let codeLine = this.codeLines[ln];
			codeLine.code = codeLine.code.slice(0, col) + codeLine.code.slice(col + 1);
			codeLine.tokenMap = new Array(codeLine.code.length - 1).fill(TokenType.unknown);
			this.codeLines[ln] = codeLine;
			return {
				ln,
				col: col,
			};
		}
	}

	/**
	 * 删除一整行代码
	 */
	public deleteCodeLine(ln: number, col: number): CodeChar {
		if (this.codeLines.length > 1)  {
			this.codeLines.splice(ln, 1);
		} else {
			this.codeLines[0] = {
				code: '\n',
				tokenMap: [],
			};
		}
		return this.readCharAt(ln, col);
	}

	/**
	 * 读取指定位置的代码，用于自动扫描
	 * 如果超出位置则取出 bof 或 eof
	 */
	public readCharAt_s(ln: number, col: number): CodeChar {
		return {
			char: this.codeLines[ln].code[col],
			ln,
			col,
			token: this.getCodeToken(ln, col),
		}
	}

	/**
	 * 读取指定位置的代码，用于处理用户光标操作
	 * 如果超出位置则自动取最接近的位置
	 */
	public readCharAt(ln: number, col: number): CodeChar {
		let line, column;
		// console.log('readCharAt');
		line = mid(0, ln, this.codeLines.length - 1);
		column = mid(0, col, this.codeLines[line].code.length - 1);
		return {
			char: this.codeLines[line].code[column],
			ln: line,
			col: column,
			token: this.getCodeToken(line, column),
		}
	}

	/**
	 * 读取指定位置的下一个代码
	 * 如果超出位置则取出 eof
	 */
	public readNextChar(ln: number, col: number): CodeChar {
		let line, column;
		// console.log('readNextChar');
		// 移动字符
		if (col >= this.codeLines[ln].code.length - 1) {
			line = ln + 1;
			column = 0;
		} else {
			line = ln;
			column = col + 1;
		}
		// 输出返回值
		return this.readCharAt_s(line, column);
	}

	/**
	 * 读取指定位置的上一个代码
	 * 如果超出位置则取出 bof
	 */
	public readPrevChar(ln: number, col: number): CodeChar {
		let line, column;
		// 移动字符
		// console.log('readPrevChar');
		if (col === 0) {
			line = ln - 1;
			if (line < 0) {
				column = 0;
			} else {
				column = this.codeLines[line].code.length - 1;
			}
		} else {
			line = ln;
			column = col - 1;
		}
		// 输出返回值
		return this.readCharAt_s(line, column);
	}

	/**
	 * 获取指定位置代码的类型
	 * 如果超出位置则取出 bof 或 eof
	 */
	public getCodeToken(ln: number, col: number): Token {
		if (ln >= 0 && ln <= this.codeLines.length - 1) {
			let codeLine = this.codeLines[ln];
			return codeLine.tokenMap[col] || TokenType.endline;
		} else if (ln >= this.codeLines.length) {
			return {
				type: TokenType.eof,
				value: undefined,
			};
		} else {
			return {
				type: TokenType.bof,
				value: undefined,
			};
		}
	}

	public getHightlightType() {
		
	}
}
