import { BasicType, FunctionNode, Production, ProgramNode, SyntaxNode, Token, TokenType, VariableType } from "../types/types";

const LR: Array<Array<string>> = [];
const hash: Map<string, number> = new Map();	// 将符号字符串映射到 LR 表中的列号
const productions: Array<Production> = [];		// 文法（产生式）列表

function getVariableTypeBySyntaxNode(node: SyntaxNode): VariableType {
	if (node.symbol === 'variable_type') {	// 基本类型
		switch (node.children![0].symbol) {
			case 'INT':
				return { basic: BasicType.integer };
			case 'FLOAT':
				return { basic: BasicType.float };
			case 'VOID':
				return { basic: BasicType.void };
			default:
				throw new Error("变量类型错误");
		}
	} else if (node.symbol === 'variable_definition') {	// 函数体内的变量声明
		if (node.children![2].symbol === 'array_closure') {
			let numArray: Array<number> = [];
			let subNode = node.children![2];
			numArray.push(subNode.children![1].value);	// 记录一维长度
			while (subNode.children?.length === 4) {
				numArray.push(subNode.children![2].value);
			}
			numArray.push(subNode.children![2].value);	// 记录最后一维长度
			return {
				basic: getVariableTypeBySyntaxNode(node.children![0]).basic,
				length: numArray,
			};
		} else {
			return {
				basic: getVariableTypeBySyntaxNode(node.children![0]).basic,
			}
		}
	} else {
		throw new Error("变量类型错误");
	}
}

function convertTokenType2LRtitle(tokenType: TokenType): string {
	switch (tokenType) {
		case TokenType.compare_unequal:
			return '!=';
		case TokenType.eof:
			return '#';
		case TokenType.brakets_round_left:
			return '(';
		case TokenType.brakets_round_right:
			return ')';
		case TokenType.calc_multiply:
			return '*';
		case TokenType.calc_add:
			return '+';
		case TokenType.comma:
			return ',';
		case TokenType.calc_minus:
			return '-';
		case TokenType.calc_devide:
			return '/';
		case TokenType.semicon:
			return ';';
		case TokenType.compare_less:
			return '<';
		case TokenType.compare_less_equal:
			return '<=';
		case TokenType.calc_assign:
			return '=';
		case TokenType.compare_equal:
			return '==';
		case TokenType.compare_great:
			return '>';
		case TokenType.compare_great_equal:
			return '>=';
		case TokenType.keyword_else:
			return 'ELSE';
		case TokenType.keyword_float:
			return 'FLOAT';
		case TokenType.identifier:
			return 'ID';
		case TokenType.keyword_if:
			return 'IF';
		case TokenType.keyword_int:
			return 'INT';
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
			return 'NUM';
		case TokenType.keyword_return:
			return 'RETURN';
		case TokenType.keyword_void:
			return 'VOID';
		case TokenType.keyword_while:
			return 'WHILE';
		case TokenType.brakets_square_left:
			return '[';
		case TokenType.brakets_square_right:
			return ']';
		case TokenType.brakets_curly_left:
			return '{';
		case TokenType.brakets_curly_right:
			return '}';
		default:
			return '';
	}
}

export class GrammarAnalysis {
	private syntaxTree?: SyntaxNode
	private syntaxError: Token | undefined;		// 如果语法错误，此处记录最后一次移进符，否则为 undefined
	private nodeCount: number = 0;

	constructor() {
		console.log('LR', LR);
		console.log('hash', hash);
		console.log('productions', productions);
	}

	/**
	 * 如果语法错误，获取最后一次移进符，否则返回 undefined
	 */
	public getSyntaxError(): Token | undefined {
		return this.syntaxError;
	}

	/**
	 * 获取节点树中的节点数
	 */
	public getNodeCount(): number {
		return this.nodeCount;
	}

