import { CodeChar, CodeCharWrapper, CodePosition, Token, TokenType } from "../types/types";
import { getKeyWordIndex, isTerminator } from "../utils";

export interface RequiredFunction {
	readPrevChar: (ln: number, col: number) => CodeCharWrapper;
	readCharAt: (ln: number, col: number) => CodeCharWrapper;
	readNextChar: (ln: number, col: number) => CodeCharWrapper;
}

/**
 * 可识别带指数和小数的 parseFloat
 * @param code_ 可正可负，可有小数，包含指数
 * @param radix 
 * @returns 
 */
function parseFloatWithExponent(code_: string, radix: number) {
	let polarity = !code_.startsWith('-');			// + 为 true，- 为 false
	let code = polarity ? code_ : code_.slice(1);	// 去除正负号的数字
	let ePos = (code.indexOf('e') + 1 || code.indexOf('E') + 1) - 1;	// 指数位置
	let valueBase = parseFloatWithRadix(code.slice(0, ePos), radix);	// 指数的底
	let valueExponent = parseInt(code.slice(ePos + 1));					// 指数
	let absValue = valueBase * Math.pow(radix, valueExponent);			// 结果绝对值
	return polarity ? absValue : -absValue;
}

/**
 * 可识别不同进制的 parseFloat
 * @param code 可正可负，可有小数，不含指数
 * @param radix 进制
 */
function parseFloatWithRadix(code_: string, radix: number): number {
	let polarity = !code_.startsWith('-');			// + 为 true，- 为 false
	let code = polarity ? code_ : code_.slice(1);	// 去除正负号的数字
	let pointPos = code.indexOf('.');				// 小数点位置
	let absValue: number;
	if (pointPos > 0) {
		let valueInt = parseInt(code.slice(0, pointPos), radix);	// 整数值
		let floatLength = code.length - pointPos - 1;				// 浮点数长度
		let maxFloat = Math.pow(2, floatLength);					// 浮点数最大值
		let valueFloat = parseInt(code.slice(pointPos + 1), radix);	// 浮点数实际值
		absValue = valueInt + valueFloat / maxFloat;				// 结果绝对值
	} else {
		absValue = parseInt(code, radix);
	}
	return polarity ? absValue : -absValue;
}

/**
 * 从字符串中根据状态机值获取对应类型的值
 * @param code 字符串
 * @param tokenType 状态机值
 * @returns 对应类型的值
 */
function getValueFromCodeString(code: string, tokenType: TokenType): any {
	switch (tokenType) {
		case TokenType.preprocess:	// 不支持
			return undefined;
		case TokenType.comma:
		case TokenType.semicon:
		case TokenType.endline:
			return undefined;
		case TokenType.brakets_round_left:
		case TokenType.brakets_round_right:
		case TokenType.brakets_square_left:
		case TokenType.brakets_square_right:
		case TokenType.brakets_curly_left:
		case TokenType.brakets_curly_right:
			return undefined;
		case TokenType.compare_equal:
		case TokenType.compare_unequal:
		case TokenType.compare_less:
		case TokenType.compare_less_equal:
		case TokenType.compare_great:
		case TokenType.compare_great_equal:
		case TokenType.compare_colon:
		case TokenType.compare_question:
			return undefined;
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
			return undefined;
		case TokenType.calc_assign:
		case TokenType.calc_negation:
		case TokenType.calc_mod:
		case TokenType.calc_mod_assign:
		case TokenType.calc_multiply:
		case TokenType.calc_multiply_assign:
		case TokenType.calc_devide:
		case TokenType.calc_devide_assign:
		case TokenType.calc_add:
		case TokenType.calc_add_assign:
		case TokenType.calc_minus:
		case TokenType.calc_minus_assign:
			return undefined;
		case TokenType.struct_point:
		case TokenType.struct_arrow:
			return undefined;
		case TokenType.number_bin_int:
			return parseInt(code, 2);
		case TokenType.number_oct_int:
			return parseInt(code, 8);
		case TokenType.number_dec_int:
			return parseInt(code);
		case TokenType.number_hex_int:
			return parseInt(code, 16);
		case TokenType.number_bin_float:
			return parseFloatWithRadix(code, 2);
		case TokenType.number_oct_float:
			return parseFloatWithRadix(code, 8);
		case TokenType.number_dec_float:
			return parseFloatWithRadix(code, 10);
		case TokenType.number_hex_float:
			return parseFloatWithRadix(code, 16);
		case TokenType.number_bin_float_e:
			return parseFloatWithExponent(code, 2);
		case TokenType.number_oct_float_e:
			return parseFloatWithExponent(code, 8);
		case TokenType.number_dec_float_e:
			return parseFloatWithExponent(code, 10);
		case TokenType.number_hex_float_e:
			return parseFloatWithExponent(code, 16);
		case TokenType.char_char:
		case TokenType.char_string:
			return code;
		case TokenType.bool_true:
			return true;
		case TokenType.bool_false:
			return false;
		case TokenType.note_singleline:
		case TokenType.note_multiline:
			return undefined;
		case TokenType.identifier:
			return code;
		case TokenType.keyword:
			return undefined;
		default:
	}
}

