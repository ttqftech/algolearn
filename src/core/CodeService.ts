import EventEmitter from "events";
import { CodeChar, CodeCharWrapper, CodeLine, CodePosition, Token, TokenType } from "../types/types";
import { mid } from "../utils";
import { LexicalAnalysis } from "./LexicalAnalysis";
// import { LexicalAnalysis } from "./LexicalAnalysis";

export enum CodeServiceEvent {
	CodeUpdated = 'CodeUpdated',
	LexicalReady = 'LexicalReady',
}

const nullToken: Token = {
	type: TokenType.unknown,
	value: undefined,
}

const bofChar: CodeChar = {
	char: '',
	token: {
		type: TokenType.bof,
		value: undefined,
	}
}

const eofChar: CodeChar = {
	char: '',
	token: {
		type: TokenType.eof,
		value: undefined,
	}
}

const endlineChar = {
	char: '\n',
	token: {
		type: TokenType.endline,
		value: undefined,
	}
}

export class CodeService extends EventEmitter {
	private codeLines: Array<CodeLine>;
	private lexicalAnalyzer: LexicalAnalysis;
	private antishakeTimer: any = 0;

	constructor() {
		super();
		this.codeLines = [
			[endlineChar]
		];
		this.lexicalAnalyzer = new LexicalAnalysis({
			readPrevChar: this.readPrevChar.bind(this),
			readCharAt: this.readCharAt.bind(this),
			readNextChar: this.readNextChar.bind(this),
		});
		this.on(CodeServiceEvent.CodeUpdated, () => {
			this.ScanCode();
		});
	}

	public getCodeLines(): Array<CodeLine> {
		return this.codeLines;
	}

	/**
	 * 获取单个代码行的内容
	 */
	 public getCodeLine(ln: number): CodeLine {
		return this.codeLines[ln];
	}

	/**
	 * 获取全部代码，即把所有行都拼接起来输出
	 */
	public getAllCode(): string {
		let ret = '';
		for (const codeLine of this.codeLines) {
			for (const codeChar of codeLine) {
				ret += codeChar.char;
			}
		}
		return ret;
	}

	/**
	 * 将新插入的字符串转换成 Array<CodeChar>
	 */
	public stringToCodeChar(str: string): Array<CodeChar> {
		let ret: Array<CodeChar> = [];
		for (const char of str.split('')) {
			ret.push({
				char,
				token: nullToken,
			});
		}
		return ret;
	}