	/**
	 * 对全文进行语法分析，产出语法树
	 */
	public grammarAnalyze(tokenList: Array<Token>): SyntaxNode {
		let stackStatus: Array<number> = [];	// 状态栈
		let stackNode: Array<SyntaxNode> = [];	// 符号栈
		let tokenIndex = 0;						// 输入“栈”
		let lastToken: Token | undefined;		// 最后一次正常的移进符
		let nodeCount: number = 0;

		stackStatus.push(0);	// 初始状态
		stackNode.push({
			symbol: '#'
		});

		while (true) {
			let topStatus = stackStatus[stackStatus.length - 1];
			let input = convertTokenType2LRtitle(tokenList[tokenIndex].type);
			let action = LR[topStatus][hash.get(input)!];
			if (!action || action === 'err') {
				// !action: LR 表中没有对应的转换，一般是程序结束后后面还有代码所致
				// action === 'err': 语法分析错误
				this.syntaxError = lastToken;				// 记录最后一次正常的移进符
				this.syntaxTree = stackNode[stackNode.length - 1];
				this.nodeCount = nodeCount;
				return this.syntaxTree;						// 返回非根节点
			} else if (action === "acc") {	// 如果是 acc 表示结束
				break;
			} else if (action[0] === 's') {	// 如果 action 第一个字符为 s，表示移进
				action = action.slice(1);					// 删掉“s”
				stackStatus.push(parseInt(action));			// 状态栈进栈
				let node: SyntaxNode = {
					symbol: input
				};
				nodeCount++;
				if (input === 'ID' || input === "NUM") {
					node.value = tokenList[tokenIndex].value;
				}
				stackNode.push(node);						// 符号栈进栈
				lastToken = tokenList[tokenIndex];			// 记录最后一次正常的移进符
				tokenIndex++;								// 输入栈出栈
			} else {						// 归约
				action = action.slice(1);					// 删掉“s”
				let prod = productions[parseInt(action)];	// 使用第几条产生式归约
				let len = prod.T.length;					// 要被归约的长度
				let node: SyntaxNode = {
					symbol: prod.NT,
					children: [],
				};
				nodeCount++;
				while (len--) {
					stackStatus.pop();						// 状态栈出栈
					node.children!.unshift(stackNode.pop()!);	// 符号栈出栈，丢出来的东西作为父节点的孩子
				}
				stackNode.push(node);						// 符号栈进栈
				topStatus = stackStatus[stackStatus.length - 1]
				let newStatus = parseInt(LR[topStatus][hash.get(prod.NT)!]);	// 状态栈进栈
				stackStatus.push(newStatus);
			}
		}
		this.syntaxError = undefined;
		this.syntaxTree = stackNode[stackNode.length - 1];
		this.nodeCount = nodeCount;
		return this.syntaxTree;		// 返回根节点
	}

	/**
	 * 分析变量表
	 */
	public semanticAnalyze(): ProgramNode {
		let programNode: ProgramNode = {
			functionList: []
		};
		let syntaxTree = this.syntaxTree;

		// 收集 functionList
		function collectFunctionList(function_definition_list: SyntaxNode) {
			let function_definition = function_definition_list.children![0];
			let newFunc: FunctionNode = {
				returnType: getVariableTypeBySyntaxNode(function_definition.children![0]),
				name: '',
				parameterList: [],
				variableList: [],
				statementNode: function_definition.children![2],
			};
			// 获取函数名
			let function_declaration = function_definition.children![1];
			let function_name = function_declaration.children![0];
			let functionName = function_name.value;
			newFunc.name = functionName;
			programNode.functionList.push(newFunc);
			// 递归查找
			if (function_definition_list.children!.length === 2) {
				collectFunctionList(function_definition_list.children![1]);
			}
		}
		if (syntaxTree!.children && syntaxTree!.children[0].symbol === 'function_definition_list') {
			// 程序中必须有至少一个函数，否则语法分析这步就过不了，就不会来到这里
			let function_definition_list = syntaxTree!.children[0];
			collectFunctionList(function_definition_list);
		}

		// 收集 functionList 的变量表
		function collectFunctionVariable(variable_definition_list: SyntaxNode, functionNode: FunctionNode) {
			let variable_definition = variable_definition_list.children![0];
			let name = variable_definition.children![1].value;
			let type = getVariableTypeBySyntaxNode(variable_definition);
			functionNode.parameterList.push({
				name,
				type,
			});
			// 递归查找
			if (variable_definition_list.children!.length === 2) {
				collectFunctionVariable(variable_definition_list.children![1], functionNode);
			}
		}
		for (const functionNode of programNode.functionList) {
			let compound_statement = functionNode.statementNode;
			let variable_definition_list;
			if (compound_statement.children!.length === 3 && compound_statement.children![1].symbol === 'variable_definition_list') {
				// 只有变量声明，没有实际操作的函数，没什么卵用
				variable_definition_list = compound_statement.children![1];
			} else if (compound_statement.children!.length === 4) {
				// 变量声明和实际操作都有的函数
				variable_definition_list = compound_statement.children![1];
			} else {
				continue;
			}
			collectFunctionVariable(variable_definition_list, functionNode);
		}

		return programNode;
	}
}