function move(state: TokenType | number, codeChar: CodeChar): TokenType | number {
	const BIN_DIGIT = /0|1/;
	const OCT_DIGIT = /0|1|2|3|4|5|6|7/;
	const DEC_DIGIT = /0|1|2|3|4|5|6|7|8|9/;
	const HEX_DIGIT = /0|1|2|3|4|5|6|7|8|9|a|b|c|d|e|f|A|B|C|D|E|F/;
	
	let char = codeChar.char;
	switch (state) {
		// 0️⃣0️⃣0️⃣ 0 层 0️⃣0️⃣0️⃣
		case TokenType.error:
			return TokenType.error;
		case TokenType.unknown:
			if (/[_a-zA-Z]|_/.test(char)) {
				return TokenType.identifier;
			}
			switch (char) {
				case '#':
					return TokenType.preprocess;
				case ',':
					return TokenType.comma;
				case ';':
					return TokenType.semicon;
				// case '\n':
				// 	return TokenType.endline
				case '(':
					return TokenType.brakets_round_left;
				case ')':
					return TokenType.brakets_round_right;
				case '[':
					return TokenType.brakets_square_left;
				case ']':
					return TokenType.brakets_square_right;
				case '{':
					return TokenType.brakets_curly_left;
				case '}':
					return TokenType.brakets_curly_right;
				case '=':
					return TokenType.calc_assign;
				case '!':
					return TokenType.calc_negation;
				case '<':
					return TokenType.compare_less;
				case '>':
					return TokenType.compare_great;
				case ':':
					return TokenType.compare_colon;
				case '?':
					return TokenType.compare_question;
				case '&':
					return TokenType.bit_and;
				case '|':
					return TokenType.bit_or;
				case '~':
					return TokenType.bit_xor;
				case '%':
					return TokenType.calc_mod;
				case '*':
					return TokenType.calc_multiply;
				case '/':
					return TokenType.calc_devide;
				case '+':
					return TokenType.calc_add;
				case '-':
					return TokenType.calc_minus;
				case '0':
					return 605;
				case ['1', '2', '3', '4', '5', '6', '7', '8', '9'].indexOf(char) + 1 + '':
					return TokenType.number_dec_int;
				case '.':
					return TokenType.struct_point;
				case '\'':
					return 710;
				case '"':
					return 720;
				case ' ':
				case '	':
				case '\n':
					return TokenType.unknown;
				default:
					return TokenType.error;
			}
		// 1️⃣1️⃣1️⃣ 1 层 1️⃣1️⃣1️⃣
		case TokenType.identifier:
			if (/\w|_|\d/.test(char)) {
				return TokenType.identifier;
			} else {
				return TokenType.error;
			}
		case TokenType.preprocess:
			if (char !== '\n') {
				return TokenType.preprocess;
			} else {
				return TokenType.error;
			}
		case TokenType.comma:
		case TokenType.semicon:
		case TokenType.endline:
		case TokenType.brakets_round_left:
		case TokenType.brakets_round_right:
		case TokenType.brakets_square_left:
		case TokenType.brakets_square_right:
		case TokenType.brakets_curly_left:
		case TokenType.brakets_curly_right:
			return TokenType.error;
		case TokenType.calc_assign:
			if (char === '=') {
				return TokenType.compare_equal;
			} else {
				return TokenType.error;
			}
		case TokenType.calc_negation:
			if (char === '=') {
				return TokenType.compare_unequal;
			} else {
				return TokenType.error;
			}
		case TokenType.compare_less:
			switch (char) {
				case '<':
					return TokenType.bit_move_left;
				case '=':
					return TokenType.compare_less_equal;
				default:
					return TokenType.error;
			}
		case TokenType.compare_great:
			switch (char) {
				case '>':
					return TokenType.bit_move_right;
				case '=':
					return TokenType.compare_great_equal;
				default:
					return TokenType.error;
			}
		case TokenType.compare_colon:
		case TokenType.compare_question:
			return TokenType.error;
		case TokenType.bit_and:
			switch (char) {
				case '&':
					return TokenType.bit_logic_and;
				case '=':
					return TokenType.bit_and_assign;
				default:
					return TokenType.error;
			}
		case TokenType.bit_or:
			switch (char) {
				case '|':
					return TokenType.bit_logic_or;
				case '=':
					return TokenType.bit_or_assign;
				default:
					return TokenType.error;
			}
		case TokenType.bit_negation:
			if (char === '=') {
				return TokenType.bit_negation_assign;
			} else {
				return TokenType.error;
			}
		case TokenType.bit_xor:
			if (char === '=') {
				return TokenType.bit_xor_assign;
			} else {
				return TokenType.error;
			}
		case TokenType.calc_mod:
			if (char === '=') {
				return TokenType.calc_mod_assign;
			} else {
				return TokenType.error;
			}
		case TokenType.calc_multiply:
			if (char === '=') {
				return TokenType.calc_multiply_assign;
			} else {
				return TokenType.error;
			}
		case TokenType.calc_devide:
			switch (char) {
				case '*':
					return 920;
				case '/':
					return 910;
				case '=':
					return TokenType.calc_devide_assign;
				default:
					return TokenType.error;
			}
		case TokenType.calc_add:
			if (char === '=') {
				return TokenType.calc_add_assign;
			} else {
				return TokenType.error;
			}
		case TokenType.calc_minus:
			switch (char) {
				case '>':
					return TokenType.struct_arrow;
				case '-':
					return TokenType.calc_minus_self;
				case '=':
					return TokenType.calc_minus_assign;
				case '0':
					return 605;
				default:
					return TokenType.error;
			}
		case TokenType.struct_point:
			return TokenType.error;
		// 2️⃣2️⃣2️⃣ 2 层 2️⃣2️⃣2️⃣
		case TokenType.compare_equal:
		case TokenType.compare_unequal:
			return TokenType.error;
		case TokenType.bit_move_left:
			if (char === '=') {
				return TokenType.bit_move_left_assign;
			} else {
				return TokenType.error;
			}
		case TokenType.compare_less_equal:
			return TokenType.error;
		case TokenType.bit_move_right:
			if (char === '=') {
				return TokenType.bit_move_right_assign;
			} else {
				return TokenType.error;
			}
		case TokenType.compare_great_equal:
			return TokenType.error;
		case TokenType.bit_logic_and:
		case TokenType.bit_and_assign:
		case TokenType.bit_logic_or:
		case TokenType.bit_or_assign:
		case TokenType.bit_negation_assign:
		case TokenType.bit_xor_assign:
			return TokenType.error;
		case TokenType.calc_mod_assign:
		case TokenType.calc_multiply_assign:
		case TokenType.calc_devide_assign:
		case TokenType.calc_add_assign:
		case TokenType.calc_add_self:
		case TokenType.struct_arrow:
		case TokenType.calc_minus_assign:
		case TokenType.calc_minus_self:
			return TokenType.error;
		// *️⃣*️⃣*️⃣ 注释层 *️⃣*️⃣*️⃣
		case 920:
			if (char === '*') {
				return 921;
			} else {
				return 920;
			}
		case 921:
			if (char === '*') {
				return 921;
			} else if (char === '/') {
				return TokenType.note_multiline;
			} else {
				return 920;
			}
		case TokenType.note_multiline:
			return TokenType.error;
		case 910:
			if (char === '\n') {
				return TokenType.note_singleline;
			} else {
				return 911;
			}
		case 911:
			if (char === '\n') {
				return TokenType.note_singleline;
			} else {
				return 911;
			}
		case TokenType.note_singleline:
			return TokenType.error;
		// *️⃣*️⃣*️⃣ 字符字符串层 *️⃣*️⃣*️⃣
		case 710:
			if (!/\n|'/.test(char)) {
				return 712;
			} else if (char === '\\') {
				return 711;
			} else {
				return TokenType.error;
			}
		case 711:
			if (/\w/.test(char)) {
				return 712;
			} else {
				return TokenType.error;
			}
		case 712:
			if (char === '\'') {
				return TokenType.char_char;
			} else {
				return TokenType.error;
			}
		case TokenType.char_char:
			return TokenType.error;
		case 720:
			if (char === '"') {
				return TokenType.char_string;
			} else if (char === '\\') {
				return 722;
			} else if (char !== '\n') {
				return 721;
			} else {
				return TokenType.error;
			}
		case 721:
			if (char === '\\') {
				return 722;
			} else if (char === '"') {
				return TokenType.char_string;
			} else if (char !== '\n') {
				return 721;
			} else {
				return TokenType.error;
			}
		case 722:
			if (/\w/.test(char)) {
				return 723;
			} else {
				return TokenType.error;
			}
		case 723:
			if (char === '\\') {
				return 722;
			} else if (char === '"') {
				return TokenType.char_string;
			} else if (char !== '\n') {
				return 721;
			} else {
				return TokenType.error;
			}
		case TokenType.char_string:
			return TokenType.error;
		// *️⃣*️⃣*️⃣ 数字层 *️⃣*️⃣*️⃣
		case 605:
			switch (true) {
				case char === 'b':
					return 610;
				case OCT_DIGIT.test(char):
					return TokenType.number_oct_int;
				case char === 'x':
					return 640;
				default:
					return TokenType.error;
			}
		case 610:
			if (BIN_DIGIT.test(char)) {
				return TokenType.number_bin_int;
			} else {
				return TokenType.error;
			}
		case 640:
			if (HEX_DIGIT.test(char)) {
				return TokenType.number_hex_int;
			} else {
				return TokenType.error;
			}
		case 611:
			switch (true) {
				case BIN_DIGIT.test(char):
					return TokenType.number_bin_int;
				case (char === '.'):
					return 612;
				case (char === 'E'):
				case (char === 'e'):
					return 614;
				default:
					return TokenType.error;
			}
		case 621:
			switch (true) {
				case OCT_DIGIT.test(char):
					return TokenType.number_oct_int;
				case (char === '.'):
					return 622;
				case (char === 'E'):
				case (char === 'e'):
					return 624;
				default:
					return TokenType.error;
			}
		case 631:
			switch (true) {
				case DEC_DIGIT.test(char):
					return TokenType.number_dec_int;
				case (char === '.'):
					return 632;
				case (char === 'E'):
				case (char === 'e'):
					return 634;
				default:
					return TokenType.error;
			}
		case 641:
			switch (true) {
				case HEX_DIGIT.test(char):
					return TokenType.number_hex_int;
				case (char === '.'):
					return 642;
				case (char === 'E'):
				case (char === 'e'):
					return 644;
				default:
					return TokenType.error;
			}
		case 612:
			if (BIN_DIGIT.test(char)) {
				return TokenType.number_bin_float;
			} else {
				return TokenType.error;
			}
		case 622:
			if (OCT_DIGIT.test(char)) {
				return TokenType.number_oct_float;
			} else {
				return TokenType.error;
			}
		case 632:
			if (DEC_DIGIT.test(char)) {
				return TokenType.number_dec_float;
			} else {
				return TokenType.error;
			}
		case 642:
			if (HEX_DIGIT.test(char)) {
				return TokenType.number_hex_float;
			} else {
				return TokenType.error;
			}
		case TokenType.number_bin_float:
			if (BIN_DIGIT.test(char)) {
				return TokenType.number_bin_float;
			} else if (char === 'E' || char === 'e') {
				return 614;
			} else {
				return TokenType.error;
			}
		case TokenType.number_oct_float:
			if (OCT_DIGIT.test(char)) {
				return TokenType.number_oct_float;
			} else if (char === 'E' || char === 'e') {
				return 624;
			} else {
				return TokenType.error;
			}
		case TokenType.number_dec_float:
			if (DEC_DIGIT.test(char)) {
				return TokenType.number_dec_float;
			} else if (char === 'E' || char === 'e') {
				return 634;
			} else {
				return TokenType.error;
			}
		case TokenType.number_hex_float:
			if (HEX_DIGIT.test(char)) {
				return TokenType.number_hex_float;
			} else if (char === 'E' || char === 'e') {
				return 644;
			} else {
				return TokenType.error;
			}
		case 614:
			if (char === '+' || char === '-') {
				return 615;
			} else {
				return TokenType.error;
			}
		case 624:
			if (char === '+' || char === '-') {
				return 625;
			} else {
				return TokenType.error;
			}
		case 634:
			if (char === '+' || char === '-') {
				return 635;
			} else {
				return TokenType.error;
			}
		case 644:
			if (char === '+' || char === '-') {
				return 645;
			} else {
				return TokenType.error;
			}
		case 615:
			if (BIN_DIGIT.test(char)) {
				return TokenType.number_bin_float_e;
			} else {
				return TokenType.error;
			}
		case 625:
			if (OCT_DIGIT.test(char)) {
				return TokenType.number_oct_float_e;
			} else {
				return TokenType.error;
			}
		case 635:
			if (DEC_DIGIT.test(char)) {
				return TokenType.number_dec_float_e;
			} else {
				return TokenType.error;
			}
		case 645:
			if (HEX_DIGIT.test(char)) {
				return TokenType.number_hex_float_e;
			} else {
				return TokenType.error;
			}
		case TokenType.number_bin_float_e:
		case TokenType.number_oct_float_e:
		case TokenType.number_dec_float_e:
		case TokenType.number_hex_float_e:
			return TokenType.error;
		default:
			throw new Error('未预期状态值');
	};
}

