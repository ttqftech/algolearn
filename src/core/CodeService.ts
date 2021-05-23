import EventEmitter from "events";
import { BaseNode, CodeChar, CodeCharWrapper, CodeLine, CodePosition, FunctionNode, ProgramNode, SyntaxNode, Token, TokenType } from "../types/types";
import { mid } from "../utils";
import { collectFunctionVariable, getVariableTypeBySyntaxNode, GrammarAnalysis, createVariable, setVariable, getVariable, applyFunctionParameter, attractFunctionParameter } from "./GrammarAnalysis";
import { LexicalAnalysis } from "./LexicalAnalysis";
// import { LexicalAnalysis } from "./LexicalAnalysis";

export enum CodeServiceEvent {
	CodeUpdated = 'CodeUpdated',
	LexicalReady = 'LexicalReady',
	GrammarReady = 'GrammarReady',
	RuntimeReset = 'RuntimeReset',
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

const endlineChar: CodeChar = {
	char: '\n',
	token: {
		type: TokenType.endline,
		value: undefined,
	}
}

/**
 * 将新插入的字符串转换成 Array<CodeChar>
 */
function stringToCodeChar(str: string): Array<CodeChar> {
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
// function codeCharToString(arr: Array<CodeChar>): string {
// 	let ret: string = '';
// 	for (const codeChar of arr) {
// 		ret += codeChar.char;
// 	}
// 	return ret;
// }

export class CodeService extends EventEmitter {
	private codeLines: Array<CodeLine>;
	private lexicalAnalyzer: LexicalAnalysis;
	private grammarAnalyzer: GrammarAnalysis;
	private antishakeTimer: any = 0;			// 代码编辑器防抖 timer

	private currentCallStack: Array<FunctionNode> = [];
	private currentSyntaxNode?: SyntaxNode		// 运行时进行到的语法单元
	private currentBaseNode?: BaseNode			// 运行时进行到的语法单元
	private printBuffer: string = '';			// 用于内置 alert 函数

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
		this.grammarAnalyzer = new GrammarAnalysis();
		this.on(CodeServiceEvent.CodeUpdated, () => {
			clearInterval(this.antishakeTimer);
			this.antishakeTimer = setTimeout(() => {
				this.compile();
			}, 400);
		});
		this.grammarAnalyzer = new GrammarAnalysis();
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
	 * 程序在运行状态时，指示当前运行行
	 */
	public getRunningPos(): CodePosition | undefined {
		if (this.currentSyntaxNode?.token?.firstCode) {
			return this.currentSyntaxNode.token.firstCode
		} else {
			return undefined;
		}
	}

	/**
	 * 替换全部代码
	 */
	public resetCode(content: string): void {
		this.codeLines = [
			[endlineChar]
		];
		this.insertCode(content, 0, 0);
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
		// 插入操作
		let originCodeLine = this.codeLines[ln];
		let newCodeLines: Array<CodeLine> = content.split('\n').map((str) => stringToCodeChar(str + '\n'));
		newCodeLines[0].unshift(...originCodeLine.slice(0, col));
		newCodeLines[newCodeLines.length - 1].splice(-1, 1, ...originCodeLine.slice(col));
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
	 * 编译
	 */
	public compile(): void {
		let startTime: number;
		console.log('ScanCode');
		
		startTime = new Date().getTime();
		let tokenList = this.lexicalAnalyzer.analyze({
			ln: 0,
			col: 0,
		}, {
			ln: this.codeLines.length - 1,
			col: this.codeLines[this.codeLines.length - 1].length - 1,
		});
		console.log('tokenList', tokenList, `词法分析耗时：${new Date().getTime() - startTime} ms`);
		this.emit(CodeServiceEvent.LexicalReady);
		
		startTime = new Date().getTime();
		let grammarNode = this.grammarAnalyzer.grammarAnalyze(tokenList);
		console.log('nodeTree', grammarNode, `语法分析耗时：${new Date().getTime() - startTime} ms。节点数：${this.grammarAnalyzer.getNodeCount()}`);
		let syntaxError: Token | undefined;
		let lastCorrectToken = this.grammarAnalyzer.getSyntaxError();
		// getSyntaxError 指示最后一次正确的位置，但是 codeService 要向外界反映错误位置，因此使 index + 1，结果反应到 syntaxError 里
		if (lastCorrectToken) {
			let lastCorrectTokenIndex = tokenList.findIndex((token) => token === lastCorrectToken);
			syntaxError = tokenList[lastCorrectTokenIndex + 1];
		}
		this.emit(CodeServiceEvent.GrammarReady, syntaxError);
		
		if (grammarNode.symbol !== 'program') {
			// 语法错误，同时也可用 this.grammarAnalyzer.getSyntaxError 代替
			console.error('语法错误', this.grammarAnalyzer.getSyntaxError());
		} else {
			startTime = new Date().getTime();
			let programNode = this.grammarAnalyzer.semanticAnalyze();
			console.log('programNode', programNode, `变量表分析耗时：${new Date().getTime() - startTime} ms`);
		}
	}

	/**
	 * 单步执行
	 */
	public step(): void {
		let syntaxNode = this.currentSyntaxNode;
		let baseNode = this.currentBaseNode;
		let stopflag: boolean = false;

		console.log('step', syntaxNode?.symbol, syntaxNode?.value, syntaxNode?.token);
		if (!syntaxNode) {
			// 程序开始运行
			this.currentSyntaxNode = this.grammarAnalyzer.getSyntaxTree();
			this.currentBaseNode = this.grammarAnalyzer.getProgramNode();
			let programNode = this.currentBaseNode as ProgramNode;
			// 寻找 main
			let mainFunc = programNode.functionList.find((functionNode) => {
				return functionNode.name === 'main';
			})
			if (!mainFunc) {
				this.runtimeError(undefined, '缺少 main 函数');
			} else {
				this.currentCallStack.push(mainFunc);
				this.currentBaseNode = mainFunc;
				this.currentSyntaxNode = mainFunc.syntaxNode;
			}
		} else if (!baseNode) {
			// 有 syntaxNode，没有 baseNode，程序运行完毕
		} else if (syntaxNode.symbol === 'function_definition') {
			let compound_statement = syntaxNode.children![2];
			let statement_list: SyntaxNode | undefined;
			if (compound_statement.children!.length === 3 && compound_statement.children![1].symbol === 'statement_list') {
				// 只有实际操作的函数
				statement_list = compound_statement.children![1];
			} else if (compound_statement.children!.length === 4) {
				// 变量声明和实际操作都有的函数
				statement_list = compound_statement.children![2];
			}
			if (statement_list) {
				// ➡ statement_list
				compound_statement.executeIndex = 1;	// 事实上这个也应被标记已执行，否则会在退出花括号时尝试运行
				this.currentSyntaxNode = statement_list;
			} else {
				// 函数直接返回
				if (baseNode.parentNode) {
					syntaxNode.value = undefined;		// 函数调用结果为空
					this.currentBaseNode = baseNode.parentNode!;
					this.currentSyntaxNode = baseNode.parentNode!.syntaxNode;
				} else {
					console.log('程序运行完毕');
				}
			}
		} else if (syntaxNode.symbol === 'array_expression_closure') {
			if (!syntaxNode.executeIndex) {
				this.currentSyntaxNode = syntaxNode.children![1];
			} else if (syntaxNode.executeIndex === 1) {
				if (syntaxNode.children?.length === 4) {
					// 计算下一维
					this.currentSyntaxNode = syntaxNode.children![3];
				} else {
					// 返回
					syntaxNode.value = syntaxNode.children![1].value;
					this.currentSyntaxNode = syntaxNode.parent;
				}
			} else {
				// 返回
				syntaxNode.value = syntaxNode.children![1].value;
				this.currentSyntaxNode = syntaxNode.parent;
			}		
		} else if (syntaxNode.symbol === 'statement_list') {
			if (!syntaxNode.executeIndex) {
				// 执行 statement
				this.currentSyntaxNode = syntaxNode.children![0];
			} else if (syntaxNode.executeIndex === 1) {
				if (syntaxNode.children!.length === 1) {
					this.currentSyntaxNode = syntaxNode.parent;
				} else {
					// 执行 statement_list
					this.currentSyntaxNode = syntaxNode.children![1];
				}
			} else {
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'statement') {
			if (!syntaxNode.executeIndex) {
				this.currentSyntaxNode = syntaxNode.children![0];
			} else {
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'compound_statement') {
			if (!syntaxNode.executeIndex) {
				// 新建 BaseNode 节点
				let newNode: BaseNode = {
					variableList: [],
					syntaxNode: syntaxNode,
					parentNode: baseNode,
				};
				baseNode.subNode = newNode;
				// 收集变量表和语句列表
				let variable_definition_list: SyntaxNode | undefined;
				let statement_list: SyntaxNode | undefined;
				if (syntaxNode.children?.length === 4) {
					// 变量声明和实际操作都有
					variable_definition_list = syntaxNode.children![1];
					statement_list = syntaxNode.children![2];
				} else if (syntaxNode.children![1].symbol === 'statement_list') {
					// 只有实际操作，没有变量声明
					statement_list = syntaxNode.children![1];
				} else {
					// 只有变量声明，没有实际操作的块，没卵用
				}
				if (variable_definition_list) {
					let variable_definition = variable_definition_list.children![0];
					let name = variable_definition.children![1].value;
					let type = getVariableTypeBySyntaxNode(variable_definition);
					let value = createVariable(type);
					newNode.variableList.push({
						name,
						type,
						value,
					});
					// 递归查找
					if (variable_definition_list.children!.length === 2) {
						collectFunctionVariable(variable_definition_list.children![1], newNode);
					}	
				}
				if (statement_list) {
					// 变量声明和实际操作都有的函数
					this.currentSyntaxNode = syntaxNode.children![1];
					this.currentBaseNode = newNode;
				} else {
					// { } 内没有后续操作了，直接向上一层
					this.currentSyntaxNode = syntaxNode.parent;
					this.currentBaseNode = baseNode.parentNode;		// 变量表往上走
				}
			} else {
				let upperNode = baseNode.parentNode;
				if (upperNode) {
					this.currentSyntaxNode = syntaxNode.parent;
					this.currentBaseNode = baseNode.parentNode;		// 变量表往上走
				} else {
					// 函数执行完毕
					this.currentCallStack.pop();
					upperNode = this.currentCallStack[this.currentCallStack.length - 1];
					if (upperNode) {
						// 带到上一个函数
						this.currentBaseNode = upperNode;
						this.currentSyntaxNode = syntaxNode.parent;
					} else {
						// 程序执行完毕
						stopflag = true;
						setTimeout(() => {
							this.reset();
						}, 0);
					}
				}
			}
		} else if (syntaxNode.symbol === 'expression_statement') {
			if (!syntaxNode.executeIndex) {
				this.currentSyntaxNode = syntaxNode.children![0];
				stopflag = true;
			} else {
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'selection_statement') {
			if (!syntaxNode.executeIndex) {
				this.currentSyntaxNode = syntaxNode.children![2];		// 计算表达式
				stopflag = true;
			} else if (syntaxNode.executeIndex === 1) {
				let value: any = syntaxNode.children![2].value;
				if (value) {
					this.currentSyntaxNode = syntaxNode.children![4];	// then
				} else if (syntaxNode.children?.length === 7) {
					this.currentSyntaxNode = syntaxNode.children![6];	// else
				}
			} else {
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'iteration_statement') {
			if (!syntaxNode.executeIndex) {
				// 计算表达式
				this.currentSyntaxNode = syntaxNode.children![2];
				stopflag = true;
			} else if (syntaxNode.executeIndex === 1) {
				// 执行后续
				let value: any = syntaxNode.children![2].value;
				if (value) {
					// 值为真
					this.currentSyntaxNode = syntaxNode.children![4];
				} else {
					this.currentSyntaxNode = syntaxNode.parent;
				}
				syntaxNode.executeIndex -= 2;	// 清除执行历史，以便后面再次进入计算表达式
			} else {
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'jump_statement') {
			if (!syntaxNode.executeIndex) {
				if (syntaxNode.children!.length === 2) {
					// 返回空白
					syntaxNode.value = undefined;	// 函数调用结果为空
					let upperNode = baseNode.parentNode;
					if (upperNode) {
						this.currentSyntaxNode = syntaxNode.parent;
						this.currentBaseNode = baseNode.parentNode;		// 变量表往上走
					} else {
						// 函数执行完毕
						this.currentCallStack.pop();
						upperNode = this.currentCallStack[this.currentCallStack.length - 1];
						if (upperNode) {
							// 带到上一个函数
							this.currentBaseNode = upperNode;
							this.currentSyntaxNode = syntaxNode.parent;
						} else {
							// 程序执行完毕
							stopflag = true;
							setTimeout(() => {
								this.reset();
							}, 0);
						}
					}
				} else {
					this.currentSyntaxNode = syntaxNode.children![1];	// 先计算要 return 的内容
				}
				stopflag = true;
			} else {
				// 返回值
				syntaxNode.value = syntaxNode.children![1].value;	// 函数调用结果
				let upperNode = baseNode.parentNode;
				if (upperNode) {
					this.currentSyntaxNode = syntaxNode.parent;
					this.currentBaseNode = baseNode.parentNode;		// 变量表往上走
				} else {
					// 函数执行完毕
					this.currentCallStack.pop();
					upperNode = this.currentCallStack[this.currentCallStack.length - 1];
					if (upperNode) {
						// 带到上一个函数
						this.currentBaseNode = upperNode;
						this.currentSyntaxNode = syntaxNode.parent;
					} else {
						// 程序执行完毕
						stopflag = true;
						setTimeout(() => {
							this.reset();
						}, 0);
					}
				}
			}
		} else if (syntaxNode.symbol === 'expression') {
			if (!syntaxNode.executeIndex) {
				this.currentSyntaxNode = syntaxNode.children![0];
			} else if (syntaxNode.executeIndex === 1) {
				if (syntaxNode.children!.length === 3) {
					this.currentSyntaxNode = syntaxNode.children![2];
				} else {
					syntaxNode.value = syntaxNode.children![0].value;
					this.currentSyntaxNode = syntaxNode.parent;
				}
			} else {
				syntaxNode.value = syntaxNode.children![2].value;
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'assignment_expression') {
			if (!syntaxNode.executeIndex) {
				if (syntaxNode.children!.length === 3) {
					// 变量赋值语句，计算右值
					this.currentSyntaxNode = syntaxNode.children![2];
				} else if (syntaxNode.children!.length === 4) {
					// 数组变量赋值语句，计算右值
					this.currentSyntaxNode = syntaxNode.children![3];
				} else {
					// 不是赋值语句，计算子值
					this.currentSyntaxNode = syntaxNode.children![0];
				}
			} else if (syntaxNode.executeIndex === 1) {
				if (syntaxNode.children!.length === 3) {
					// 变量赋值语句，执行赋值
					let success = setVariable(baseNode, syntaxNode.children![2].value, syntaxNode);
					if (!success) {
						this.runtimeError(syntaxNode.token, `找不到标识符`);
					}
					syntaxNode.value = syntaxNode.children![2].value;
					this.currentSyntaxNode = syntaxNode.parent;
				} else if (syntaxNode.children!.length === 4) {
					// 数组变量赋值语句，计算地址
					this.currentSyntaxNode = syntaxNode.children![1];
				} else {
					// 不是赋值语句节点的第二次遍历，不做赋值操作，直接返回
					syntaxNode.value = syntaxNode.children![0].value;
					this.currentSyntaxNode = syntaxNode.parent;
				}
			} else {
				// 数组赋值
				let success = setVariable(baseNode, syntaxNode.children![3].value, syntaxNode, syntaxNode.children![1]);;
				if (!success) {
					this.runtimeError(syntaxNode.token, `找不到标识符`);
				}
				syntaxNode.value = syntaxNode.children![2].value;
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'addressing_expression') {
			if (!syntaxNode.executeIndex) {
				if (syntaxNode.children!.length === 1) {
					let result = getVariable(baseNode, syntaxNode);
					syntaxNode.value = result;
					this.currentSyntaxNode = syntaxNode.parent;
				} else {
					// 计算中括号内未计算的值
					this.currentSyntaxNode = syntaxNode.children![1];
				}
			} else {
				// 中括号内的值已经被计算好
				let result = getVariable(baseNode, syntaxNode);
				syntaxNode.value = result;
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'logical_expression') {
			if (!syntaxNode.executeIndex) {
				this.currentSyntaxNode = syntaxNode.children![0];
			} else if (syntaxNode.executeIndex === 1) {
				// 被执行 1 次，如果这不是逻辑判断语句那就直接返回，否则算第 2 个值
				if (syntaxNode.children?.length === 1) {
					syntaxNode.value = syntaxNode.children[0].value;
					this.currentSyntaxNode = syntaxNode.parent;
				} else {
					this.currentSyntaxNode = syntaxNode.children![2];
				}
			} else {
				// 被执行 2 次，那么该做逻辑判断操作然后返回了
				if (syntaxNode.children![1].symbol === '&&') {
					syntaxNode.value = syntaxNode.children![0].value && syntaxNode.children![2].value;
				} else {
					syntaxNode.value = syntaxNode.children![0].value || syntaxNode.children![2].value;
				}
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'equality_expression') {
			if (!syntaxNode.executeIndex) {
				this.currentSyntaxNode = syntaxNode.children![0];
			} else if (syntaxNode.executeIndex === 1) {
				// 被执行 1 次，如果这不是值判断语句那就直接返回，否则算第 2 个值
				if (syntaxNode.children?.length === 1) {
					syntaxNode.value = syntaxNode.children[0].value;
					this.currentSyntaxNode = syntaxNode.parent;
				} else {
					this.currentSyntaxNode = syntaxNode.children![2];
				}
			} else {
				// 被执行 2 次，那么该做值判断操作然后返回了
				if (syntaxNode.children![1].symbol === '==') {
					//@
					syntaxNode.value = syntaxNode.children![0].value == syntaxNode.children![2].value;	// eslint-disable-line
				} else {
					syntaxNode.value = syntaxNode.children![0].value != syntaxNode.children![2].value;	// eslint-disable-line
				}
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'relational_expression') {
			if (!syntaxNode.executeIndex) {
				this.currentSyntaxNode = syntaxNode.children![0];
			} else if (syntaxNode.executeIndex === 1) {
				// 被执行 1 次，如果这不是数值判断语句那就直接返回，否则算第 2 个值
				if (syntaxNode.children?.length === 1) {
					syntaxNode.value = syntaxNode.children[0].value;
					this.currentSyntaxNode = syntaxNode.parent;
				} else {
					this.currentSyntaxNode = syntaxNode.children![2];
				}
			} else {
				// 被执行 2 次，那么该做数值判断操作然后返回了
				if (syntaxNode.children![1].symbol === '<') {
					syntaxNode.value = syntaxNode.children![0].value < syntaxNode.children![2].value;
				} else if (syntaxNode.children![1].symbol === '>') {
					syntaxNode.value = syntaxNode.children![0].value > syntaxNode.children![2].value;
				} else if (syntaxNode.children![1].symbol === '<=') {
					syntaxNode.value = syntaxNode.children![0].value <= syntaxNode.children![2].value;
				} else {
					syntaxNode.value = syntaxNode.children![0].value >= syntaxNode.children![2].value;
				}
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'additive_expression') {
			if (!syntaxNode.executeIndex) {
				this.currentSyntaxNode = syntaxNode.children![0];
			} else if (syntaxNode.executeIndex === 1) {
				// 被执行 1 次，如果这不是加减法语句那就直接返回，否则算第 2 个值
				if (syntaxNode.children?.length === 1) {
					syntaxNode.value = syntaxNode.children[0].value;
					this.currentSyntaxNode = syntaxNode.parent;
				} else {
					this.currentSyntaxNode = syntaxNode.children![2];
				}
			} else {
				// 被执行 2 次，那么该做加减法操作然后返回了
				if (syntaxNode.children![1].symbol === '+') {
					syntaxNode.value = syntaxNode.children![0].value + syntaxNode.children![2].value;
				} else {
					syntaxNode.value = syntaxNode.children![0].value - syntaxNode.children![2].value;
				}
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'multiplicative_expression') {
			if (!syntaxNode.executeIndex) {
				this.currentSyntaxNode = syntaxNode.children![0];
			} else if (syntaxNode.executeIndex === 1) {
				// 被执行 1 次，如果这不是乘除法语句那就直接返回，否则算第 2 个值
				if (syntaxNode.children?.length === 1) {
					syntaxNode.value = syntaxNode.children[0].value;
					this.currentSyntaxNode = syntaxNode.parent;
				} else {
					this.currentSyntaxNode = syntaxNode.children![2];
				}
			} else {
				// 被执行 2 次，那么该做乘除法操作然后返回了
				if (syntaxNode.children![1].symbol === '*') {
					syntaxNode.value = syntaxNode.children![0].value * syntaxNode.children![2].value;
				} else {
					syntaxNode.value = syntaxNode.children![0].value / syntaxNode.children![2].value;
				}
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'unary_expression') {
			if (!syntaxNode.executeIndex) {
				if (syntaxNode.children!.length === 1) {
					this.currentSyntaxNode = syntaxNode.children![0];
				} else {
					this.currentSyntaxNode = syntaxNode.children![1];
				}
			} else {
				if (syntaxNode.children![0].symbol === '+') {
					syntaxNode.value = + syntaxNode.children![1].value;
				} else if (syntaxNode.children![0].symbol === '-') {
					syntaxNode.value = - syntaxNode.children![1].value;
				} else {
					syntaxNode.value = syntaxNode.children![0].value;
				}
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'primary_expression') {
			if (!syntaxNode.executeIndex) {
				if (syntaxNode.children![0].symbol === 'addressing_expression') {
					this.currentSyntaxNode = syntaxNode.children![0];
				} else if (syntaxNode.children![0].symbol === 'NUM') {
					syntaxNode.value = syntaxNode.children![0].value;
					this.currentSyntaxNode = syntaxNode.parent;
				} else if (syntaxNode.children![0].symbol === 'function_call') {
					this.currentSyntaxNode = syntaxNode.children![0];
				} else {
					this.currentSyntaxNode = syntaxNode.children![1];
				}
			} else {
				if (syntaxNode.children![0].symbol === 'function_call') {
					syntaxNode.value = syntaxNode.children![0].value;
				} else if (syntaxNode.children![0].symbol === 'addressing_expression') {
					syntaxNode.value = syntaxNode.children![0].value;
					this.currentSyntaxNode = syntaxNode.parent;
				} else {
					syntaxNode.value = syntaxNode.children![1].value;
				}
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'function_call') {
			if (!syntaxNode.executeIndex) {
				if (syntaxNode.children?.length === 4) {
					// 有参数，先计算
					this.currentSyntaxNode = syntaxNode.children![2];
				} else {
					// 无参数，直接执行
					let functionName = syntaxNode!.children![0].value;
					let functionNode = this.grammarAnalyzer.getProgramNode()?.functionList.find((functionNode) => {
						return functionNode.name === functionName;
					});
					if (functionNode) {
						this.currentCallStack.push(functionNode);
						this.currentBaseNode = functionNode;
						this.currentSyntaxNode = functionNode.syntaxNode;	
					} else if (this.checkBuiltInFunction(functionName)) {
						this.callBuiltInFunction(functionName);
					} else {
						this.runtimeError(syntaxNode.token, `找不到函数`);
						stopflag = true;
					}
				}
			} else if (syntaxNode.executeIndex === 1) {
				if (syntaxNode.children?.length === 4) {
					// 有参数，执行
					let functionName = syntaxNode!.children![0].value;
					let functionNode = this.grammarAnalyzer.getProgramNode()?.functionList.find((functionNode) => {
						return functionNode.name === functionName;
					});
					if (functionNode) {
						this.currentCallStack.push(functionNode);
						this.currentBaseNode = functionNode;
						this.currentSyntaxNode = functionNode.syntaxNode;
						applyFunctionParameter(functionNode, syntaxNode.children![2]);
					} else if (this.checkBuiltInFunction(functionName)) {
						this.callBuiltInFunction(functionName, attractFunctionParameter(syntaxNode!.children![2]));
					} else {
						this.runtimeError(syntaxNode.token, `找不到函数`);
						stopflag = true;
					}
				} else {
					// 无参数，已执行过，返回
					this.currentSyntaxNode = syntaxNode.parent;
				}
			} else {
				// 有参数，已执行过，返回
				this.currentSyntaxNode = syntaxNode.parent;
			}
		} else if (syntaxNode.symbol === 'logical_expression_list') {
			if (!syntaxNode.executeIndex) {
				this.currentSyntaxNode = syntaxNode.children![0];
			} else {
				if (syntaxNode.children!.length === 1) {
					syntaxNode.value = syntaxNode.children![0].value;
					this.currentSyntaxNode = syntaxNode.parent;
				} else {
					this.currentSyntaxNode = syntaxNode.children![2];
				}
			}
		}
		
		if (syntaxNode) {
			if (!syntaxNode.executeIndex) {
				syntaxNode.executeIndex = 1;
			} else {
				syntaxNode.executeIndex++;
			}
		}
		if (this.currentSyntaxNode === syntaxNode?.parent) {
			syntaxNode!.executeIndex = undefined;	// 清除执行记录，以便 while 语句重复计算
			console.log('↑');
		}
		if (stopflag) {
			console.log('STOP');
		} else {
			this.step();
		}
	}

	/**
	 * 重置任务运行状态
	 */
	public reset(): void {
		this.currentSyntaxNode = undefined;
		this.currentBaseNode = undefined;
		this.currentCallStack = [];
		this.printBuffer = '';
		this.emit(CodeServiceEvent.RuntimeReset);
		this.compile();
	}

	/**
	 * 指示运行错误状态
	 */
	private runtimeError(errToken: Token | undefined, message?: string): void {
		console.error('运行时错误', errToken, message);
		this.emit(CodeServiceEvent.GrammarReady, errToken, message);
	}

	/**
	 * 检查是否有此内置函数
	 */
	private checkBuiltInFunction(name: string): boolean {
		switch (name) {
			case 'print2Buffer':
			case 'alert':
				return true;
			default:
				return false;
		}
	}
	
	/**
	 * 调用内置函数
	 */
	private callBuiltInFunction(name: string, parameterList?: Array<any>): void {
		switch (name) {
			case 'print2Buffer':
				let str = parameterList?.join(', ') || [];
				this.printBuffer += str + '　';
				console.log('%cprint2Buffer', 'color: #00AA00; ');
				break;
			case 'alert':
				alert(this.printBuffer);
				this.printBuffer = '';
				break;
			default:
				break;
		}
	}
	
	
}
