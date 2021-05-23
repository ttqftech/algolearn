import { BaseNode, BasicType, FunctionNode, Production, ProgramNode, SyntaxNode, Token, TokenType, Variable, VariableType } from "../types/types";

const LR: Array<Array<string>> = [];
const hash: Map<string, number> = new Map();	// 将符号字符串映射到 LR 表中的列号
const productions: Array<Production> = [];		// 文法（产生式）列表

/**
 * 传入 addressing_expression 和 baseNode，找到 baseNode 中存储对应变量的位置
 */
export function findAddr(syntaxNode: SyntaxNode, baseNode: BaseNode): Variable | undefined {
	let id = syntaxNode.children![0];
	let varTableNode: BaseNode | undefined;
	varTableNode = baseNode;
	let variable = varTableNode.variableList.find((variable) => variable.name === id.value);
	while (varTableNode?.parentNode && !variable) {
		// 如果在这层的变量表找不到，而且可以向上，那么让变量表向上一层
		varTableNode = varTableNode.parentNode;
		variable = varTableNode.variableList.find((variable) => variable.name === id.value)
	}
	// 数组相关处理
	return variable;
}

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
		case TokenType.bit_logic_and:
			return '&&';
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
		case TokenType.bit_logic_or:
			return '||';
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

const LRstr = `err err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err 4 5 err err err err err err err err 6 err err err err err err 7 8 9 
err err err err err err err err err err err err err err err err err err err r8 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err r7 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err r6 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r3 err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err 4 10 err err err err err err err err err err err err err err err err err 11 
err r1 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err acc err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 7 12 13 
err err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err 4 14 err err err err err err err err err err err err err err err err err 11 
err err err err err err err err err err err err err err err err err err err s15 err err err err err err err err err err err err err err err err err err err err err 16 err err err err err err err err err err err err err err err err err err err err 
err r4 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err s17 err err err err err err err err err err err err err err err err err err err err err 16 err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err r24 err err r24 err err r24 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err s18 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r2 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s19 err err err err err err s20 err err err err err err err err err err err err err err err s21 err err err err err err 22 err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err s24 err err err err err err err 23 err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s19 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s20 err err err err err err err err err err err err err err err s21 err err err err err err 22 err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s25 err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err err err err err err err err 26 27 err err err err err err err err err err 28 
err err err err err err err err err err err err err err err err err err r25 err err r25 err err r25 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err s29 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s30 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r5 err err err err err err err err err err err err err err err err r5 err err r5 err err r5 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err s1 s35 s36 s2 s37 s38 s3 s39 err err s62 err s63 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 55 56 57 58 59 60 61 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err r13 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r15 err err s64 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s65 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err s66 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s67 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err r26 err err r26 err err r26 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s69 err err s70 err err err err err err err err 71 72 err err 73 err 74 75 err 76 err err err err err 77 err 78 err err 79 err 80 err err err 81 82 err err err 
err err err r71 err err r71 err r71 err err err err err err err err err err r71 err err r71 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r72 err err r72 err r72 err err err err err err err err err err r72 err err r72 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r34 err err r34 err r34 err r34 err err err err err err err err r34 r34 err r34 r34 err r34 err err r34 err r34 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r46 err r46 s83 err r46 r46 r46 r46 r46 r46 r46 r46 r46 r46 r46 r46 err err err err err err err err err s84 err err r46 err err err err 85 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s86 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r68 err r68 err err r68 r68 r68 r68 r68 r68 r68 r68 err r68 r68 r68 err err err err err err err err err err err err r68 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s87 err err err err err err err err s35 err err s37 err err err err err err err err 40 41 err err 42 err 44 88 err 47 err err err err err 50 err 51 err err 52 err 53 err err err 57 58 err err err 
err err err s89 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r54 err r54 err err err err r54 err err r54 s90 s91 err r54 s92 s93 err err err err err err err err err err err err r54 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r67 err r67 err err r67 r67 r67 r67 r67 r67 r67 r67 s94 r67 r67 r67 err err err err err err err err err err err err r67 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err s95 err err r41 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r29 err err r29 err r29 err r29 err err err err err err err err r29 r29 err r29 r29 err r29 err err r29 err r29 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s96 err err err err r48 err err r48 err err err err err err err err err err err err err err err err err err s97 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s98 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r30 err err r30 err r30 err r30 err err err err err err err err r30 r30 err r30 r30 err r30 err err r30 err r30 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r69 err r69 err err r69 r69 r69 r69 r69 r69 r69 r69 err r69 r69 r69 err err err err err err err err err err err err r69 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r32 err err r32 err r32 err r32 err err err err err err err err r32 r32 err r32 r32 err r32 err err r32 err r32 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r33 err err r33 err r33 err r33 err err err err err err err err r33 r33 err r33 r33 err r33 err err r33 err r33 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err r44 err err r44 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r59 err r59 err err err s99 r59 s100 err r59 r59 r59 err r59 r59 r59 err err err err err err err err err err err err r59 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r65 err r65 err err r65 r65 r65 r65 r65 r65 r65 r65 err r65 r65 r65 err err err err err err err err err err err err r65 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
s101 err r51 err err err err r51 err err r51 err err err s102 err err err err err err err err err err err err err err r51 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r31 err err r31 err r31 err r31 err err err err err err err err r31 r31 err r31 r31 err r31 err err r31 err r31 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s62 err r27 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 55 103 57 58 err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err s104 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r62 err r62 err err s105 r62 r62 r62 s106 r62 r62 r62 err r62 r62 r62 err err err err err err err err err err err err r62 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s107 err err s37 err err err err err err err err err 108 err err err err err err err 47 err err err err err err err err err err 52 err err err err err 109 58 err err err 
err err err r23 err err r23 err r23 err r23 err err err err err err err s1 r23 r23 s2 r23 r23 s3 r23 err err r23 err r23 err err err err err err err err err err err err err err err err err err err err err err err err err err err err 59 110 61 
err err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s62 err s112 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 55 111 57 58 err err err 
err err err err err err err err err err err err err err err err err err err s113 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err s1 s35 s36 s2 s37 s38 s3 s39 err err s62 err s116 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 55 114 57 58 59 115 61 
err r19 err err err err err err err err err err err err err err err err r19 err err r19 err err r19 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err err err err err err err err 26 117 err err err err err err err err err err 28 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err r14 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r17 err err r17 err err err err err err err err err err err err err err err err err err s118 err err err err err err 119 err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err r10 err err err err err err err err err err err err err err err s21 err err err err err err 120 err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s69 err err s70 err err err err err err err err 71 72 err err 73 err 74 121 err 76 err err err err err 77 err 78 err err 79 err 80 err err err 81 82 err err err 
r46 err r46 s122 r46 r46 r46 r46 r46 r46 err r46 r46 r46 r46 r46 r46 err err err err err err err err err s123 err err r46 err err err err 124 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r68 err r68 err r68 r68 r68 r68 r68 r68 err r68 r68 err r68 r68 r68 err err err err err err err err err err err err r68 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r54 err r54 err r54 err err r54 err err err s125 s126 err r54 s127 s128 err err err err err err err err err err err err r54 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r67 err r67 err r67 r67 r67 r67 r67 r67 err r67 r67 s129 r67 r67 r67 err err err err err err err err err err err err r67 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r41 err err s130 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s131 err r48 err err r48 err err err err err err err err err err err err err err err err err err err err err s132 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s133 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r69 err r69 err r69 r69 r69 r69 r69 r69 err r69 r69 err r69 r69 r69 err err err err err err err err err err err err r69 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r44 err err r44 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r59 err r59 err r59 err s134 r59 s135 err err r59 r59 err r59 r59 r59 err err err err err err err err err err err err r59 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r65 err r65 err r65 r65 r65 r65 r65 r65 err r65 r65 err r65 r65 r65 err err err err err err err err err err err err r65 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
s136 err r51 err r51 err err r51 err err err err err err s137 err err err err err err err err err err err err err err r51 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r62 err r62 err r62 s138 r62 r62 r62 s139 err r62 r62 err r62 r62 r62 err err err err err err err err err err err err r62 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err err 141 err err err err err err err 76 err err err err err err err err err err 79 err err err err err 142 82 err err err 
err err err s68 s143 err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err 71 141 err err err err 74 err err 76 err err err err err 144 145 78 err err 79 err 80 err err err 81 82 err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err 149 150 err err err err 151 err err 152 err err err err err err err 153 err err 154 err 155 err err err 156 157 err err err 
r47 err r47 err err r47 r47 r47 r47 r47 r47 r47 r47 r47 r47 r47 r47 err err err err err err err err err err err err r47 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s69 err err s70 err err err err err err err err 71 72 err err 73 err 74 158 err 76 err err err err err 77 err 78 err err 79 err 80 err err err 81 82 err err err 
err err err r39 err err r39 err r39 err r39 err err err err err err err err r39 r39 err r39 r39 err r39 err err r39 err r39 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s159 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s69 err err s70 err err err err err err err err 71 72 err err 73 err 74 160 err 76 err err err err err 77 err 78 err err 79 err 80 err err err 81 82 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s107 err err s37 err err err err err err err err 40 108 err err err err err err err 47 err err err err err err err 51 err err 52 err 161 err err err 57 58 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s107 err err s37 err err err err err err err err 40 108 err err err err err err err 47 err err err err err err err 51 err err 52 err 162 err err err 57 58 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s107 err err s37 err err err err err err err err 40 108 err err err err err err err 47 err err err err err err err 51 err err 52 err 163 err err err 57 58 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s107 err err s37 err err err err err err err err 40 108 err err err err err err err 47 err err err err err err err 51 err err 52 err 164 err err err 57 58 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s35 err err s37 err err err err err err err err 40 41 err err 165 err 44 err err 47 err err err err err 50 err 51 err err 52 err 53 err err err 57 58 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s35 err err s37 err err err err err err err err 40 41 err err 42 err 44 166 err 47 err err err err err 50 err 51 err err 52 err 53 err err err 57 58 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s107 err err s37 err err err err err err err err 40 108 err err err err 44 err err 47 err err err err err 167 err 51 err err 52 err 53 err err err 57 58 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s107 err err s37 err err err err err err err err 40 108 err err err err 44 err err 47 err err err err err 168 err 51 err err 52 err 53 err err err 57 58 err err err 
err err err r35 err err r35 err r35 err r35 err err err err err err err err r35 r35 err r35 r35 err r35 err err r35 err r35 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s107 err err s37 err err err err err err err err 169 108 err err err err err err err 47 err err err err err err err 51 err err 52 err err err err err 57 58 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s107 err err s37 err err err err err err err err 170 108 err err err err err err err 47 err err err err err err err 51 err err 52 err err err err err 57 58 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s107 err err s37 err err err err err err err err 40 108 err err err err 171 err err 47 err err err err err err err 51 err err 52 err 53 err err err 57 58 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s107 err err s37 err err err err err err err err 40 108 err err err err 172 err err 47 err err err err err err err 51 err err 52 err 53 err err err 57 58 err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err r28 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r21 err err err err err err err err err err err err err err err err r21 err err r21 err err r21 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s107 err err s37 err err err err err err err err err 108 err err err err err err err 47 err err err err err err err 173 err err 52 err err err err err 57 58 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s107 err err s37 err err err err err err err err err 108 err err err err err err err 47 err err err err err err err 174 err err 52 err err err err err 57 58 err err err 
r46 err r46 s83 err r46 r46 r46 r46 r46 r46 r46 r46 err r46 r46 r46 err err err err err err err err err s175 err err r46 err err err err 176 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r67 err r67 err err r67 r67 r67 r67 r67 r67 r67 r67 err r67 r67 r67 err err err err err err err err err err err err r67 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r66 err r66 err err r66 r66 r66 r66 r66 r66 r66 r66 err r66 r66 r66 err err err err err err err err err err err err r66 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r24 err err r24 err r24 err r24 err err err err err err err err r24 r24 err r24 r24 err r24 err err r24 err r24 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err s177 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r20 err err err err err err err err err err err err err err err err r20 err err r20 err err r20 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s178 err err err err err err err err err err err err err err err s21 err err err err err err 179 err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err s180 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s62 err s182 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 55 181 57 58 err err err 
err err err r19 err err r19 err r19 err r19 err err err err err err err err r19 r19 err r19 r19 err r19 err err r19 err r19 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r16 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err s183 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r18 err err r18 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err r9 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s184 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s68 s185 err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err 71 141 err err err err 74 err err 76 err err err err err 144 186 78 err err 79 err 80 err err err 81 82 err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err 149 150 err err err err 187 err err 152 err err err err err err err 153 err err 154 err 155 err err err 156 157 err err err 
r47 err r47 err r47 r47 r47 r47 r47 r47 err r47 r47 r47 r47 r47 r47 err err err err err err err err err err err err r47 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err 71 141 err err err err err err err 76 err err err err err err err 78 err err 79 err 188 err err err 81 82 err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err 71 141 err err err err err err err 76 err err err err err err err 78 err err 79 err 189 err err err 81 82 err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err 71 141 err err err err err err err 76 err err err err err err err 78 err err 79 err 190 err err err 81 82 err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err 71 141 err err err err err err err 76 err err err err err err err 78 err err 79 err 191 err err err 81 82 err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s69 err err s70 err err err err err err err err 71 72 err err 192 err 74 err err 76 err err err err err 77 err 78 err err 79 err 80 err err err 81 82 err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s69 err err s70 err err err err err err err err 71 72 err err 73 err 74 193 err 76 err err err err err 77 err 78 err err 79 err 80 err err err 81 82 err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err 71 141 err err err err 74 err err 76 err err err err err 194 err 78 err err 79 err 80 err err err 81 82 err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err 71 141 err err err err 74 err err 76 err err err err err 195 err 78 err err 79 err 80 err err err 81 82 err err err 
r70 err r70 err err r70 r70 r70 r70 r70 r70 r70 r70 err r70 r70 r70 err err err err err err err err err err err err r70 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err 196 141 err err err err err err err 76 err err err err err err err 78 err err 79 err err err err err 81 82 err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err 197 141 err err err err err err err 76 err err err err err err err 78 err err 79 err err err err err 81 82 err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err 71 141 err err err err 198 err err 76 err err err err err err err 78 err err 79 err 80 err err err 81 82 err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err 71 141 err err err err 199 err err 76 err err err err err err err 78 err err 79 err 80 err err err 81 82 err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err err 141 err err err err err err err 76 err err err err err err err 200 err err 79 err err err err err 81 82 err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err err 141 err err err err err err err 76 err err err err err err err 201 err err 79 err err err err err 81 82 err err err 
r46 err r46 s122 r46 r46 r46 r46 r46 r46 err r46 r46 err r46 r46 r46 err err err err err err err err err s202 err err r46 err err err err 203 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r67 err r67 err r67 r67 r67 r67 r67 r67 err r67 r67 err r67 r67 r67 err err err err err err err err err err err err r67 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r66 err r66 err r66 r66 r66 r66 r66 r66 err r66 r66 err r66 r66 r66 err err err err err err err err err err err err r66 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r73 err r73 err err r73 r73 r73 r73 r73 r73 r73 r73 err r73 r73 r73 err err err err err err err err err err err err r73 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r75 err err s204 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s205 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s69 err err s70 err err err err err err err err 71 72 err err 73 err 74 206 err 76 err err err err err 77 err 78 err err 79 err 80 err err err 81 82 err err err 
r46 err err s207 err r46 r46 err r46 r46 err r46 r46 err r46 r46 r46 err err err err err err err err err s208 r46 err err err err err err 209 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r68 err err err err r68 r68 err r68 r68 err r68 r68 err r68 r68 r68 err err err err err err err err err err r68 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r54 err err err err err err err err err err s210 s211 err r54 s212 s213 err err err err err err err err err err r54 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r67 err err err err r67 r67 err r67 r67 err r67 r67 err r67 r67 r67 err err err err err err err err err err r67 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s214 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r69 err err err err r69 r69 err r69 r69 err r69 r69 err r69 r69 r69 err err err err err err err err err err r69 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r59 err err err err err s215 err s216 err err r59 r59 err r59 r59 r59 err err err err err err err err err err r59 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r65 err err err err r65 r65 err r65 r65 err r65 r65 err r65 r65 r65 err err err err err err err err err err r65 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
s217 err err err err err err err err err err err err err s218 err err err err err err err err err err err err r51 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r62 err err err err s219 r62 err r62 s220 err r62 r62 err r62 r62 r62 err err err err err err err err err err r62 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err err 150 err err err err err err err 152 err err err err err err err err err err 154 err err err err err 221 157 err err err 
err err err err s222 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r40 err err r40 err r40 err r40 err err err err err err err err r40 r40 err r40 r40 err r40 err err r40 err r40 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s223 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r55 err r55 err err err err r55 err err r55 err err err r55 err err err err err err err err err err err err err err r55 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r57 err r57 err err err err r57 err err r57 err err err r57 err err err err err err err err err err err err err err r57 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r56 err r56 err err err err r56 err err r56 err err err r56 err err err err err err err err err err err err err err r56 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r58 err r58 err err err err r58 err err r58 err err err r58 err err err err err err err err err err err err err err r58 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err r43 err err r43 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err r42 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err r49 err err r49 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err r50 err err r50 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r60 err r60 err err err err r60 err err r60 r60 r60 err r60 r60 r60 err err err err err err err err err err err err r60 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r61 err r61 err err err err r61 err err r61 r61 r61 err r61 r61 r61 err err err err err err err err err err err err r61 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r53 err err err err r53 err err r53 err err err err err err err err err err err err err err err err err err r53 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r52 err err err err r52 err err r52 err err err err err err err err err err err err err err err err err err r52 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r63 err r63 err err err r63 r63 r63 err r63 r63 r63 err r63 r63 r63 err err err err err err err err err err err err r63 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r64 err r64 err err err r64 r64 r64 err r64 r64 r64 err r64 r64 r64 err err err err err err err err err err err err r64 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err 149 150 err err err err 224 err err 152 err err err err err err err 153 err err 154 err 155 err err err 156 157 err err err 
r47 err r47 err err r47 r47 r47 r47 r47 r47 r47 r47 err r47 r47 r47 err err err err err err err err err err err err r47 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r22 err err err err err err err err err err err err err err err err r22 err err r22 err err r22 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r25 err err r25 err r25 err r25 err err err err err err err r25 r25 r25 r25 r25 r25 r25 r25 err err r25 err r25 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s225 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r21 err err r21 err r21 err r21 err err err err err err err err r21 r21 err r21 r21 err r21 err err r21 err r21 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err s226 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r20 err err r20 err r20 err r20 err err err err err err err err r20 r20 err r20 r20 err r20 err err r20 err r20 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s227 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r70 err r70 err r70 r70 r70 r70 r70 r70 err r70 r70 err r70 r70 r70 err err err err err err err err err err err err r70 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r73 err r73 err r73 r73 r73 r73 r73 r73 err r73 r73 err r73 r73 r73 err err err err err err err err err err err err r73 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s228 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s229 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r55 err r55 err r55 err err r55 err err err err err err r55 err err err err err err err err err err err err err err r55 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r57 err r57 err r57 err err r57 err err err err err err r57 err err err err err err err err err err err err err err r57 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r56 err r56 err r56 err err r56 err err err err err err r56 err err err err err err err err err err err err err err r56 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r58 err r58 err r58 err err r58 err err err err err err r58 err err err err err err err err err err err err err err r58 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r43 err err r43 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r42 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r49 err err r49 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r50 err err r50 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r60 err r60 err r60 err err r60 err err err r60 r60 err r60 r60 r60 err err err err err err err err err err err err r60 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r61 err r61 err r61 err err r61 err err err r61 r61 err r61 r61 r61 err err err err err err err err err err err err r61 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r53 err r53 err err r53 err err err err err err err err err err err err err err err err err err err err err r53 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r52 err r52 err err r52 err err err err err err err err err err err err err err err err err err err err err r52 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r63 err r63 err r63 err r63 r63 r63 err err r63 r63 err r63 r63 r63 err err err err err err err err err err err err r63 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r64 err r64 err r64 err r64 r64 r64 err err r64 r64 err r64 r64 r64 err err err err err err err err err err err err r64 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err 149 150 err err err err 230 err err 152 err err err err err err err 153 err err 154 err 155 err err err 156 157 err err err 
r47 err r47 err r47 r47 r47 r47 r47 r47 err r47 r47 err r47 r47 r47 err err err err err err err err err err err err r47 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err 71 141 err err err err 74 err err 76 err err err err err 144 231 78 err err 79 err 80 err err err 81 82 err err err 
r74 err r74 err err r74 r74 r74 r74 r74 r74 r74 r74 err r74 r74 r74 err err err err err err err err err err err err r74 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s232 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s68 s233 err s32 err s33 err err err err err err err err err err s140 err err s70 err err err err err err err err 71 141 err err err err 74 err err 76 err err err err err 144 234 78 err err 79 err 80 err err err 81 82 err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err 149 150 err err err err 235 err err 152 err err err err err err err 153 err err 154 err 155 err err err 156 157 err err err 
r47 err err err err r47 r47 err r47 r47 err r47 r47 err r47 r47 r47 err err err err err err err err err err r47 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err 149 150 err err err err err err err 152 err err err err err err err 153 err err 154 err 236 err err err 156 157 err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err 149 150 err err err err err err err 152 err err err err err err err 153 err err 154 err 237 err err err 156 157 err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err 149 150 err err err err err err err 152 err err err err err err err 153 err err 154 err 238 err err err 156 157 err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err 149 150 err err err err err err err 152 err err err err err err err 153 err err 154 err 239 err err err 156 157 err err err 
r12 err r12 err err r12 r12 r12 r12 r12 r12 r12 r12 r12 r12 r12 r12 err err err err err err err err err s84 err err r12 err err err err 240 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err 241 150 err err err err err err err 152 err err err err err err err 153 err err 154 err err err err err 156 157 err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err 242 150 err err err err err err err 152 err err err err err err err 153 err err 154 err err err err err 156 157 err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err 149 150 err err err err 243 err err 152 err err err err err err err 153 err err 154 err 155 err err err 156 157 err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err 149 150 err err err err 244 err err 152 err err err err err err err 153 err err 154 err 155 err err err 156 157 err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err err 150 err err err err err err err 152 err err err err err err err 245 err err 154 err err err err err 156 157 err err err 
err err err s146 err err s32 err s33 err err err err err err err err err err s147 err err s148 err err err err err err err err err 150 err err err err err err err 152 err err err err err err err 246 err err 154 err err err err err 156 157 err err err 
r66 err err err err r66 r66 err r66 r66 err r66 r66 err r66 r66 r66 err err err err err err err err err err r66 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s247 err err err err err err err err s35 s248 err s37 s249 err s250 err err s258 err err 40 41 err err 42 251 44 252 253 47 err err err 254 255 50 err 51 err err 52 err 53 256 257 err 57 58 err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s62 err err 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 259 err 57 58 err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s260 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r26 err err r26 err r26 err r26 err err err err err err err r26 r26 r26 r26 r26 r26 r26 r26 err err r26 err r26 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r22 err err r22 err r22 err r22 err err err err err err err err r22 r22 err r22 r22 err r22 err err r22 err r22 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r10 err err r10 err err err err err err err err err err err err err err err err err err s118 err err err err err err 261 err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r74 err r74 err r74 r74 r74 r74 r74 r74 err r74 r74 err r74 r74 r74 err err err err err err err err err err err err r74 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r12 err r12 err r12 r12 r12 r12 r12 r12 err r12 r12 r12 r12 r12 r12 err err err err err err err err err s123 err err r12 err err err err 262 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s263 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r76 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r70 err err err err r70 r70 err r70 r70 err r70 r70 err r70 r70 r70 err err err err err err err err err err r70 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r73 err err err err r73 r73 err r73 r73 err r73 r73 err r73 r73 r73 err err err err err err err err err err r73 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s264 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s265 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r55 err err err err err err err err err err err err err r55 err err err err err err err err err err err err r55 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r57 err err err err err err err err err err err err err r57 err err err err err err err err err err err err r57 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r56 err err err err err err err err err err err err err r56 err err err err err err err err err err err err r56 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r58 err err err err err err err err err err err err err r58 err err err err err err err err err err err err r58 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r11 err r11 err err r11 r11 r11 r11 r11 r11 r11 r11 r11 r11 r11 r11 err err err err err err err err err err err err r11 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r60 err err err err err err err err err err r60 r60 err r60 r60 r60 err err err err err err err err err err r60 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r61 err err err err err err err err err err r61 r61 err r61 r61 r61 err err err err err err err err err err r61 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err r53 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err r52 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r63 err err err err err r63 err r63 err err r63 r63 err r63 r63 r63 err err err err err err err err err err r63 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r64 err err err err err r64 err r64 err err r64 r64 err r64 r64 r64 err err err err err err err err err err r64 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r34 err err r34 err r34 err r34 err err err err err err r34 err r34 r34 err r34 r34 err r34 err err r34 err r34 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s266 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s267 err err err err err err err err s35 err err s37 err err err err err err err err 40 41 err err 42 err 44 268 err 47 err err err err err 50 err 51 err err 52 err 53 err err err 57 58 err err err 
err err err s269 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r29 err err r29 err r29 err r29 err err err err err err r29 err r29 r29 err r29 r29 err r29 err err r29 err r29 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s270 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r30 err err r30 err r30 err r30 err err err err err err r30 err r30 r30 err r30 r30 err r30 err err r30 err r30 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r32 err err r32 err r32 err r32 err err err err err err r32 err r32 r32 err r32 r32 err r32 err err r32 err r32 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r33 err err r33 err r33 err r33 err err err err err err r33 err r33 r33 err r33 r33 err r33 err err r33 err r33 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r31 err err r31 err r31 err r31 err err err err err err r31 err r31 r31 err r31 r31 err r31 err err r31 err r31 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r36 err err r36 err r36 err r36 err err err err err err s271 err r36 r36 err r36 r36 err r36 err err r36 err r36 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err s1 s35 s36 s2 s37 s38 s3 s39 err err s62 err s274 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 55 272 57 58 59 273 61 
err err err r38 err err r38 err r38 err r38 err err err err err err err err r38 r38 err r38 r38 err r38 err err r38 err r38 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r12 err r12 err err r12 r12 r12 r12 r12 r12 r12 r12 err r12 r12 r12 err err err err err err err err err s175 err err r12 err err err err 275 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r9 err err r9 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r11 err r11 err r11 r11 r11 r11 r11 r11 err r11 r11 r11 r11 r11 r11 err err err err err err err err err err err err r11 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r12 err r12 err r12 r12 r12 r12 r12 r12 err r12 r12 err r12 r12 r12 err err err err err err err err err s202 err err r12 err err err err 276 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r74 err err err err r74 r74 err r74 r74 err r74 r74 err r74 r74 r74 err err err err err err err err err err r74 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r12 err err err err r12 r12 err r12 r12 err r12 r12 err r12 r12 r12 err err err err err err err err err s208 r12 err err err err err err 277 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s69 err err s70 err err err err err err err err 71 72 err err 73 err 74 278 err 76 err err err err err 77 err 78 err err 79 err 80 err err err 81 82 err err err 
err err err r39 err err r39 err r39 err r39 err err err err err err r39 err r39 r39 err r39 r39 err r39 err err r39 err r39 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s279 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s68 err err s32 err s33 err err err err err err err err err err s69 err err s70 err err err err err err err err 71 72 err err 73 err 74 280 err 76 err err err err err 77 err 78 err err 79 err 80 err err err 81 82 err err err 
err err err r35 err err r35 err r35 err r35 err err err err err err r35 err r35 r35 err r35 r35 err r35 err err r35 err r35 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s62 err err 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 281 err 57 58 err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err s282 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s62 err s284 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 55 283 57 58 err err err 
err err err r19 err err r19 err r19 err r19 err err err err err err r19 err r19 r19 err r19 r19 err r19 err err r19 err r19 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r11 err r11 err err r11 r11 r11 r11 r11 r11 r11 r11 err r11 r11 r11 err err err err err err err err err err err err r11 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r11 err r11 err r11 r11 r11 r11 r11 r11 err r11 r11 err r11 r11 r11 err err err err err err err err err err err err r11 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r11 err err err err r11 r11 err r11 r11 err r11 r11 err r11 r11 r11 err err err err err err err err err err r11 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s285 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r40 err err r40 err r40 err r40 err err err err err err r40 err r40 r40 err r40 r40 err r40 err err r40 err r40 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s286 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r37 err err r37 err r37 err r37 err err err err err err err err r37 r37 err r37 r37 err r37 err err r37 err r37 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r21 err err r21 err r21 err r21 err err err err err err r21 err r21 r21 err r21 r21 err r21 err err r21 err r21 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err s287 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r20 err err r20 err r20 err r20 err err err err err err r20 err r20 r20 err r20 r20 err r20 err err r20 err r20 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s247 err err err err err err err err s35 s248 err s37 s249 err s250 err err s258 err err 40 41 err err 42 251 44 252 253 47 err err err 254 255 50 err 51 err err 52 err 53 256 288 err 57 58 err err err 
err err err s31 err err s32 err s33 err s247 err err err err err err err err s35 s248 err s37 s249 err s250 err err s258 err err 40 41 err err 42 251 44 252 253 47 err err err 254 255 50 err 51 err err 52 err 53 256 289 err 57 58 err err err 
err err err r22 err err r22 err r22 err r22 err err err err err err r22 err r22 r22 err r22 r22 err r22 err err r22 err r22 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r36 err err r36 err r36 err r36 err err err err err err s290 err r36 r36 err r36 r36 err r36 err err r36 err r36 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r38 err err r38 err r38 err r38 err err err err err err r38 err r38 r38 err r38 r38 err r38 err err r38 err r38 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s247 err err err err err err err err s35 s248 err s37 s249 err s250 err err s258 err err 40 41 err err 42 251 44 252 253 47 err err err 254 255 50 err 51 err err 52 err 53 256 291 err 57 58 err err err 
err err err r37 err err r37 err r37 err r37 err err err err err err r37 err r37 r37 err r37 r37 err r37 err err r37 err r37 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
`;