export class LexicalAnalysis {
	private tokenList: Array<Token> = [];
	private readPrevChar: RequiredFunction['readPrevChar'];
	private readCharAt: RequiredFunction['readCharAt'];
	private readNextChar: RequiredFunction['readNextChar'];

	constructor(requiredFunction: RequiredFunction) {
		this.readPrevChar = requiredFunction.readPrevChar;
		this.readCharAt = requiredFunction.readCharAt;
		this.readNextChar = requiredFunction.readNextChar;
	}

	public getTokenList(): Array<Token> {
		return this.tokenList;
	}

	/**
	 * 对指定的段落进行词法分析，产出 token list
	 */
	public analyze(from: CodePosition, to: CodePosition): Array<Token> {
		let tokenList = this.tokenList;
		let state: TokenType | number = 0;
		// 清空 tokenList 原位置的 token，寻找合适的插入位置
		let tokenIndexBefore: number = -1;
		let charBefore = this.readPrevChar(from.ln, from.col);
		if (charBefore.code.token.type !== TokenType.bof) {
			tokenIndexBefore = tokenList.findIndex((token) => token === charBefore.code.token);
		}
		let tokenIndexAfter: number = Number.MAX_SAFE_INTEGER;
		let charAfter = this.readNextChar(to.ln, to.col);
		if (charAfter.code.token.type !== TokenType.eof) {
			tokenIndexAfter = tokenList.findIndex((token) => token === charAfter.code.token);
		}
		tokenList.splice(tokenIndexBefore + 1, tokenIndexAfter - tokenIndexBefore - 2);
		// 进行词法分析
		let c = this.readCharAt(from.ln, from.col);
		let tokenIndex = tokenIndexBefore + 1;
		let newToken: Token = {
			type: TokenType.unknown,
			value: undefined,
			firstCode: c.code,
		};
		let valueString = '';
		outer:
		while (true) {
			let newState = move(state, c.code);
			// console.log('move', state, newState, c);
			if (newState === TokenType.error) {
				// 状态机走到错误，将前面的内容识别为一个单词
				// 然后检查上一个字符是不是终结状态。依此将整个单词的 TokenType 设为对应类型
				// 此时 newToken 还存着上一次字符的引用，因此先把这个改好，再去新建 newToken
				newToken.type = isTerminator(state) ? state : TokenType.error;
				newToken.value = getValueFromCodeString(valueString, state);
				// 识别 identifier 是不是一个 keyword
				if (newToken.type === TokenType.identifier) {
					let keywordIndex = getKeyWordIndex(newToken.value);
					if (keywordIndex >= 0) {
						newToken.type = TokenType.keyword + keywordIndex + 1;
						newToken.value = undefined;
					}
				}
				// 除去注释，在 tokenList 中插入新 token
				if (newToken.type !== TokenType.note_singleline && newToken.type !== TokenType.note_multiline) {
					tokenList.splice(tokenIndex++, 0, newToken);
				}
				// ⬆️ 上一个 token 的相关操作　⬇️ 当前字符的再操作
				state = TokenType.unknown;		// 状态机重置
				state = move(state, c.code);	// 将当前字符再走一遍状态机
				while (state === TokenType.unknown) {
					// 反复读取直到下一个不是空格
					c = this.readNextChar(c.ln, c.col);
					if (c.code.token.type === TokenType.eof) {
						break outer;
					}		
					state = move(state, c.code);
					// console.log('move', TokenType.unknown, state, c);
				}
				// 为 newToken 设置新引用
				newToken = {
					type: TokenType.unknown,
					value: undefined,
					firstCode: c.code,
				};
				valueString = '';
			} else {
				state = newState;			// 状态机设为新值
			}
			c.code.token = newToken;	// 将这个字符打上引用
			valueString += c.code.char;
			// 如果到达区间末尾，则退出循环，否则往后读取
			if (c.ln === to.ln && c.col === to.col) {
				break;
			}
			c = this.readNextChar(c.ln, c.col);
			// 前面的代码往后读取后，读到了 eof，则退出循环
			if (c.code.token.type === TokenType.eof) {
				break;
			}
		}
		// 如果 tokenList 最后没有 eof，那么插入 eof
		if (!tokenList.length || (tokenList.length && tokenList[tokenList.length - 1].type !== TokenType.eof)) {
			tokenList.push({
				type: TokenType.eof,
				value: undefined,
			});
		}
		return this.getTokenList();
	}
}