// #region 手动输入语法区

const LRstr = `err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err 4 5 err err err err err err 6 err err err err err err 7 8 9 
err err err err err err err err err err err err err err err err err err r8 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err r7 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err r6 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r3 err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err 4 10 err err err err err err err err err err err err err err err 11 
err r1 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err acc err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err err err err err err err err err err err err 7 12 13 
err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err 4 14 err err err err err err err err err err err err err err err 11 
err err err err err err err err err err err err err err err err err err s15 err err err err err err err err err err err err err err err err err 16 err err err err err err err err err err err err err err err err err err 
err r4 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err s17 err err err err err err err err err err err err err err err err err 16 err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err r21 err err r21 err err r21 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err s18 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r2 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s19 err err err err err err s20 err err err err err err err err err err err err err err err s21 err err err err 22 err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s24 err err err err 23 err err err err err err err err err err err err err err err err err err err err err err 
err err s19 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s20 err err err err err err err err err err err err err err err s21 err err err err 22 err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s25 err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err err 26 27 err err err err err err err err err err 28 
err err err err err err err err err err err err err err err err err r22 err err r22 err err r22 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err s29 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s30 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r5 err err err err err err err err err err err err err err err r5 err err r5 err err r5 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err s1 s35 s36 s2 s37 s38 s3 s39 err err s59 s60 40 err 41 42 43 44 45 err err err 46 47 48 err err 49 err 50 51 52 53 54 55 56 57 58 
err err err err err err err err err err err err err err err err err err err err err err err err err err err r11 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r13 err err s61 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s62 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err s63 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err s64 err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err r23 err err r23 err err r23 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s66 err err s67 err err err err err err err 68 err 69 err 70 71 err err err err err err 72 err err 73 err 74 err err err 75 76 err err err 
err err r62 err err r62 err r62 err err err err err err err err err err r62 err err r62 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r63 err err r63 err r63 err err err err err err err err err err r63 err err r63 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r31 err err r31 err r31 err r31 err err err err err err err err r31 r31 err r31 r31 err r31 err err r31 r31 err err err err err err err err err err err err err err err err err err err err err err err err err err 
r59 err err err r59 r59 r59 r59 r59 r59 r59 r59 s77 r59 r59 r59 err err err err err err err err err s78 err err err err 79 err err err err err err err err err err err err err err err err err err err err err err err err 
err err s80 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r60 err err err r60 r60 r60 r60 r60 r60 r60 r60 err r60 r60 r60 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s81 err err err err err err err err s35 err err s37 err err err err err err err 40 err 41 err 43 82 err err err err err err 48 err err 49 err 50 err err err 54 55 err err err 
err err s83 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r46 err err err err err r46 err err r46 s84 s85 err r46 s86 s87 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err s88 err err r38 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r26 err err r26 err r26 err r26 err err err err err err err err r26 r26 err r26 r26 err r26 err err r26 r26 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err r42 err err r42 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s89 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r27 err err r27 err r27 err r27 err err err err err err err err r27 r27 err r27 r27 err r27 err err r27 r27 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r29 err err r29 err r29 err r29 err err err err err err err err r29 r29 err r29 r29 err r29 err err r29 r29 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r30 err err r30 err r30 err r30 err err err err err err err err r30 r30 err r30 r30 err r30 err err r30 r30 err err err err err err err err err err err err err err err err err err err err err err err err err err 
r51 err err err err s90 r51 s91 err r51 r51 r51 err r51 r51 r51 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r57 err err err r57 r57 r57 r57 r57 r57 r57 r57 err r57 r57 r57 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
s92 err err err err err r43 err err r43 err err err s93 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r28 err err r28 err r28 err r28 err err err err err err err err r28 r28 err r28 r28 err r28 err err r28 r28 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s59 r24 40 err 41 42 43 44 45 err err err 46 47 48 err err 49 err 50 51 52 94 54 55 err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err s95 err err err err err err err err err err err err err err err err err err err err err err err err err err 
r54 err err err s96 r54 r54 r54 s97 r54 r54 r54 err r54 r54 r54 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s98 err err s37 err err err err err err err err err err err err err err err err err err err err err err 49 err err err err err 99 55 err err err 
err err r20 err err r20 err r20 err r20 err err err err err err err s1 r20 r20 s2 r20 r20 s3 r20 err err r20 r20 err err err err err err err err err err err err err err err err err err err err err err err 56 100 58 
err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s59 s102 40 err 41 42 43 44 45 err err err 46 47 48 err err 49 err 50 51 52 101 54 55 err err err 
err err err err err err err err err err err err err err err err err err s103 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err s1 s35 s36 s2 s37 s38 s3 s39 err err s59 s106 40 err 41 42 43 44 45 err err err 46 47 48 err err 49 err 50 51 52 104 54 55 56 105 58 
err r16 err err err err err err err err err err err err err err err r16 err err r16 err err r16 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err err 26 107 err err err err err err err err err err 28 
err err err err err err err err err err err err err err err err err err err err err err err err err err err r12 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r15 err err r15 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err r10 err err err err err err err err err err err err err err err s21 err err err err 108 err err err err err err err err err err err err err err err err err err err err err err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s66 err err s67 err err err err err err err 68 err 69 err 70 109 err err err err err err 72 err err 73 err 74 err err err 75 76 err err err 
r59 err err r59 r59 r59 r59 r59 r59 err r59 r59 s110 r59 r59 r59 err err err err err err err err err s78 err err err err 111 err err err err err err err err err err err err err err err err err err err err err err err err 
r60 err err r60 r60 r60 r60 r60 r60 err r60 r60 err r60 r60 r60 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r46 err err r46 err err r46 err err err s112 s113 err r46 s114 s115 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r38 err err s116 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r42 err err r42 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s117 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r51 err err r51 err s118 r51 s119 err err r51 r51 err r51 r51 r51 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r57 err err r57 r57 r57 r57 r57 r57 err r57 r57 err r57 r57 r57 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
s120 err err r43 err err r43 err err err err err err s121 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r54 err err r54 s122 r54 r54 r54 s123 err r54 r54 err r54 r54 r54 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s124 err err s67 err err err err err err err err err err err err err err err err err err err err err err 73 err err err err err 125 76 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s35 err err s37 err err err err err err err 40 err 126 err 43 err err err err err err err 48 err err 49 err 50 err err err 54 55 err err err 
err err err err err err err err err err err err err err err err err err err err err s127 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err s128 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s66 err err s67 err err err err err err err 68 err 69 err 70 129 err err err err err err 72 err err 73 err 74 err err err 75 76 err err err 
err err r36 err err r36 err r36 err r36 err err err err err err err err r36 r36 err r36 r36 err r36 err err r36 r36 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s130 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s66 err err s67 err err err err err err err 68 err 69 err 70 131 err err err err err err 72 err err 73 err 74 err err err 75 76 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s98 err err s37 err err err err err err err 40 err err err err err err err err err err err 48 err err 49 err 132 err err err 54 55 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s98 err err s37 err err err err err err err 40 err err err err err err err err err err err 48 err err 49 err 133 err err err 54 55 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s98 err err s37 err err err err err err err 40 err err err err err err err err err err err 48 err err 49 err 134 err err err 54 55 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s98 err err s37 err err err err err err err 40 err err err err err err err err err err err 48 err err 49 err 135 err err err 54 55 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s35 err err s37 err err err err err err err 40 err 41 err 43 136 err err err err err err 48 err err 49 err 50 err err err 54 55 err err err 
err err r32 err err r32 err r32 err r32 err err err err err err err err r32 r32 err r32 r32 err r32 err err r32 r32 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s98 err err s37 err err err err err err err 137 err err err err err err err err err err err 48 err err 49 err err err err err 54 55 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s98 err err s37 err err err err err err err 138 err err err err err err err err err err err 48 err err 49 err err err err err 54 55 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s98 err err s37 err err err err err err err 40 err err err 139 err err err err err err err 48 err err 49 err 50 err err err 54 55 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s98 err err s37 err err err err err err err 40 err err err 140 err err err err err err err 48 err err 49 err 50 err err err 54 55 err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err r25 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r18 err err err err err err err err err err err err err err err r18 err err r18 err err r18 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s98 err err s37 err err err err err err err err err err err err err err err err err err err 141 err err 49 err err err err err 54 55 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s98 err err s37 err err err err err err err err err err err err err err err err err err err 142 err err 49 err err err err err 54 55 err err err 
r59 err err err r59 r59 r59 r59 r59 r59 r59 r59 err r59 r59 r59 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r58 err err err r58 r58 r58 r58 r58 r58 r58 r58 err r58 r58 r58 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r21 err err r21 err r21 err r21 err err err err err err err err r21 r21 err r21 r21 err r21 err err r21 r21 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err s143 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r17 err err err err err err err err err err err err err err err r17 err err r17 err err r17 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s144 err err err err err err err err err err err err err err err s21 err err err err 145 err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err s146 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s59 s148 40 err 41 42 43 44 45 err err err 46 47 48 err err 49 err 50 51 52 147 54 55 err err err 
err err r16 err err r16 err r16 err r16 err err err err err err err err r16 r16 err r16 r16 err r16 err err r16 r16 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r14 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err r9 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s149 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s66 err err s67 err err err err err err err 68 err 150 err 70 err err err err err err err 72 err err 73 err 74 err err err 75 76 err err err 
err err err err err err err err err err err err s151 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s124 err err s67 err err err err err err err 68 err err err err err err err err err err err 72 err err 73 err 152 err err err 75 76 err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s124 err err s67 err err err err err err err 68 err err err err err err err err err err err 72 err err 73 err 153 err err err 75 76 err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s124 err err s67 err err err err err err err 68 err err err err err err err err err err err 72 err err 73 err 154 err err err 75 76 err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s124 err err s67 err err err err err err err 68 err err err err err err err err err err err 72 err err 73 err 155 err err err 75 76 err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s66 err err s67 err err err err err err err 68 err 69 err 70 156 err err err err err err 72 err err 73 err 74 err err err 75 76 err err err 
r61 err err err r61 r61 r61 r61 r61 r61 r61 r61 err r61 r61 r61 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s124 err err s67 err err err err err err err 157 err err err err err err err err err err err 72 err err 73 err err err err err 75 76 err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s124 err err s67 err err err err err err err 158 err err err err err err err err err err err 72 err err 73 err err err err err 75 76 err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s124 err err s67 err err err err err err err 68 err err err 159 err err err err err err err 72 err err 73 err 74 err err err 75 76 err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s124 err err s67 err err err err err err err 68 err err err 160 err err err err err err err 72 err err 73 err 74 err err err 75 76 err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s124 err err s67 err err err err err err err err err err err err err err err err err err err 161 err err 73 err err err err err 75 76 err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s124 err err s67 err err err err err err err err err err err err err err err err err err err 162 err err 73 err err err err err 75 76 err err err 
r59 err err r59 r59 r59 r59 r59 r59 err r59 r59 err r59 r59 r59 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r58 err err r58 r58 r58 r58 r58 r58 err r58 r58 err r58 r58 r58 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err r40 err err r40 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err s163 err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s35 err err s37 err err err err err err err 40 err 164 err 43 err err err err err err err 48 err err 49 err 50 err err err 54 55 err err err 
err err err s165 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r37 err err r37 err r37 err r37 err err err err err err err err r37 r37 err r37 r37 err r37 err err r37 r37 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s166 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r47 err err err err err r47 err err r47 err err err r47 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r49 err err err err err r49 err err r49 err err err r49 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r48 err err err err err r48 err err r48 err err err r48 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r50 err err err err err r50 err err r50 err err err r50 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err r39 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r52 err err err err err r52 err err r52 r52 r52 err r52 r52 r52 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r53 err err err err err r53 err err r53 r53 r53 err r53 r53 r53 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err r45 err err r45 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err r44 err err r44 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r55 err err err err r55 r55 r55 err r55 r55 r55 err r55 r55 r55 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r56 err err err err r56 r56 r56 err r56 r56 r56 err r56 r56 r56 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r19 err err err err err err err err err err err err err err err r19 err err r19 err err r19 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r22 err err r22 err r22 err r22 err err err err err err err r22 r22 r22 r22 r22 r22 r22 r22 err err r22 r22 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s167 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r18 err err r18 err r18 err r18 err err err err err err err err r18 r18 err r18 r18 err r18 err err r18 r18 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err s168 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r17 err err r17 err r17 err r17 err err err err err err err err r17 r17 err r17 r17 err r17 err err r17 r17 err err err err err err err err err err err err err err err err err err err err err err err err err err 
r61 err err r61 r61 r61 r61 r61 r61 err r61 r61 err r61 r61 r61 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r40 err err r40 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s66 err err s67 err err err err err err err 68 err 169 err 70 err err err err err err err 72 err err 73 err 74 err err err 75 76 err err err 
r47 err err r47 err err r47 err err err err err err r47 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r49 err err r49 err err r49 err err err err err err r49 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r48 err err r48 err err r48 err err err err err err r48 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r50 err err r50 err err r50 err err err err err err r50 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r39 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r52 err err r52 err err r52 err err err r52 r52 err r52 r52 r52 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r53 err err r53 err err r53 err err err r53 r53 err r53 r53 r53 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r45 err err r45 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r44 err err r44 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r55 err err r55 err r55 r55 r55 err err r55 r55 err r55 r55 r55 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r56 err err r56 err r56 r56 r56 err err r56 r56 err r56 r56 r56 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err r10 err err err err err err err err err err err err s78 err err err err 170 err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err r41 err err r41 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s171 err err err err err err err err s35 s172 err s37 s173 err s174 err err s182 err 40 err 41 175 43 176 177 err err err 178 179 48 err err 49 err 50 180 181 err 54 55 err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s59 err 40 err 41 42 43 44 45 err err err 46 47 48 err err 49 err 50 51 183 err 54 55 err err err 
err err r23 err err r23 err r23 err r23 err err err err err err err r23 r23 r23 r23 r23 r23 r23 r23 err err r23 r23 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r19 err err r19 err r19 err r19 err err err err err err err err r19 r19 err r19 r19 err r19 err err r19 r19 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r41 err err r41 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err r9 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r31 err err r31 err r31 err r31 err err err err err err r31 err r31 r31 err r31 r31 err r31 err err r31 r31 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s184 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s185 err err err err err err err err s35 err err s37 err err err err err err err 40 err 41 err 43 186 err err err err err err 48 err err 49 err 50 err err err 54 55 err err err 
err err s187 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r26 err err r26 err r26 err r26 err err err err err err r26 err r26 r26 err r26 r26 err r26 err err r26 r26 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s188 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r27 err err r27 err r27 err r27 err err err err err err r27 err r27 r27 err r27 r27 err r27 err err r27 r27 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r29 err err r29 err r29 err r29 err err err err err err r29 err r29 r29 err r29 r29 err r29 err err r29 r29 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r30 err err r30 err r30 err r30 err err err err err err r30 err r30 r30 err r30 r30 err r30 err err r30 r30 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r28 err err r28 err r28 err r28 err err err err err err r28 err r28 r28 err r28 r28 err r28 err err r28 r28 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r33 err err r33 err r33 err r33 err err err err err err s189 err r33 r33 err r33 r33 err r33 err err r33 r33 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err s1 s35 s36 s2 s37 s38 s3 s39 err err s59 s192 40 err 41 42 43 44 45 err err err 46 47 48 err err 49 err 50 51 52 190 54 55 56 191 58 
err err r35 err err r35 err r35 err r35 err err err err err err err err r35 r35 err r35 r35 err r35 err err r35 r35 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s66 err err s67 err err err err err err err 68 err 69 err 70 193 err err err err err err 72 err err 73 err 74 err err err 75 76 err err err 
err err r36 err err r36 err r36 err r36 err err err err err err r36 err r36 r36 err r36 r36 err r36 err err r36 r36 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s194 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s65 err err s32 err s33 err err err err err err err err err err s66 err err s67 err err err err err err err 68 err 69 err 70 195 err err err err err err 72 err err 73 err 74 err err err 75 76 err err err 
err err r32 err err r32 err r32 err r32 err err err err err err r32 err r32 r32 err r32 r32 err r32 err err r32 r32 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s59 err 40 err 41 42 43 44 45 err err err 46 47 48 err err 49 err 50 51 196 err 54 55 err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err s197 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s59 s199 40 err 41 42 43 44 45 err err err 46 47 48 err err 49 err 50 51 52 198 54 55 err err err 
err err r16 err err r16 err r16 err r16 err err err err err err r16 err r16 r16 err r16 r16 err r16 err err r16 r16 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s200 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r37 err err r37 err r37 err r37 err err err err err err r37 err r37 r37 err r37 r37 err r37 err err r37 r37 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s201 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r34 err err r34 err r34 err r34 err err err err err err err err r34 r34 err r34 r34 err r34 err err r34 r34 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r18 err err r18 err r18 err r18 err err err err err err r18 err r18 r18 err r18 r18 err r18 err err r18 r18 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err s202 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r17 err err r17 err r17 err r17 err err err err err err r17 err r17 r17 err r17 r17 err r17 err err r17 r17 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s171 err err err err err err err err s35 s172 err s37 s173 err s174 err err s182 err 40 err 41 175 43 176 177 err err err 178 179 48 err err 49 err 50 180 203 err 54 55 err err err 
err err s31 err err s32 err s33 err s171 err err err err err err err err s35 s172 err s37 s173 err s174 err err s182 err 40 err 41 175 43 176 177 err err err 178 179 48 err err 49 err 50 180 204 err 54 55 err err err 
err err r19 err err r19 err r19 err r19 err err err err err err r19 err r19 r19 err r19 r19 err r19 err err r19 r19 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r33 err err r33 err r33 err r33 err err err err err err s205 err r33 r33 err r33 r33 err r33 err err r33 r33 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r35 err err r35 err r35 err r35 err err err err err err r35 err r35 r35 err r35 r35 err r35 err err r35 r35 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s171 err err err err err err err err s35 s172 err s37 s173 err s174 err err s182 err 40 err 41 175 43 176 177 err err err 178 179 48 err err 49 err 50 180 206 err 54 55 err err err 
err err r34 err err r34 err r34 err r34 err err err err err err r34 err r34 r34 err r34 r34 err r34 err err r34 r34 err err err err err err err err err err err err err err err err err err err err err err err err err err 
`;