const LRtitle = `!=                                   #                                  &&                                   (                                   )                                   *                                   +                                   ,                                   -                                   /                                   ;                                   <                                  <=                                   =                                  ==                                   >                                  >=                                ELSE                               FLOAT                                  ID                                  IF                                 INT                                 NUM                              RETURN                                VOID                               WHILE                                   [                                   ]                                   {                                  ||                                   }@                 additive_expression               addressing_expression                       array_closure            array_expression_closure               assignment_expression                  compound_statement                 equality_expression                          expression                expression_statement                       function_call                function_declaration                 function_definition            function_definition_list                 iteration_statement                      jump_statement                  logical_expression             logical_expression_list           multiplicative_expression               parameter_declaration                      parameter_list                  primary_expression                             program               relational_expression                 selection_statement                           statement                      statement_list                    unary_expression                      unary_operator                 variable_definition            variable_definition_list                       variable_type`;

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
assignment_expression -> logical_expression
assignment_expression -> addressing_expression
addressing_expression -> ID
addressing_expression -> ID array_expression_closure
logical_expression -> equality_expression
logical_expression -> equality_expression && logical_expression
logical_expression -> equality_expression || logical_expression
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
primary_expression -> addressing_expression
primary_expression -> NUM
primary_expression -> function_call
primary_expression -> ( expression )
unary_operator -> +
unary_operator -> -
function_call -> ID ( )
function_call -> ID ( logical_expression_list )
logical_expression_list -> logical_expression
logical_expression_list -> logical_expression , logical_expression_list`;

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
	LRtitle = LRtitle.replace(/@/g, '');
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