	/**
	 * 将存储的 CodeChar 转换成 string
	 */
	public codeCharToString(arr: Array<CodeChar>): string {
		let ret: string = '';
		for (const codeChar of arr) {
			ret += codeChar.char;
		}
		return ret;
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
		// 
		let originCodeLine = this.codeLines[ln];
		let newCodeLines: Array<CodeLine> = content.split('\n').map((str) => this.stringToCodeChar(str + '\n'));
		newCodeLines[0].unshift(...originCodeLine.slice(0, col));
		newCodeLines[newCodeLines.length - 1].splice(-1, 0 ,...originCodeLine.slice(col));
		this.codeLines.splice(ln, 1, ...newCodeLines);
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
					col: upperLine.length - 1,
				}
				this.codeLines[ln - 1] = [...upperLine.slice(0, -1), ...lowerLine.slice(0, -1), Object.assign({}, endlineChar)];
				this.codeLines.splice(ln, 1);
				this.emit(CodeServiceEvent.CodeUpdated);
				return pos;
			}
		} else {			// 删除非行
			let codeLine = this.codeLines[ln];
			this.codeLines[ln] = [...codeLine.slice(0, col - 1), ...codeLine.slice(col)];
			this.emit(CodeServiceEvent.CodeUpdated);
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
		if (col === this.codeLines[ln].length - 1) {	// 删除行
			if (ln === this.codeLines.length - 1) {
				return { ln, col };
			} else {
				let upperLine = this.codeLines[ln];
				let lowerLine = this.codeLines[ln + 1];
				let pos: CodePosition = {
					ln: ln,
					col: upperLine.length - 1,
				}
				this.codeLines[ln] = [...upperLine.slice(0, -1), ...lowerLine.slice(0, -1), Object.assign({}, endlineChar)];
				this.codeLines.splice(ln + 1, 1);
				this.emit(CodeServiceEvent.CodeUpdated);
				return pos;
			}
		} else {			// 删除非行
			let codeLine = this.codeLines[ln];
			this.codeLines[ln] = [...codeLine.slice(0, col), ...codeLine.slice(col + 1)];
			this.emit(CodeServiceEvent.CodeUpdated);
			return {
				ln,
				col: col,
			};
		}
	}

	/**
	 * 删除一整行代码
	 */
	public deleteCodeLine(ln: number, col: number): CodeCharWrapper {
		if (this.codeLines.length > 1)  {
			this.codeLines.splice(ln, 1);
		} else {
			this.codeLines[0] = [endlineChar];
		}
		this.emit(CodeServiceEvent.CodeUpdated);
		return this.readCharAt(ln, col);
	}

	/**
	 * 读取指定位置的代码，用于自动扫描
	 * 如果超出位置则取出 bof 或 eof
	 */
	public readCharAt_s(ln: number, col: number): CodeCharWrapper {
		// console.log('readCharAt_s', ln, col);
		return {
			code: ln < 0 ? bofChar : ln > this.codeLines.length - 1 ? eofChar : this.codeLines[ln][col],
			ln,
			col,
		}
	}

	/**
	 * 读取指定位置的代码，用于处理用户光标操作
	 * 如果超出位置则自动取最接近的位置
	 */
	public readCharAt(ln: number, col: number): CodeCharWrapper {
		let line, column;
		// console.log('readCharAt', ln, col);
		line = mid(0, ln, this.codeLines.length - 1);
		column = mid(0, col, this.codeLines[line].length - 1);
		return {
			code: this.codeLines[line][column],
			ln: line,
			col: column,
		}
	}

	/**
	 * 读取指定位置的下一个代码
	 * 如果超出位置则取出 eof
	 */
	public readNextChar(ln: number, col: number): CodeCharWrapper {
		let line, column;
		// console.log('readNextChar');
		// 移动字符
		if (col >= this.codeLines[ln].length - 1) {
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
	public readPrevChar(ln: number, col: number): CodeCharWrapper {
		let line, column;
		// 移动字符
		// console.log('readPrevChar');
		if (col === 0) {
			line = ln - 1;
			if (line < 0) {
				column = 0;
			} else {
				column = this.codeLines[line].length - 1;
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
	// // public getCodeToken(ln: number, col: number): Token {
	// // 	if (ln >= 0 && ln <= this.codeLines.length - 1) {
	// // 		let codeLine = this.codeLines[ln];
	// // 		if (col === codeLine.code.length - 1) {
	// // 			return codeLine.tokenMap[col] || {
	// // 				type: TokenType.endline,
	// // 				value: undefined,
	// // 			};
	// // 		} else {
	// // 			return codeLine.tokenMap[col] || {
	// // 				type: TokenType.unknown,
	// // 				value: undefined,
	// // 			};
	// // 		}
	// // 	} else if (ln >= this.codeLines.length) {
	// // 		return {
	// // 			type: TokenType.eof,
	// // 			value: undefined,
	// // 		};
	// // 	} else {
	// // 		return {
	// // 			type: TokenType.bof,
	// // 			value: undefined,
	// // 		};
	// // 	}
	// }

	/**
	 * 编译
	 */
	public ScanCode(): void {
		clearInterval(this.antishakeTimer);
		this.antishakeTimer = setTimeout(() => {
			console.log('scanCode');
			this.lexicalAnalyzer.analyze({
				ln: 0,
				col: 0,
			}, {
				ln: this.codeLines.length - 1,
				col: this.codeLines[this.codeLines.length - 1].length - 1,
			});
			this.emit(CodeServiceEvent.LexicalReady);
		}, 300);
	}

	public getTokenColor(tokenType: TokenType): string {
		console.log('getTokenColor');
		switch (tokenType) {
			case TokenType.error:
				return '#FF0000'
			case TokenType.unknown:
				return '#000000';
			case TokenType.preprocess:
				return '#FF0000';		// 暂不支持
			case TokenType.comma:
			case TokenType.semicon:
				return '#666666';
			case TokenType.brakets_round_left:
			case TokenType.brakets_round_right:
			case TokenType.brakets_square_left:
			case TokenType.brakets_square_right:
			case TokenType.brakets_curly_left:
			case TokenType.brakets_curly_right:
				return '#222A44';
			case TokenType.compare_equal:
			case TokenType.compare_unequal:
			case TokenType.compare_less:
			case TokenType.compare_less_equal:
			case TokenType.compare_great:
			case TokenType.compare_great_equal:
				return '#882222';
			case TokenType.compare_colon:
			case TokenType.compare_question:
				return '#FF0000';		// 暂不支持
			case TokenType.bit_logic_and:
			case TokenType.bit_logic_or:
			case TokenType.bit_and:
			case TokenType.bit_and_assign:
			case TokenType.bit_or:
			case TokenType.bit_or_assign:
			case TokenType.bit_negation:
			case TokenType.bit_negation_assign:
			case TokenType.bit_xor:
			case TokenType.bit_xor_assign:
			case TokenType.bit_move_left:
			case TokenType.bit_move_left_assign:
			case TokenType.bit_move_right:
			case TokenType.bit_move_right_assign:
				return '#FF0000';		// 暂不支持
			case TokenType.calc_assign:
				return '#BBAA33';
			case TokenType.calc_negation:
			case TokenType.calc_mod:
			case TokenType.calc_mod_assign:
				return '#FF0000';		// 暂不支持
			case TokenType.calc_multiply:
				return '#AABB33'			
			case TokenType.calc_multiply_assign:
				return '#FF0000';		// 暂不支持
			case TokenType.calc_devide:
				return '#AABB33'
			case TokenType.calc_devide_assign:
				return '#FF0000';		// 暂不支持
			case TokenType.calc_add:
				return '#AABB33'
			case TokenType.calc_add_assign:
			case TokenType.calc_add_self:
				return '#FF0000';		// 暂不支持
			case TokenType.calc_minus:
				return '#AABB33'
			case TokenType.calc_minus_assign:
			case TokenType.calc_minus_self:
				return '#FF0000';		// 暂不支持
			case TokenType.struct_point:
			case TokenType.struct_arrow:
				return '#FF0000';		// 暂不支持
			case TokenType.number_bin_int:
			case TokenType.number_bin_float:
			case TokenType.number_bin_float_e:
			case TokenType.number_oct_int:
			case TokenType.number_oct_float:
			case TokenType.number_oct_float_e:
			case TokenType.number_dec_int:
			case TokenType.number_dec_float:
			case TokenType.number_dec_float_e:
			case TokenType.number_hex_int:
			case TokenType.number_hex_float:
			case TokenType.number_hex_float_e:
				return '#3377CC';
			case TokenType.char_char:
			case TokenType.char_string:
				return '#FF0000';		// 暂不支持
			case TokenType.bool_true:
			case TokenType.bool_false:
				return '#3377CC';
			case TokenType.note_singleline:
			case TokenType.note_multiline:
				return '#AA2222';
			case TokenType.identifier:
				return '#AA00AA';
			case TokenType.keyword:
			case TokenType.keyword_void:
			case TokenType.keyword_short:
			case TokenType.keyword_int:
			case TokenType.keyword_long:
			case TokenType.keyword_float:
			case TokenType.keyword_double:
			case TokenType.keyword_while:
			case TokenType.keyword_if:
			case TokenType.keyword_else:
			case TokenType.keyword_return:
				return '#0000BB';
			default:
				return '#FF0000';
		}
	}
}