const LRtitle = `!=                               #                               (                               )                               *                               +                               ,                               -                               /                               ;                               <                              <=                               =                              ==                               >                              >=                            ELSE                           FLOAT                              ID                              IF                             INT                             NUM                          RETURN                            VOID                           WHILE                               [                               ]                               {                               }|             additive_expression                   array_closure           assignment_expression              compound_statement             equality_expression                      expression            expression_statement            function_declaration             function_definition        function_definition_list             iteration_statement                  jump_statement       multiplicative_expression           parameter_declaration                  parameter_list              primary_expression                         program           relational_expression             selection_statement                       statement                  statement_list                unary_expression                  unary_operator             variable_definition        variable_definition_list                   variable_type`;

const grammarStr = `program' -> program
program -> function_definition_list
program -> variable_definition_list function_definition_list
function_definition_list -> function_definition
function_definition_list -> function_definition function_definition_list
function_definition -> variable_type function_declaration compound_statement
variable_type -> VOID
variable_type -> INT
variable_type -> FLOAT
array_closure -> [ NUM ] array_closure
array_closure -> [ NUM ]
function_declaration -> ID ( )
function_declaration -> ID ( parameter_list )
parameter_list -> parameter_declaration
parameter_list -> parameter_declaration , parameter_list
parameter_declaration -> variable_type ID
compound_statement -> { }
compound_statement -> { variable_definition_list }
compound_statement -> { statement_list }
compound_statement -> { variable_definition_list statement_list }
variable_definition_list -> variable_definition
variable_definition_list -> variable_definition variable_definition_list
variable_definition -> variable_type ID ;
variable_definition -> variable_type ID array_closure ;
statement_list -> statement
statement_list -> statement statement_list
statement -> compound_statement
statement -> expression_statement
statement -> selection_statement
statement -> iteration_statement
statement -> jump_statement
expression_statement -> ;
expression_statement -> expression ;
selection_statement -> IF ( expression ) statement
selection_statement -> IF ( expression ) statement ELSE statement
iteration_statement -> WHILE ( expression ) statement
jump_statement -> RETURN ;
jump_statement -> RETURN expression ;
expression -> assignment_expression
expression -> assignment_expression , expression
assignment_expression -> ID = assignment_expression
assignment_expression -> ID array_closure = assignment_expression
assignment_expression -> equality_expression
equality_expression -> relational_expression
equality_expression -> relational_expression == equality_expression
equality_expression -> relational_expression != equality_expression
relational_expression -> additive_expression
relational_expression -> additive_expression < relational_expression
relational_expression -> additive_expression > relational_expression
relational_expression -> additive_expression <= relational_expression
relational_expression -> additive_expression >= relational_expression
additive_expression -> multiplicative_expression
additive_expression -> multiplicative_expression + additive_expression
additive_expression -> multiplicative_expression - additive_expression
multiplicative_expression -> unary_expression
multiplicative_expression -> unary_expression * multiplicative_expression
multiplicative_expression -> unary_expression / multiplicative_expression
unary_expression -> primary_expression
unary_expression -> unary_operator unary_expression
primary_expression -> ID
primary_expression -> NUM
primary_expression -> ( expression )
unary_operator -> +
unary_operator -> -`;

// #endregion

// #region 自动执行区

/**
 * 从 LR 字符串中获取 LR 表
 * 仅需执行一次
 */
(function calcLR(LRstr: string) {
	// LR.splice(0, Number.MAX_SAFE_INTEGER);
	const strLines = LRstr.split('\n');
	for (const strLine of strLines) {
		const strArr = strLine.split(' ');
		strArr.pop();	// 最后一项是空格
		LR.push(strArr);
	}
	LR.pop();	// 最后一项是空行
})(LRstr);

/**
 * 从 LR 表头中获取 Hash
 * 仅需执行一次
 */
(function calcHash(LRtitle: string) {
	LRtitle = LRtitle.replace(/\|/g, '');
	LRtitle = LRtitle.replace(/ +/g, ' ');
	let arr = LRtitle.split(' ');
	for (let i = 0; i < arr.length; i++) {
		hash.set(arr[i], i);
	}
})(LRtitle);

/**
 * 从文法中获取产生式
 */
(function calcProduction(grammarStr: string){
	for (const prodStr of grammarStr.split('\n')) {
		let arr = prodStr.split(' ');
		productions.push({
			NT: arr[0],
			T: arr.slice(2),
		});
	}
})(grammarStr);