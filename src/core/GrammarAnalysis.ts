import { BaseNode, BasicType, FunctionNode, Production, ProgramNode, SyntaxNode, Token, TokenType, VariableType } from "../types/types";

const LR: Array<Array<string>> = [];
const hash: Map<string, number> = new Map();	// 将符号字符串映射到 LR 表中的列号
const productions: Array<Production> = [];		// 文法（产生式）列表

/**
 * C 语言变量类型转本工程变量类型 VariableType
 */
export function getVariableTypeBySyntaxNode(node: SyntaxNode): VariableType {
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
	} else if (node.symbol === 'variable_definition') {		// 函数体内的变量声明
		if (node.children![2].symbol === 'array_closure') {
			let numArray: Array<number> = [];
			let subNode = node.children![2];
			numArray.push(subNode.children![1].value);		// 记录一维长度
			while (subNode.children?.length === 4) {
				numArray.push(subNode.children![1].value);
				subNode = subNode.children![3];
			}
			numArray.push(subNode.children![1].value);		// 记录最后一维长度
			return {
				basic: getVariableTypeBySyntaxNode(node.children![0]).basic,
				length: numArray,
			};
		} else {
			return {
				basic: getVariableTypeBySyntaxNode(node.children![0]).basic,
			}
		}
	} else if (node.symbol === 'parameter_declaration') {	// 函数形参，跟函数体内的变量声明语法几乎一样
		if (node.children!.length === 3) {
			let numArray: Array<number> = [];
			let subNode = node.children![2];
			numArray.push(subNode.children![1].value);		// 记录一维长度
			while (subNode.children?.length === 4) {
				numArray.push(subNode.children![1].value);
				subNode = subNode.children![3];
			}
			numArray.push(subNode.children![1].value);		// 记录最后一维长度
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

/**
 * 收集 functionList，结果返回到 programNode 中
 */
export function collectFunctionList(function_definition_list: SyntaxNode, programNode: ProgramNode) {
	let function_definition = function_definition_list.children![0];
	let newFunc: FunctionNode = {
		returnType: getVariableTypeBySyntaxNode(function_definition.children![0]),
		name: '',
		parameterList: [],
		variableList: [],
		syntaxNode: function_definition,
	};
	// 获取函数名
	let function_declaration = function_definition.children![1];
	let function_name = function_declaration.children![0];
	let functionName = function_name.value;
	newFunc.name = functionName;
	programNode.functionList.push(newFunc);
	// 递归查找
	if (function_definition_list.children!.length === 2) {
		collectFunctionList(function_definition_list.children![1], programNode);
	}
}

/**
 * 收集 functionList 的变量表，结果返回到 functionNode 中
 */
export function collectFunctionVariable(variable_definition_list: SyntaxNode, functionNode: FunctionNode | BaseNode) {
	let variable_definition = variable_definition_list.children![0];
	let name = variable_definition.children![1].value;
	let type = getVariableTypeBySyntaxNode(variable_definition);
	functionNode.variableList.push({
		name,
		type,
	});
	// 递归查找
	if (variable_definition_list.children!.length === 2) {
		collectFunctionVariable(variable_definition_list.children![1], functionNode);
	}
}

/**
 * 收集 functionList 的形参，结果返回到 functionNode 中
 */
export function collectFunctionParameter(parameter_list: SyntaxNode, functionNode: FunctionNode) {
	let parameter_declaration = parameter_list.children![0];
	let name = parameter_declaration.children![1].value;
	let type = getVariableTypeBySyntaxNode(parameter_declaration);
	functionNode.parameterList.push({
		name,
		type,
	});
	// 递归查找
	if (parameter_list.children!.length === 2) {
		collectFunctionParameter(parameter_list.children![1], functionNode);
	}
}

/**
 * 将 TokenType 转换为文法中的终结符
 * 用于语法分析
 */
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
	private nodeCount: number = 0;				// 记录 syntaxTree 的节点数
	private programNode?: ProgramNode;

	constructor() {
		console.log('LR', LR);
		console.log('hash', hash);
		console.log('productions', productions);
	}

	public getSyntaxTree(): SyntaxNode | undefined {
		return this.syntaxTree;
	}

	public getProgramNode(): ProgramNode | undefined {
		return this.programNode;
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
	 * 传入词法单元序列，对全文进行语法分析，产出语法树
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
					symbol: input,
					token: tokenList[tokenIndex],
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
					let childNode = stackNode.pop()!;
					childNode.parent = node;				// 将每个子节点标记父亲
					node.children!.unshift(childNode);		// 将父亲标记每个子节点
					node.token = childNode.token;			// 将父亲的 token 指向儿子的 token
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
		let syntaxTree = this.syntaxTree;
		let programNode: ProgramNode = {
			functionList: [],
			variableList: [],		// 暂不支持全局变量
			syntaxNode: syntaxTree!,
		};

		// 1. 收集 functionList
		if (syntaxTree!.children && syntaxTree!.children[0].symbol === 'function_definition_list') {
			// 程序中必须有至少一个函数，否则语法分析这步就过不了，就不会来到这里
			let function_definition_list = syntaxTree!.children[0];
			collectFunctionList(function_definition_list, programNode);
		}

		for (const functionNode of programNode.functionList) {
			// 2. 收集函数内的变量表
			let compound_statement = functionNode.syntaxNode.children![2];
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
			// 3. 收集函数形参
			let function_declaration = functionNode.syntaxNode.children![1];
			if (function_declaration.children!.length === 4) {
				let parameter_list = function_declaration.children![2];
				collectFunctionParameter(parameter_list, functionNode);
			}
		}
		this.programNode = programNode;
		return programNode;
	}
}

// #region 手动输入语法区

const LRstr = `err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err 4 5 err err err err err err 6 err err err err err err 7 8 9 
err err err err err err err err err err err err err err err err err err r8 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err r7 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err r6 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r3 err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err 4 10 err err err err err err err err err err err err err err err 11 
err r1 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err acc err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 7 12 13 
err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err 4 14 err err err err err err err err err err err err err err err 11 
err err err err err err err err err err err err err err err err err err s15 err err err err err err err err err err err err err err err err err err err err err 16 err err err err err err err err err err err err err err err err err err 
err r4 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err s17 err err err err err err err err err err err err err err err err err err err err err 16 err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err r24 err err r24 err err r24 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err s18 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r2 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s19 err err err err err err s20 err err err err err err err err err err err err err err err s21 err err err err err 22 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s24 err err err err err err 23 err err err err err err err err err err err err err err err err err err err err err err err err 
err err s19 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s20 err err err err err err err err err err err err err err err s21 err err err err err 22 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s25 err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err err err err err err 26 27 err err err err err err err err err err 28 
err err err err err err err err err err err err err err err err err r25 err err r25 err err r25 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err s29 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s30 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r5 err err err err err err err err err err err err err err err r5 err err r5 err err r5 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err s1 s35 s36 s2 s37 s38 s3 s39 err err s61 s62 40 41 err err 42 43 44 err 45 46 47 err err err 48 49 50 err err 51 err 52 53 54 55 56 57 58 59 60 
err err err err err err err err err err err err err err err err err err err err err err err err err err err r13 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r15 err err s63 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s64 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err s65 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err s66 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err r26 err err r26 err err r26 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s68 err err s69 err err err err err err err 70 71 err err 72 err 73 err 74 err 75 err err err err err 76 err err 77 err 78 err err err 79 80 err err err 
err err r68 err err r68 err r68 err err err err err err err err err err r68 err err r68 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r69 err err r69 err r69 err err err err err err err err err err r69 err err r69 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r34 err err r34 err r34 err r34 err err err err err err err err r34 r34 err r34 r34 err r34 err err r34 r34 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r64 err s81 err r64 r64 r64 r64 r64 r64 r64 r64 r46 r64 r64 r64 err err err err err err err err err s82 err err err err err err 83 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s84 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r65 err err err r65 r65 r65 r65 r65 r65 r65 r65 err r65 r65 r65 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s85 err err err err err err err err s35 err err s37 err err err err err err err 40 41 err err 42 err 44 err 86 err 47 err err err err err 50 err err 51 err 52 err err err 56 57 err err err 
err err s87 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r51 err err err err err r51 err err r51 s88 s89 err r51 s90 s91 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err r45 err err r45 err err s92 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err s93 err err r41 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r29 err err r29 err r29 err r29 err err err err err err err err r29 r29 err r29 r29 err r29 err err r29 r29 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err r44 err err r44 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s94 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r30 err err r30 err r30 err r30 err err err err err err err err r30 r30 err r30 r30 err r30 err err r30 r30 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r66 err err err r66 r66 r66 r66 r66 r66 r66 r66 err r66 r66 r66 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r32 err err r32 err r32 err r32 err err err err err err err err r32 r32 err r32 r32 err r32 err err r32 r32 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r33 err err r33 err r33 err r33 err err err err err err err err r33 r33 err r33 r33 err r33 err err r33 r33 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r56 err err err err s95 r56 s96 err r56 r56 r56 err r56 r56 r56 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r62 err err err r62 r62 r62 r62 r62 r62 r62 r62 err r62 r62 r62 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
s97 err err err err err r48 err err r48 err err err s98 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r31 err err r31 err r31 err r31 err err err err err err err err r31 r31 err r31 r31 err r31 err err r31 r31 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s61 r27 40 41 err err 42 43 44 err 45 46 47 err err err 48 49 50 err err 51 err 52 53 54 99 56 57 err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err s100 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r59 err err err s101 r59 r59 r59 s102 r59 r59 r59 err r59 r59 r59 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s103 err err s37 err err err err err err err err err err err err err err err err err 47 err err err err err err err err 51 err err err err err 104 57 err err err 
err err r23 err err r23 err r23 err r23 err err err err err err err s1 r23 r23 s2 r23 r23 s3 r23 err err r23 r23 err err err err err err err err err err err err err err err err err err err err err err err err err err err 58 105 60 
err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s61 s107 40 41 err err 42 43 44 err 45 46 47 err err err 48 49 50 err err 51 err 52 53 54 106 56 57 err err err 
err err err err err err err err err err err err err err err err err err s108 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err s1 s35 s36 s2 s37 s38 s3 s39 err err s61 s111 40 41 err err 42 43 44 err 45 46 47 err err err 48 49 50 err err 51 err 52 53 54 109 56 57 58 110 60 
err r19 err err err err err err err err err err err err err err err r19 err err r19 err err r19 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err err err err err err 26 112 err err err err err err err err err err 28 
err err err err err err err err err err err err err err err err err err err err err err err err err err err r14 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r17 err err r17 err err err err err err err err err err err err err err err err err err s113 err err err err err 114 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err r10 err err err err err err err err err err err err err err err s21 err err err err err 115 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s68 err err s69 err err err err err err err 70 71 err err 72 err 73 err 116 err 75 err err err err err 76 err err 77 err 78 err err err 79 80 err err err 
r64 err s117 r64 r64 r64 r64 r64 r64 err r64 r64 r46 r64 r64 r64 err err err err err err err err err s118 err err err err err err 119 err err err err err err err err err err err err err err err err err err err err err err err err err err 
r65 err err r65 r65 r65 r65 r65 r65 err r65 r65 err r65 r65 r65 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r51 err err r51 err err r51 err err err s120 s121 err r51 s122 s123 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r45 err err r45 err err err err err s124 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r41 err err s125 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r44 err err r44 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s126 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r66 err err r66 r66 r66 r66 r66 r66 err r66 r66 err r66 r66 r66 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r56 err err r56 err s127 r56 s128 err err r56 r56 err r56 r56 r56 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r62 err err r62 r62 r62 r62 r62 r62 err r62 r62 err r62 r62 r62 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
s129 err err r48 err err r48 err err err err err err s130 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r59 err err r59 s131 r59 r59 r59 s132 err r59 r59 err r59 r59 r59 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s133 err err s69 err err err err err err err err err err err err err err err err err 75 err err err err err err err err 77 err err err err err 134 80 err err err 
err err s67 s135 err s32 err s33 err err err err err err err err err err s133 err err s69 err err err err err err err 70 err err err err err 136 137 err err 75 err err err err err 76 err err 77 err 78 err err err 79 80 err err err 
err err s138 err err s32 err s33 err err err err err err err err err err s139 err err s140 err err err err err err err 141 err err err err err 142 err err err 143 err err err err err 144 err err 145 err 146 err err err 147 148 err err err 
err err err err err err r47 err err r47 err err r47 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s68 err err s69 err err err err err err err 70 71 err err 72 err 73 err 149 err 75 err err err err err 76 err err 77 err 78 err err err 79 80 err err err 
err err r39 err err r39 err r39 err r39 err err err err err err err err r39 r39 err r39 r39 err r39 err err r39 r39 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s150 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s68 err err s69 err err err err err err err 70 71 err err 72 err 73 err 151 err 75 err err err err err 76 err err 77 err 78 err err err 79 80 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s103 err err s37 err err err err err err err 40 err err err err err err err err err 47 err err err err err 50 err err 51 err 152 err err err 56 57 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s103 err err s37 err err err err err err err 40 err err err err err err err err err 47 err err err err err 50 err err 51 err 153 err err err 56 57 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s103 err err s37 err err err err err err err 40 err err err err err err err err err 47 err err err err err 50 err err 51 err 154 err err err 56 57 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s103 err err s37 err err err err err err err 40 err err err err err err err err err 47 err err err err err 50 err err 51 err 155 err err err 56 57 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s35 err err s37 err err err err err err err 40 41 err err 156 err 44 err err err 47 err err err err err 50 err err 51 err 52 err err err 56 57 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s35 err err s37 err err err err err err err 40 41 err err 42 err 44 err 157 err 47 err err err err err 50 err err 51 err 52 err err err 56 57 err err err 
err err r35 err err r35 err r35 err r35 err err err err err err err err r35 r35 err r35 r35 err r35 err err r35 r35 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s103 err err s37 err err err err err err err 158 err err err err err err err err err 47 err err err err err 50 err err 51 err err err err err 56 57 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s103 err err s37 err err err err err err err 159 err err err err err err err err err 47 err err err err err 50 err err 51 err err err err err 56 57 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s103 err err s37 err err err err err err err 40 err err err err err 160 err err err 47 err err err err err 50 err err 51 err 52 err err err 56 57 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s103 err err s37 err err err err err err err 40 err err err err err 161 err err err 47 err err err err err 50 err err 51 err 52 err err err 56 57 err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err r28 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r21 err err err err err err err err err err err err err err err r21 err err r21 err err r21 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s103 err err s37 err err err err err err err err err err err err err err err err err 47 err err err err err 162 err err 51 err err err err err 56 57 err err err 
err err s31 err err s32 err s33 err err err err err err err err err err s103 err err s37 err err err err err err err err err err err err err err err err err 47 err err err err err 163 err err 51 err err err err err 56 57 err err err 
r64 err s81 err r64 r64 r64 r64 r64 r64 r64 r64 err r64 r64 r64 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r63 err err err r63 r63 r63 r63 r63 r63 r63 r63 err r63 r63 r63 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r24 err err r24 err r24 err r24 err err err err err err err err r24 r24 err r24 r24 err r24 err err r24 r24 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err s164 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r20 err err err err err err err err err err err err err err err r20 err err r20 err err r20 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s165 err err err err err err err err err err err err err err err s21 err err err err err 166 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err s167 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s61 s169 40 41 err err 42 43 44 err 45 46 47 err err err 48 49 50 err err 51 err 52 53 54 168 56 57 err err err 
err err r19 err err r19 err r19 err r19 err err err err err err err err r19 r19 err r19 r19 err r19 err err r19 r19 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r16 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err s170 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r18 err err r18 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err r9 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s171 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s67 s172 err s32 err s33 err err err err err err err err err err s133 err err s69 err err err err err err err 70 err err err err err 136 173 err err 75 err err err err err 76 err err 77 err 78 err err err 79 80 err err err 
err err s138 err err s32 err s33 err err err err err err err err err err s139 err err s140 err err err err err err err 141 err err err err err 174 err err err 143 err err err err err 144 err err 145 err 146 err err err 147 148 err err err 
err err err r47 err err r47 err err err err err r47 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s133 err err s69 err err err err err err err 70 err err err err err err err err err 75 err err err err err 76 err err 77 err 175 err err err 79 80 err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s133 err err s69 err err err err err err err 70 err err err err err err err err err 75 err err err err err 76 err err 77 err 176 err err err 79 80 err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s133 err err s69 err err err err err err err 70 err err err err err err err err err 75 err err err err err 76 err err 77 err 177 err err err 79 80 err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s133 err err s69 err err err err err err err 70 err err err err err err err err err 75 err err err err err 76 err err 77 err 178 err err err 79 80 err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s68 err err s69 err err err err err err err 70 71 err err 179 err 73 err err err 75 err err err err err 76 err err 77 err 78 err err err 79 80 err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s68 err err s69 err err err err err err err 70 71 err err 72 err 73 err 180 err 75 err err err err err 76 err err 77 err 78 err err err 79 80 err err err 
r67 err err err r67 r67 r67 r67 r67 r67 r67 r67 err r67 r67 r67 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s133 err err s69 err err err err err err err 181 err err err err err err err err err 75 err err err err err 76 err err 77 err err err err err 79 80 err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s133 err err s69 err err err err err err err 182 err err err err err err err err err 75 err err err err err 76 err err 77 err err err err err 79 80 err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s133 err err s69 err err err err err err err 70 err err err err err 183 err err err 75 err err err err err 76 err err 77 err 78 err err err 79 80 err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s133 err err s69 err err err err err err err 70 err err err err err 184 err err err 75 err err err err err 76 err err 77 err 78 err err err 79 80 err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s133 err err s69 err err err err err err err err err err err err err err err err err 75 err err err err err 185 err err 77 err err err err err 79 80 err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s133 err err s69 err err err err err err err err err err err err err err err err err 75 err err err err err 186 err err 77 err err err err err 79 80 err err err 
r64 err s117 r64 r64 r64 r64 r64 r64 err r64 r64 err r64 r64 r64 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r63 err err r63 r63 r63 r63 r63 r63 err r63 r63 err r63 r63 r63 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r70 err err err r70 r70 r70 r70 r70 r70 r70 r70 err r70 r70 r70 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r72 err err s187 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s188 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s68 err err s69 err err err err err err err 70 71 err err 72 err 73 err 189 err 75 err err err err err 76 err err 77 err 78 err err err 79 80 err err err 
r64 err s190 err r64 r64 err r64 r64 err r64 r64 err r64 r64 r64 err err err err err err err err err err r64 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r65 err err err r65 r65 err r65 r65 err r65 r65 err r65 r65 r65 err err err err err err err err err err r65 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r51 err err err err err err err err err s191 s192 err r51 s193 s194 err err err err err err err err err err r51 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err s195 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r66 err err err r66 r66 err r66 r66 err r66 r66 err r66 r66 r66 err err err err err err err err err err r66 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r56 err err err err s196 err s197 err err r56 r56 err r56 r56 r56 err err err err err err err err err err r56 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r62 err err err r62 r62 err r62 r62 err r62 r62 err r62 r62 r62 err err err err err err err err err err r62 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
s198 err err err err err err err err err err err err s199 err err err err err err err err err err err err r48 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r59 err err err s200 r59 err r59 s201 err r59 r59 err r59 r59 r59 err err err err err err err err err err r59 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s138 err err s32 err s33 err err err err err err err err err err s139 err err s140 err err err err err err err err err err err err err err err err err 143 err err err err err err err err 145 err err err err err 202 148 err err err 
err err err s203 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r40 err err r40 err r40 err r40 err err err err err err err err r40 r40 err r40 r40 err r40 err err r40 r40 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s204 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r52 err err err err err r52 err err r52 err err err r52 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r54 err err err err err r54 err err r54 err err err r54 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r53 err err err err err r53 err err r53 err err err r53 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r55 err err err err err r55 err err r55 err err err r55 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err r43 err err r43 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err r42 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r57 err err err err err r57 err err r57 r57 r57 err r57 r57 r57 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r58 err err err err err r58 err err r58 r58 r58 err r58 r58 r58 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err r50 err err r50 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err r49 err err r49 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r60 err err err err r60 r60 r60 err r60 r60 r60 err r60 r60 r60 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r61 err err err err r61 r61 r61 err r61 r61 r61 err r61 r61 r61 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r22 err err err err err err err err err err err err err err err r22 err err r22 err err r22 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r25 err err r25 err r25 err r25 err err err err err err err r25 r25 r25 r25 r25 r25 r25 r25 err err r25 r25 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s205 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r21 err err r21 err r21 err r21 err err err err err err err err r21 r21 err r21 r21 err r21 err err r21 r21 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err s206 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r20 err err r20 err r20 err r20 err err err err err err err err r20 r20 err r20 r20 err r20 err err r20 r20 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err s207 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r67 err err r67 r67 r67 r67 r67 r67 err r67 r67 err r67 r67 r67 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r70 err err r70 r70 r70 r70 r70 r70 err r70 r70 err r70 r70 r70 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s208 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err s209 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r52 err err r52 err err r52 err err err err err err r52 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r54 err err r54 err err r54 err err err err err err r54 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r53 err err r53 err err r53 err err err err err err r53 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r55 err err r55 err err r55 err err err err err err r55 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r43 err err r43 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r42 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r57 err err r57 err err r57 err err err r57 r57 err r57 r57 r57 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r58 err err r58 err err r58 err err err r58 r58 err r58 r58 r58 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r50 err err r50 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r49 err err r49 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r60 err err r60 err r60 r60 r60 err err r60 r60 err r60 r60 r60 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r61 err err r61 err r61 r61 r61 err err r61 r61 err r61 r61 r61 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s133 err err s69 err err err err err err err 70 err err err err err 136 210 err err 75 err err err err err 76 err err 77 err 78 err err err 79 80 err err err 
r71 err err err r71 r71 r71 r71 r71 r71 r71 r71 err r71 r71 r71 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s211 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s67 s212 err s32 err s33 err err err err err err err err err err s133 err err s69 err err err err err err err 70 err err err err err 136 213 err err 75 err err err err err 76 err err 77 err 78 err err err 79 80 err err err 
err err s138 err err s32 err s33 err err err err err err err err err err s139 err err s140 err err err err err err err 141 err err err err err err err err err 143 err err err err err 144 err err 145 err 214 err err err 147 148 err err err 
err err s138 err err s32 err s33 err err err err err err err err err err s139 err err s140 err err err err err err err 141 err err err err err err err err err 143 err err err err err 144 err err 145 err 215 err err err 147 148 err err err 
err err s138 err err s32 err s33 err err err err err err err err err err s139 err err s140 err err err err err err err 141 err err err err err err err err err 143 err err err err err 144 err err 145 err 216 err err err 147 148 err err err 
err err s138 err err s32 err s33 err err err err err err err err err err s139 err err s140 err err err err err err err 141 err err err err err err err err err 143 err err err err err 144 err err 145 err 217 err err err 147 148 err err err 
err err err err err err r12 err err r12 err err r12 err err err err err err err err err err err err s82 err err err err err err 218 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s138 err err s32 err s33 err err err err err err err err err err s139 err err s140 err err err err err err err 219 err err err err err err err err err 143 err err err err err 144 err err 145 err err err err err 147 148 err err err 
err err s138 err err s32 err s33 err err err err err err err err err err s139 err err s140 err err err err err err err 220 err err err err err err err err err 143 err err err err err 144 err err 145 err err err err err 147 148 err err err 
err err s138 err err s32 err s33 err err err err err err err err err err s139 err err s140 err err err err err err err 141 err err err err err 221 err err err 143 err err err err err 144 err err 145 err 146 err err err 147 148 err err err 
err err s138 err err s32 err s33 err err err err err err err err err err s139 err err s140 err err err err err err err 141 err err err err err 222 err err err 143 err err err err err 144 err err 145 err 146 err err err 147 148 err err err 
err err s138 err err s32 err s33 err err err err err err err err err err s139 err err s140 err err err err err err err err err err err err err err err err err 143 err err err err err 223 err err 145 err err err err err 147 148 err err err 
err err s138 err err s32 err s33 err err err err err err err err err err s139 err err s140 err err err err err err err err err err err err err err err err err 143 err err err err err 224 err err 145 err err err err err 147 148 err err err 
r63 err err err r63 r63 err r63 r63 err r63 r63 err r63 r63 r63 err err err err err err err err err err r63 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s225 err err err err err err err err s35 s226 err s37 s227 err s228 err err s236 err 40 41 err err 42 229 44 err 230 231 47 err err err 232 233 50 err err 51 err 52 234 235 err 56 57 err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s61 err 40 41 err err 42 43 44 err 45 46 47 err err err 48 49 50 err err 51 err 52 53 237 err 56 57 err err err 
err err r26 err err r26 err r26 err r26 err err err err err err err r26 r26 r26 r26 r26 r26 r26 r26 err err r26 r26 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r22 err err r22 err r22 err r22 err err err err err err err err r22 r22 err r22 r22 err r22 err err r22 r22 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r10 err err r10 err err err err err err err err err err err err err err err err err err s113 err err err err err 238 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r71 err err r71 r71 r71 r71 r71 r71 err r71 r71 err r71 r71 r71 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r12 err err r12 err err err err err r12 err err err err err err err err err err err err s118 err err err err err err 239 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r73 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r67 err err err r67 r67 err r67 r67 err r67 r67 err r67 r67 r67 err err err err err err err err err err r67 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r70 err err err r70 r70 err r70 r70 err r70 r70 err r70 r70 r70 err err err err err err err err err err r70 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s240 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r52 err err err err err err err err err err err err r52 err err err err err err err err err err err err r52 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r54 err err err err err err err err err err err err r54 err err err err err err err err err err err err r54 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r53 err err err err err err err err err err err err r53 err err err err err err err err err err err err r53 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r55 err err err err err err err err err err err err r55 err err err err err err err err err err err err r55 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err r11 err err r11 err err r11 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r57 err err err err err err err err err r57 r57 err r57 r57 r57 err err err err err err err err err err r57 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r58 err err err err err err err err err r58 r58 err r58 r58 r58 err err err err err err err err err err r58 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err r50 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err r49 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r60 err err err err r60 err r60 err err r60 r60 err r60 r60 r60 err err err err err err err err err err r60 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r61 err err err err r61 err r61 err err r61 r61 err r61 r61 r61 err err err err err err err err err err r61 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r34 err err r34 err r34 err r34 err err err err err err r34 err r34 r34 err r34 r34 err r34 err err r34 r34 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s241 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s242 err err err err err err err err s35 err err s37 err err err err err err err 40 41 err err 42 err 44 err 243 err 47 err err err err err 50 err err 51 err 52 err err err 56 57 err err err 
err err s244 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r29 err err r29 err r29 err r29 err err err err err err r29 err r29 r29 err r29 r29 err r29 err err r29 r29 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s245 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r30 err err r30 err r30 err r30 err err err err err err r30 err r30 r30 err r30 r30 err r30 err err r30 r30 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r32 err err r32 err r32 err r32 err err err err err err r32 err r32 r32 err r32 r32 err r32 err err r32 r32 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r33 err err r33 err r33 err r33 err err err err err err r33 err r33 r33 err r33 r33 err r33 err err r33 r33 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r31 err err r31 err r31 err r31 err err err err err err r31 err r31 r31 err r31 r31 err r31 err err r31 r31 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r36 err err r36 err r36 err r36 err err err err err err s246 err r36 r36 err r36 r36 err r36 err err r36 r36 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err s1 s35 s36 s2 s37 s38 s3 s39 err err s61 s249 40 41 err err 42 43 44 err 45 46 47 err err err 48 49 50 err err 51 err 52 53 54 247 56 57 58 248 60 
err err r38 err err r38 err r38 err r38 err err err err err err err err r38 r38 err r38 r38 err r38 err err r38 r38 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r9 err err r9 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r11 err err r11 err err err err err r11 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r71 err err err r71 r71 err r71 r71 err r71 r71 err r71 r71 r71 err err err err err err err err err err r71 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s68 err err s69 err err err err err err err 70 71 err err 72 err 73 err 250 err 75 err err err err err 76 err err 77 err 78 err err err 79 80 err err err 
err err r39 err err r39 err r39 err r39 err err err err err err r39 err r39 r39 err r39 r39 err r39 err err r39 r39 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err s251 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s67 err err s32 err s33 err err err err err err err err err err s68 err err s69 err err err err err err err 70 71 err err 72 err 73 err 252 err 75 err err err err err 76 err err 77 err 78 err err err 79 80 err err err 
err err r35 err err r35 err r35 err r35 err err err err err err r35 err r35 r35 err r35 r35 err r35 err err r35 r35 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s61 err 40 41 err err 42 43 44 err 45 46 47 err err err 48 49 50 err err 51 err 52 53 253 err 56 57 err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err s254 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s61 s256 40 41 err err 42 43 44 err 45 46 47 err err err 48 49 50 err err 51 err 52 53 54 255 56 57 err err err 
err err r19 err err r19 err r19 err r19 err err err err err err r19 err r19 r19 err r19 r19 err r19 err err r19 r19 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s257 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r40 err err r40 err r40 err r40 err err err err err err r40 err r40 r40 err r40 r40 err r40 err err r40 r40 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s258 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r37 err err r37 err r37 err r37 err err err err err err err err r37 r37 err r37 r37 err r37 err err r37 r37 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r21 err err r21 err r21 err r21 err err err err err err r21 err r21 r21 err r21 r21 err r21 err err r21 r21 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err s259 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r20 err err r20 err r20 err r20 err err err err err err r20 err r20 r20 err r20 r20 err r20 err err r20 r20 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s225 err err err err err err err err s35 s226 err s37 s227 err s228 err err s236 err 40 41 err err 42 229 44 err 230 231 47 err err err 232 233 50 err err 51 err 52 234 260 err 56 57 err err err 
err err s31 err err s32 err s33 err s225 err err err err err err err err s35 s226 err s37 s227 err s228 err err s236 err 40 41 err err 42 229 44 err 230 231 47 err err err 232 233 50 err err 51 err 52 234 261 err 56 57 err err err 
err err r22 err err r22 err r22 err r22 err err err err err err r22 err r22 r22 err r22 r22 err r22 err err r22 r22 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r36 err err r36 err r36 err r36 err err err err err err s262 err r36 r36 err r36 r36 err r36 err err r36 r36 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r38 err err r38 err r38 err r38 err err err err err err r38 err r38 r38 err r38 r38 err r38 err err r38 r38 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s31 err err s32 err s33 err s225 err err err err err err err err s35 s226 err s37 s227 err s228 err err s236 err 40 41 err err 42 229 44 err 230 231 47 err err err 232 233 50 err err 51 err 52 234 263 err 56 57 err err err 
err err r37 err err r37 err r37 err r37 err err err err err err r37 err r37 r37 err r37 r37 err r37 err err r37 r37 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
`;

const LRtitle = `!=                                   #                                   (                                   )                                   *                                   +                                   ,                                   -                                   /                                   ;                                   <                                  <=                                   =                                  ==                                   >                                  >=                                ELSE                               FLOAT                                  ID                                  IF                                 INT                                 NUM                              RETURN                                VOID                               WHILE                                   [                                   ]                                   {                                   }|                 additive_expression               addressing_expression                       array_closure            array_expression_closure               assignment_expression                  compound_statement                 equality_expression            equality_expression_list                          expression                expression_statement                       function_call                function_declaration                 function_definition            function_definition_list                 iteration_statement                      jump_statement           multiplicative_expression               parameter_declaration                      parameter_list                  primary_expression                             program               relational_expression                 selection_statement                           statement                      statement_list                    unary_expression                      unary_operator                 variable_definition            variable_definition_list                       variable_type`;

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
array_expression_closure -> [ equality_expression ] array_expression_closure
array_expression_closure -> [ equality_expression ]
function_declaration -> ID ( )
function_declaration -> ID ( parameter_list )
parameter_list -> parameter_declaration
parameter_list -> parameter_declaration , parameter_list
parameter_declaration -> variable_type ID
parameter_declaration -> variable_type ID array_closure
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
assignment_expression -> addressing_expression = assignment_expression
assignment_expression -> equality_expression
assignment_expression -> addressing_expression
addressing_expression -> ID
addressing_expression -> ID array_expression_closure
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
primary_expression -> function_call
primary_expression -> ( expression )
unary_operator -> +
unary_operator -> -
function_call -> ID ( )
function_call -> ID ( equality_expression_list )
equality_expression_list -> equality_expression
equality_expression_list -> equality_expression , equality_expression_list`;

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