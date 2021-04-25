import { CodeChar, CodeLine, Token, TokenType } from "../types/types";

export class CodeService {
	private codeLines: Array<CodeLine> = [];

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
	public insertCode(content: string, ln: number, col: number): void {
		// 前操作
		if (content.length === 0) {
			return;
		}
		content = content.replace(/\r\n/g, '\n');
		content = content.replace(/\r/g, '\n');
		let contArr = content.split('\n');
		// 替换第一行的内容
		let codeLine = this.codeLines[ln];
		let newCodeLine: CodeLine = {
			code: codeLine.code.slice(0, col) + contArr[0] + codeLine.code.slice(col),
			tokenMap: [],
		};
		codeLine = newCodeLine;
		// 从插入内容的第二行开始遍历，进行插入
		for (let i = 1; i < contArr.length; i++) {
			let newCodeLine: CodeLine = {
				code: contArr[i] + '\n',
				tokenMap: new Array(contArr[i].length).fill(TokenType.unknown),
			};
			this.codeLines.splice(ln + i, 0, newCodeLine);
		}
	}

	/**
	 * 读取指定位置的代码
	 */
	public readCharAt(ln: number, col: number): CodeChar {
		return {
			char: ln <= this.codeLines.length - 1 && ln >= 0 ? this.codeLines[ln].code[col] : '',
			ln,
			col,
			token: this.getCodeToken(ln, col),
		}
	}

	/**
	 * 读取指定位置的下一个代码
	 */
	public readNextChar(ln: number, col: number): CodeChar {
		let line, column;
		// 移动字符
		if (col >= this.codeLines[ln].code.length - 1) {
			line = ln + 1;
			column = 0;
		} else {
			line = ln;
			column = col + 1;
		}
		// 输出返回值
		return this.readCharAt(line, column);
	}

	/**
	 * 读取指定位置的上一个代码
	 */
	public readPrevChar(ln: number, col: number): CodeChar {
		let line, column;
		// 移动字符
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
		return this.readCharAt(line, column);
	}

	/**
	 * 获取指定位置代码的类型，自动识别文件末尾
	 */
	public getCodeToken(ln: number, col: number): Token {
		if (ln <= this.codeLines.length - 1 && ln >= 0) {
			let codeLine = this.codeLines[ln];
			return codeLine.tokenMap[col];
		} else if (ln == this.codeLines.length) {
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
