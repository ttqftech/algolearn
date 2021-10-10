import { BaseNode, BasicType, FunctionNode, Production, ProgramNode, SyntaxNode, Token, TokenType, Variable, VariableType } from "../types/types";

const LR: Array<Array<string>> = [];
const hash: Map<string, number> = new Map();	// 将符号字符串映射到 LR 表中的列号
const productions: Array<Production> = [];		// 文法（产生式）列表

/**
 * 传入 addressing_expression | assignment_expression（只要第 1 个儿子是 id）和 baseNode
 * 找到 baseNode 中存储对应变量的位置
 */
export function findAddr(syntaxNode: SyntaxNode, baseNode: BaseNode): Variable | undefined {
	let id = syntaxNode.children![0];
	let varTableNode: BaseNode | undefined;
	varTableNode = baseNode;
	let variable = varTableNode.variableList.find((variable) => variable.name === id.value);
	while (varTableNode?.parentNode && !variable) {
		// 如果在这层的变量表找不到，而且可以向上，那么让变量表向上一层
		varTableNode = varTableNode.parentNode;
		variable = varTableNode.variableList.find((variable) => variable.name === id.value);
	}
	return variable;
}

/**
 * C 语言变量类型转本工程变量类型 VariableType
 * variable_type -> VOID | INT | FLOAT
 * variable_definition -> variable_type ID ; | variable_type ID array_closure ;
 * parameter_declaration -> variable_type ID | variable_type ID array_closure
 * 
 * array_closure -> [ NUM ] array_closure
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
 * 依据变量类型新建变量
 */
export function createVariable(type: VariableType): any {
	if (type.basic === BasicType.integer || type.basic === BasicType.float) {
		if (type.length) {
			let total = type.length.reduce((prev, curr) => prev * curr);
			return new Array(total).fill(0);
		}
	} else {
		return undefined;
	}
}

/**
 * 在赋值或获取数组值时计算应该取数组的哪个数字
 * 中括号内的元素值（equality_expression.value）必须已经计算出来，否则请先在别处计算好
 * array_expression_closure -> [ equality_expression ] | [ equality_expression ] array_expression_closure
 */
function getArrayOffset(variableType: VariableType, arrayExpNode: SyntaxNode): number {
	// 获取数组每一维的地址权重
	let weights: Array<number> = [1];
	variableType.length!.reduceRight((prev, curr) => {
		weights.unshift(prev);
		return prev * curr;
	})
	// 计算
	let value = 0;
	let node = arrayExpNode;
	// 从 1 维开始计算
	while (arrayExpNode.children!.length === 4) {
		if (value >= weights.length - 1) {
			// 如果调用时的维数比声明还多，返回错误
			return NaN;
		}
		value += weights[value] * node.children![1].value;
		node = node.children![3];
		value++;
	}
	// 计算最后一维（如果只有 1 维，那么上面的 while 就不会执行）
	value += weights[value] * node.children![1].value;
	return value;
}

/**
 * 给出 baseNode，自动 findAddr 到对应变量，然后通过 addressing_expression 判断是要取数组的哪个值， 进而赋值
 * assignment_expression -> ID = assignment_expression | ID array_expression_closure = assignment_expression
 * array_expression_closure -> [ equality_expression ] | [ equality_expression ] array_expression_closure
 */
export function setVariable(baseNode: BaseNode, value: number, assNode: SyntaxNode, arrayExpNode?: SyntaxNode): boolean {
	let baseVarAddr = findAddr(assNode, baseNode);
	if (!baseVarAddr) {
		return false;	// 找不到变量
	}
	if (!baseVarAddr.type.length) {
		// 如果变量声明时就是 0 维，那么不管赋值时写几维（0 维才是合法的），直接给它赋值
		baseVarAddr.value = value;
	} else if (arrayExpNode) {
		// 变量声明是数组，赋值也是数组
		let offset = getArrayOffset(baseVarAddr.type, arrayExpNode);
		if (isNaN(offset)) {
			// 如果调用时的维数比声明还多，返回错误
			return false;
		}
		(baseVarAddr.value as Array<number>)[offset] = value;
	} else {
		// 变量声明是数组，赋值是单值，不合法，但是给它过，给 0 序号赋值
		(baseVarAddr.value as Array<number>)[0] = value;
	}
	return true;
}

/**
 * 给出 baseNode，自动 findAddr 到对应变量，然后通过 addressing_expression 判断是要取数组的哪个值
 * addressing_expression -> ID | ID array_expression_closure
 * array_expression_closure -> [ equality_expression ] | [ equality_expression ] array_expression_closure
 */
 export function getVariable(baseNode: BaseNode, addrExpNode: SyntaxNode): any {
	let baseVarAddr = findAddr(addrExpNode, baseNode);
	if (!baseVarAddr) {
		return undefined;	// 找不到变量
	}
	if (!baseVarAddr.type.length) {
		// 如果变量声明时就是 0 维，那么不管取值时写几维（0 维才是合法的），直接给它取值
		return baseVarAddr.value;
	} else if (addrExpNode.children!.length === 2) {
		// 变量声明是数组，赋值也是数组
		let offset = getArrayOffset(baseVarAddr.type, addrExpNode.children![1]);
		if (isNaN(offset)) {
			// 如果调用时的维数比声明还多，返回错误
			return undefined;
		}
		return (baseVarAddr.value as Array<number>)[offset];
	} else {
		// 变量声明是数组，赋值是单值，不合法，但是给它过，给 0 序号赋值
		return (baseVarAddr.value as Array<number>)[0];
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
	let value = createVariable(type);
	functionNode.variableList.push({
		name,
		type,
		value,
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
	let value = createVariable(type);
	functionNode.parameterList.push({
		name,
		type,
		value,
	});
	// 递归查找
	if (parameter_list.children!.length === 2) {
		collectFunctionParameter(parameter_list.children![1], functionNode);
	}
}

/**
 * 调用函数时，将实际参数应用到目标函数的形式参数
 */
export function applyFunctionParameter(objFuncNode: FunctionNode, logiExpList: SyntaxNode): void {
	let index = 0;
	while (logiExpList.children!.length === 3) {
		objFuncNode.parameterList[index].value = logiExpList.children![1].value;
		index++;
	}
	objFuncNode.parameterList[index].value = logiExpList.children![0].value;
}

/**
 * 调用内置函数时，将实际参数转换成列表
 */
 export function attractFunctionParameter(logiExpList: SyntaxNode): Array<any> {
	let ret: Array<any> = [];
	while (logiExpList.children!.length === 3) {
		ret.push(logiExpList.children![1].value);
	}
	ret.push(logiExpList.children![0].value);
	return ret;
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
		// console.log('LR', LR);
		// console.log('hash', hash);
		// console.log('productions', productions);
		(window as any).grammar = this;
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

const LRstr = `err err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err 4 5 err err err err err err err err 6 err err err err err 7 8 9 
err err err err err err err err err err err err err err err err err err err r8 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err r7 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err r6 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r3 err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err 4 10 err err err err err err err err err err err err err err err err 11 
err r1 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err acc err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 7 12 13 
err err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err 4 14 err err err err err err err err err err err err err err err err 11 
err err err err err err err err err err err err err err err err err err err s15 err err err err err err err err err err err err err err err err err err err err err 16 err err err err err err err err err err err err err err err err err err err 
err r4 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err s17 err err err err err err err err err err err err err err err err err err err err err 16 err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err r24 err err r24 err err r24 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err s18 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r2 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s19 err err err err err err s20 err err err err err err err err err err err err err err err s21 err err err err err err 22 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err s24 err err err err err err err 23 err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s19 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s20 err err err err err err err err err err err err err err err s21 err err err err err err 22 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s25 err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err err err err err err err err 26 27 err err err err err err err err err 28 
err err err err err err err err err err err err err err err err err err r25 err err r25 err err r25 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err s29 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s30 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r5 err err err err err err err err err err err err err err err err r5 err err r5 err err r5 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err s1 s35 s36 s2 s37 s38 s3 s39 err err s61 err s62 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 55 56 57 58 59 60 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err r13 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r15 err err s63 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s64 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err s65 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s66 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err r26 err err r26 err err r26 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s70 err err s71 err err err err err err err err 72 73 err err 74 err 75 76 err 77 err err err err err 78 err 79 err err 80 err 81 err err err 82 err err err 
err err err s31 err err err err err err err err err err err err err err err s83 err err s37 err err err err err err err err err 41 err err err err err err err 47 err err err err err err err err err err 84 err err err err err err err err err 
err err err s31 err err err err err err err err err err err err err err err s83 err err s37 err err err err err err err err err 41 err err err err err err err 47 err err err err err err err err err err 85 err err err err err err err err err 
err err err r34 err err r34 err r34 err r34 err err err err err err err err r34 r34 err r34 r34 err r34 err err r34 err r34 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r70 err r70 s86 err r70 r70 r70 r70 r70 r70 r70 r70 s87 r70 r70 r70 err err err err err err err err err s88 err err r70 err err err err 89 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s90 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r67 err r67 err err r67 r67 r67 r67 r67 r67 r67 r67 err r67 r67 r67 err err err err err err err err err err err err r67 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s91 err err err err err err err err s35 err err s37 err err err err err err err err 40 41 err err 42 err 44 92 err 47 err err err err err 50 err 51 err err 52 err 53 err err err 57 err err err 
err err err s93 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r52 err r52 err err err err r52 err err r52 s94 s95 err r52 s96 s97 err err err err err err err err err err err err r52 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r66 err r66 err err r66 r66 r66 r66 r66 r66 r66 r66 err r66 r66 r66 err err err err err err err err err err err err r66 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err s98 err err r41 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r29 err err r29 err r29 err r29 err err err err err err err err r29 r29 err r29 r29 err r29 err err r29 err r29 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s99 err err err err r46 err err r46 err err err err err err err err err err err err err err err err err err s100 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s101 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r30 err err r30 err r30 err r30 err err err err err err err err r30 r30 err r30 r30 err r30 err err r30 err r30 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r68 err r68 err err r68 r68 r68 r68 r68 r68 r68 r68 err r68 r68 r68 err err err err err err err err err err err err r68 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r32 err err r32 err r32 err r32 err err err err err err err err r32 r32 err r32 r32 err r32 err err r32 err r32 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r33 err err r33 err r33 err r33 err err err err err err err err r33 r33 err r33 r33 err r33 err err r33 err r33 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err r45 err err r45 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r57 err r57 err err err s102 r57 s103 err r57 r57 r57 err r57 r57 r57 err err err err err err err err err err err err r57 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r63 err r63 err err r63 r63 r63 r63 r63 r63 r63 r63 err r63 r63 r63 err err err err err err err err err err err err r63 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
s104 err r49 err err err err r49 err err r49 err err err s105 err err err err err err err err err err err err err err r49 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r31 err err r31 err r31 err r31 err err err err err err err err r31 r31 err r31 r31 err r31 err err r31 err r31 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s61 err r27 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 55 106 57 err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err s107 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r60 err r60 err err s108 r60 r60 r60 s109 r60 r60 r60 err r60 r60 r60 err err err err err err err err err err err err r60 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r23 err err r23 err r23 err r23 err err err err err err err s1 r23 r23 s2 r23 r23 s3 r23 err err r23 err r23 err err err err err err err err err err err err err err err err err err err err err err err err err err err 58 110 60 
err err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s61 err s112 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 55 111 57 err err err 
err err err err err err err err err err err err err err err err err err err s113 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err s1 s35 s36 s2 s37 s38 s3 s39 err err s61 err s116 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 55 114 57 58 115 60 
err r19 err err err err err err err err err err err err err err err err r19 err err r19 err err r19 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err s1 err err s2 err err s3 err err err err err err err err err err err err err err err err err err err err err err err err 26 117 err err err err err err err err err 28 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err r14 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r17 err err r17 err err err err err err err err err err err err err err err err err err s118 err err err err err err 119 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err r10 err err err err err err err err err err err err err err err s21 err err err err err err 120 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s70 err err s71 err err err err err err err err 72 73 err err 74 err 75 121 err 77 err err err err err 78 err 79 err err 80 err 81 err err err 82 err err err 
err err err s67 err err err err err err err err err err err err err err err s122 err err s71 err err err err err err err err err 73 err err err err err err err 77 err err err err err err err err err err 123 err err err err err err err err err 
err err err s67 err err err err err err err err err err err err err err err s122 err err s71 err err err err err err err err err 73 err err err err err err err 77 err err err err err err err err err err 124 err err err err err err err err err 
r70 err r70 s125 r70 r70 r70 r70 r70 r70 err r70 r70 s126 r70 r70 r70 err err err err err err err err err s127 err err r70 err err err err 128 err err err err err err err err err err err err err err err err err err err err err err err err err err 
r67 err r67 err r67 r67 r67 r67 r67 r67 err r67 r67 err r67 r67 r67 err err err err err err err err err err err err r67 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r52 err r52 err r52 err err r52 err err err s129 s130 err r52 s131 s132 err err err err err err err err err err err err r52 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r66 err r66 err r66 r66 r66 r66 r66 r66 err r66 r66 err r66 r66 r66 err err err err err err err err err err err err r66 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r41 err err s133 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err s134 err r46 err err r46 err err err err err err err err err err err err err err err err err err err err err s135 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s136 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r68 err r68 err r68 r68 r68 r68 r68 r68 err r68 r68 err r68 r68 r68 err err err err err err err err err err err err r68 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r45 err err r45 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r57 err r57 err r57 err s137 r57 s138 err err r57 r57 err r57 r57 r57 err err err err err err err err err err err err r57 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r63 err r63 err r63 r63 r63 r63 r63 r63 err r63 r63 err r63 r63 r63 err err err err err err err err err err err err r63 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
s139 err r49 err r49 err err r49 err err err err err err s140 err err err err err err err err err err err err err err r49 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r60 err r60 err r60 s141 r60 r60 r60 s142 err r60 r60 err r60 r60 r60 err err err err err err err err err err err err r60 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r70 err r70 s86 err r70 r70 r70 r70 r70 r70 r70 r70 err r70 r70 r70 err err err err err err err err err s143 err err r70 err err err err 144 err err err err err err err err err err err err err err err err err err err err err err err err err err 
r64 err r64 err err r64 r64 r64 r64 r64 r64 r64 r64 err r64 r64 r64 err err err err err err err err err err err err r64 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r65 err r65 err err r65 r65 r65 r65 r65 r65 r65 r65 err r65 r65 r65 err err err err err err err err err err err err r65 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s67 s145 err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err 72 73 err err err err 75 err err 77 err err err err err 146 147 79 err err 80 err 81 err err err 82 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s35 err err s37 err err err err err err err err 40 41 err err 148 err 44 err err 47 err err err err err 50 err 51 err err 52 err 53 err err err 57 err err err 
err err err s149 err err s150 err s151 err err err err err err err err err err s152 err err s153 err err err err err err err err 154 155 err err err err 156 err err 157 err err err err err err err 158 err err 159 err 160 err err err 161 err err err 
r71 err r71 err err r71 r71 r71 r71 r71 r71 r71 r71 s162 r71 r71 r71 err err err err err err err err err err err err r71 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s70 err err s71 err err err err err err err err 72 73 err err 74 err 75 163 err 77 err err err err err 78 err 79 err err 80 err 81 err err err 82 err err err 
err err err r39 err err r39 err r39 err r39 err err err err err err err err r39 r39 err r39 r39 err r39 err err r39 err r39 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s164 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s70 err err s71 err err err err err err err err 72 73 err err 74 err 75 165 err 77 err err err err err 78 err 79 err err 80 err 81 err err err 82 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s83 err err s37 err err err err err err err err 40 41 err err err err err err err 47 err err err err err err err 51 err err 52 err 166 err err err 57 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s83 err err s37 err err err err err err err err 40 41 err err err err err err err 47 err err err err err err err 51 err err 52 err 167 err err err 57 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s83 err err s37 err err err err err err err err 40 41 err err err err err err err 47 err err err err err err err 51 err err 52 err 168 err err err 57 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s83 err err s37 err err err err err err err err 40 41 err err err err err err err 47 err err err err err err err 51 err err 52 err 169 err err err 57 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s35 err err s37 err err err err err err err err 40 41 err err 42 err 44 170 err 47 err err err err err 50 err 51 err err 52 err 53 err err err 57 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s83 err err s37 err err err err err err err err 40 41 err err err err 44 err err 47 err err err err err 171 err 51 err err 52 err 53 err err err 57 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s83 err err s37 err err err err err err err err 40 41 err err err err 44 err err 47 err err err err err 172 err 51 err err 52 err 53 err err err 57 err err err 
err err err r35 err err r35 err r35 err r35 err err err err err err err err r35 r35 err r35 r35 err r35 err err r35 err r35 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s83 err err s37 err err err err err err err err 173 41 err err err err err err err 47 err err err err err err err 51 err err 52 err err err err err 57 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s83 err err s37 err err err err err err err err 174 41 err err err err err err err 47 err err err err err err err 51 err err 52 err err err err err 57 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s83 err err s37 err err err err err err err err 40 41 err err err err 175 err err 47 err err err err err err err 51 err err 52 err 53 err err err 57 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s83 err err s37 err err err err err err err err 40 41 err err err err 176 err err 47 err err err err err err err 51 err err 52 err 53 err err err 57 err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err r28 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r21 err err err err err err err err err err err err err err err err r21 err err r21 err err r21 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s83 err err s37 err err err err err err err err err 41 err err err err err err err 47 err err err err err err err 177 err err 52 err err err err err 57 err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s83 err err s37 err err err err err err err err err 41 err err err err err err err 47 err err err err err err err 178 err err 52 err err err err err 57 err err err 
err err err r24 err err r24 err r24 err r24 err err err err err err err err r24 r24 err r24 r24 err r24 err err r24 err r24 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err s179 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r20 err err err err err err err err err err err err err err err err r20 err err r20 err err r20 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s180 err err err err err err err err err err err err err err err s21 err err err err err err 181 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err s182 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s61 err s184 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 55 183 57 err err err 
err err err r19 err err r19 err r19 err r19 err err err err err err err err r19 r19 err r19 r19 err r19 err err r19 err r19 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r16 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err s185 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r18 err err r18 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err r9 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s186 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r70 err r70 s125 r70 r70 r70 r70 r70 r70 err r70 r70 err r70 r70 r70 err err err err err err err err err s187 err err r70 err err err err 188 err err err err err err err err err err err err err err err err err err err err err err err err err err 
r64 err r64 err r64 r64 r64 r64 r64 r64 err r64 r64 err r64 r64 r64 err err err err err err err err err err err err r64 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r65 err r65 err r65 r65 r65 r65 r65 r65 err r65 r65 err r65 r65 r65 err err err err err err err err err err err err r65 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s67 s189 err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err 72 73 err err err err 75 err err 77 err err err err err 146 190 79 err err 80 err 81 err err err 82 err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s70 err err s71 err err err err err err err err 72 73 err err 191 err 75 err err 77 err err err err err 78 err 79 err err 80 err 81 err err err 82 err err err 
err err err s149 err err s150 err s151 err err err err err err err err err err s152 err err s153 err err err err err err err err 154 155 err err err err 192 err err 157 err err err err err err err 158 err err 159 err 160 err err err 161 err err err 
r71 err r71 err r71 r71 r71 r71 r71 r71 err r71 r71 s193 r71 r71 r71 err err err err err err err err err err err err r71 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err 72 73 err err err err err err err 77 err err err err err err err 79 err err 80 err 194 err err err 82 err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err 72 73 err err err err err err err 77 err err err err err err err 79 err err 80 err 195 err err err 82 err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err 72 73 err err err err err err err 77 err err err err err err err 79 err err 80 err 196 err err err 82 err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err 72 73 err err err err err err err 77 err err err err err err err 79 err err 80 err 197 err err err 82 err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s70 err err s71 err err err err err err err err 72 73 err err 74 err 75 198 err 77 err err err err err 78 err 79 err err 80 err 81 err err err 82 err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err 72 73 err err err err 75 err err 77 err err err err err 199 err 79 err err 80 err 81 err err err 82 err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err 72 73 err err err err 75 err err 77 err err err err err 200 err 79 err err 80 err 81 err err err 82 err err err 
r69 err r69 err err r69 r69 r69 r69 r69 r69 r69 r69 err r69 r69 r69 err err err err err err err err err err err err r69 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err 201 73 err err err err err err err 77 err err err err err err err 79 err err 80 err err err err err 82 err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err 202 73 err err err err err err err 77 err err err err err err err 79 err err 80 err err err err err 82 err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err 72 73 err err err err 203 err err 77 err err err err err err err 79 err err 80 err 81 err err err 82 err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err 72 73 err err err err 204 err err 77 err err err err err err err 79 err err 80 err 81 err err err 82 err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err err 73 err err err err err err err 77 err err err err err err err 205 err err 80 err err err err err 82 err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err err 73 err err err err err err err 77 err err err err err err err 206 err err 80 err err err err err 82 err err err 
err err err s149 err err s150 err s151 err err err err err err err err err err s152 err err s153 err err err err err err err err 154 155 err err err err 207 err err 157 err err err err err err err 158 err err 159 err 160 err err err 161 err err err 
r71 err r71 err err r71 r71 r71 r71 r71 r71 r71 r71 err r71 r71 r71 err err err err err err err err err err err err r71 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r72 err r72 err err r72 r72 r72 r72 r72 r72 r72 r72 err r72 r72 r72 err err err err err err err err err err err err r72 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r74 err err s208 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s209 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err r43 err err r43 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s70 err err s71 err err err err err err err err 72 73 err err 74 err 75 210 err 77 err err err err err 78 err 79 err err 80 err 81 err err err 82 err err err 
err err err s149 err err err err err err err err err err err err err err err s152 err err s153 err err err err err err err err err 155 err err err err err err err 157 err err err err err err err err err err 211 err err err err err err err err err 
err err err s149 err err err err err err err err err err err err err err err s152 err err s153 err err err err err err err err err 155 err err err err err err err 157 err err err err err err err err err err 212 err err err err err err err err err 
r70 err err s213 err r70 r70 err r70 r70 err r70 r70 err r70 r70 r70 err err err err err err err err err s214 r70 err err err err err err 215 err err err err err err err err err err err err err err err err err err err err err err err err err err 
r67 err err err err r67 r67 err r67 r67 err r67 r67 err r67 r67 r67 err err err err err err err err err err r67 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r52 err err err err err err err err err err s216 s217 err r52 s218 s219 err err err err err err err err err err r52 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r66 err err err err r66 r66 err r66 r66 err r66 r66 err r66 r66 r66 err err err err err err err err err err r66 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s220 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r68 err err err err r68 r68 err r68 r68 err r68 r68 err r68 r68 r68 err err err err err err err err err err r68 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r57 err err err err err s221 err s222 err err r57 r57 err r57 r57 r57 err err err err err err err err err err r57 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r63 err err err err r63 r63 err r63 r63 err r63 r63 err r63 r63 r63 err err err err err err err err err err r63 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
s223 err err err err err err err err err err err err err s224 err err err err err err err err err err err err r49 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r60 err err err err s225 r60 err r60 s226 err r60 r60 err r60 r60 r60 err err err err err err err err err err r60 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err err err err err err err err err err s35 err err s37 err err err err err err err err 40 41 err err 227 err 44 err err 47 err err err err err 50 err 51 err err 52 err 53 err err err 57 err err err 
err err err err s228 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r40 err err r40 err r40 err r40 err err err err err err err err r40 r40 err r40 r40 err r40 err err r40 err r40 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s229 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r53 err r53 err err err err r53 err err r53 err err err r53 err err err err err err err err err err err err err err r53 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r55 err r55 err err err err r55 err err r55 err err err r55 err err err err err err err err err err err err err err r55 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r54 err r54 err err err err r54 err err r54 err err err r54 err err err err err err err err err err err err err err r54 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r56 err r56 err err err err r56 err err r56 err err err r56 err err err err err err err err err err err err err err r56 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err r42 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err r47 err err r47 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err r48 err err r48 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r58 err r58 err err err err r58 err err r58 r58 r58 err r58 r58 r58 err err err err err err err err err err err err r58 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r59 err r59 err err err err r59 err err r59 r59 r59 err r59 r59 r59 err err err err err err err err err err err err r59 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r51 err err err err r51 err err r51 err err err err err err err err err err err err err err err err err err r51 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r50 err err err err r50 err err r50 err err err err err err err err err err err err err err err err err err r50 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r61 err r61 err err err r61 r61 r61 err r61 r61 r61 err r61 r61 r61 err err err err err err err err err err err err r61 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r62 err r62 err err err r62 r62 r62 err r62 r62 r62 err r62 r62 r62 err err err err err err err err err err err err r62 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err r22 err err err err err err err err err err err err err err err err r22 err err r22 err err r22 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r25 err err r25 err r25 err r25 err err err err err err err r25 r25 r25 r25 r25 r25 r25 r25 err err r25 err r25 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s230 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r21 err err r21 err r21 err r21 err err err err err err err err r21 r21 err r21 r21 err r21 err err r21 err r21 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err s231 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r20 err err r20 err r20 err r20 err err err err err err err err r20 r20 err r20 r20 err r20 err err r20 err r20 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s232 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r69 err r69 err r69 r69 r69 r69 r69 r69 err r69 r69 err r69 r69 r69 err err err err err err err err err err err err r69 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s149 err err s150 err s151 err err err err err err err err err err s152 err err s153 err err err err err err err err 154 155 err err err err 233 err err 157 err err err err err err err 158 err err 159 err 160 err err err 161 err err err 
r71 err r71 err r71 r71 r71 r71 r71 r71 err r71 r71 err r71 r71 r71 err err err err err err err err err err err err r71 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r72 err r72 err r72 r72 r72 r72 r72 r72 err r72 r72 err r72 r72 r72 err err err err err err err err err err err err r72 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s234 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r43 err err r43 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s235 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s70 err err s71 err err err err err err err err 72 73 err err 236 err 75 err err 77 err err err err err 78 err 79 err err 80 err 81 err err err 82 err err err 
r53 err r53 err r53 err err r53 err err err err err err r53 err err err err err err err err err err err err err err r53 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r55 err r55 err r55 err err r55 err err err err err err r55 err err err err err err err err err err err err err err r55 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r54 err r54 err r54 err err r54 err err err err err err r54 err err err err err err err err err err err err err err r54 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r56 err r56 err r56 err err r56 err err err err err err r56 err err err err err err err err err err err err err err r56 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r42 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r47 err err r47 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r48 err err r48 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r58 err r58 err r58 err err r58 err err err r58 r58 err r58 r58 r58 err err err err err err err err err err err err r58 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r59 err r59 err r59 err err r59 err err err r59 r59 err r59 r59 r59 err err err err err err err err err err err err r59 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r51 err r51 err err r51 err err err err err err err err err err err err err err err err err err err err err r51 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err r50 err r50 err err r50 err err err err err err err err err err err err err err err err err err err err err r50 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r61 err r61 err r61 err r61 r61 r61 err err r61 r61 err r61 r61 r61 err err err err err err err err err err err err r61 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r62 err r62 err r62 err r62 r62 r62 err err r62 r62 err r62 r62 r62 err err err err err err err err err err err err r62 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s237 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err 72 73 err err err err 75 err err 77 err err err err err 146 238 79 err err 80 err 81 err err err 82 err err err 
r73 err r73 err err r73 r73 r73 r73 r73 r73 r73 r73 err r73 r73 r73 err err err err err err err err err err err err r73 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s239 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r64 err err err err r64 r64 err r64 r64 err r64 r64 err r64 r64 r64 err err err err err err err err err err r64 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r65 err err err err r65 r65 err r65 r65 err r65 r65 err r65 r65 r65 err err err err err err err err err err r65 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s67 s240 err s68 err s69 err err err err err err err err err err s122 err err s71 err err err err err err err err 72 73 err err err err 75 err err 77 err err err err err 146 241 79 err err 80 err 81 err err err 82 err err err 
err err err s149 err err s150 err s151 err err err err err err err err err err s152 err err s153 err err err err err err err err 154 155 err err err err 242 err err 157 err err err err err err err 158 err err 159 err 160 err err err 161 err err err 
r71 err err err err r71 r71 err r71 r71 err r71 r71 err r71 r71 r71 err err err err err err err err err err r71 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s149 err err s150 err s151 err err err err err err err err err err s152 err err s153 err err err err err err err err 154 155 err err err err err err err 157 err err err err err err err 158 err err 159 err 243 err err err 161 err err err 
err err err s149 err err s150 err s151 err err err err err err err err err err s152 err err s153 err err err err err err err err 154 155 err err err err err err err 157 err err err err err err err 158 err err 159 err 244 err err err 161 err err err 
err err err s149 err err s150 err s151 err err err err err err err err err err s152 err err s153 err err err err err err err err 154 155 err err err err err err err 157 err err err err err err err 158 err err 159 err 245 err err err 161 err err err 
err err err s149 err err s150 err s151 err err err err err err err err err err s152 err err s153 err err err err err err err err 154 155 err err err err err err err 157 err err err err err err err 158 err err 159 err 246 err err err 161 err err err 
r12 err r12 err err r12 r12 r12 r12 r12 r12 r12 r12 r12 r12 r12 r12 err err err err err err err err err s88 err err r12 err err err err 247 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s149 err err s150 err s151 err err err err err err err err err err s152 err err s153 err err err err err err err err 248 155 err err err err err err err 157 err err err err err err err 158 err err 159 err err err err err 161 err err err 
err err err s149 err err s150 err s151 err err err err err err err err err err s152 err err s153 err err err err err err err err 249 155 err err err err err err err 157 err err err err err err err 158 err err 159 err err err err err 161 err err err 
err err err s149 err err s150 err s151 err err err err err err err err err err s152 err err s153 err err err err err err err err 154 155 err err err err 250 err err 157 err err err err err err err 158 err err 159 err 160 err err err 161 err err err 
err err err s149 err err s150 err s151 err err err err err err err err err err s152 err err s153 err err err err err err err err 154 155 err err err err 251 err err 157 err err err err err err err 158 err err 159 err 160 err err err 161 err err err 
err err err s149 err err s150 err s151 err err err err err err err err err err s152 err err s153 err err err err err err err err err 155 err err err err err err err 157 err err err err err err err 252 err err 159 err err err err err 161 err err err 
err err err s149 err err s150 err s151 err err err err err err err err err err s152 err err s153 err err err err err err err err err 155 err err err err err err err 157 err err err err err err err 253 err err 159 err err err err err 161 err err err 
err err err err err err err r44 err err r44 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s254 err err err err err err err err s35 s255 err s37 s256 err s257 err err s265 err err 40 41 err err 42 258 44 259 260 47 err err err 261 262 50 err 51 err err 52 err 53 263 264 err 57 err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s61 err err 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 266 err 57 err err err 
err err err r26 err err r26 err r26 err r26 err err err err err err err r26 r26 r26 r26 r26 r26 r26 r26 err err r26 err r26 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r22 err err r22 err r22 err r22 err err err err err err err err r22 r22 err r22 r22 err r22 err err r22 err r22 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r10 err err r10 err err err err err err err err err err err err err err err err err err s118 err err err err err err 267 err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s268 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r73 err r73 err r73 r73 r73 r73 r73 r73 err r73 r73 err r73 r73 r73 err err err err err err err err err err err err r73 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r12 err r12 err r12 r12 r12 r12 r12 r12 err r12 r12 r12 r12 r12 r12 err err err err err err err err err s127 err err r12 err err err err 269 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r44 err err r44 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r12 err r12 err err r12 r12 r12 r12 r12 r12 r12 r12 err r12 r12 r12 err err err err err err err err err s143 err err r12 err err err err 270 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r75 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r69 err err err err r69 r69 err r69 r69 err r69 r69 err r69 r69 r69 err err err err err err err err err err r69 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r72 err err err err r72 r72 err r72 r72 err r72 r72 err r72 r72 r72 err err err err err err err err err err r72 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s271 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err s272 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r53 err err err err err err err err err err err err err r53 err err err err err err err err err err err err r53 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r55 err err err err err err err err err err err err err r55 err err err err err err err err err err err err r55 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r54 err err err err err err err err err err err err err r54 err err err err err err err err err err err err r54 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r56 err err err err err err err err err err err err err r56 err err err err err err err err err err err err r56 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r11 err r11 err err r11 r11 r11 r11 r11 r11 r11 r11 r11 r11 r11 r11 err err err err err err err err err err err err r11 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r58 err err err err err err err err err err r58 r58 err r58 r58 r58 err err err err err err err err err err r58 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r59 err err err err err err err err err err r59 r59 err r59 r59 r59 err err err err err err err err err err r59 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err r51 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err r50 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r61 err err err err err r61 err r61 err err r61 r61 err r61 r61 r61 err err err err err err err err err err r61 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r62 err err err err err r62 err r62 err err r62 r62 err r62 r62 r62 err err err err err err err err err err r62 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r34 err err r34 err r34 err r34 err err err err err err r34 err r34 r34 err r34 r34 err r34 err err r34 err r34 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s273 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s274 err err err err err err err err s35 err err s37 err err err err err err err err 40 41 err err 42 err 44 275 err 47 err err err err err 50 err 51 err err 52 err 53 err err err 57 err err err 
err err err s276 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r29 err err r29 err r29 err r29 err err err err err err r29 err r29 r29 err r29 r29 err r29 err err r29 err r29 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s277 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r30 err err r30 err r30 err r30 err err err err err err r30 err r30 r30 err r30 r30 err r30 err err r30 err r30 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r32 err err r32 err r32 err r32 err err err err err err r32 err r32 r32 err r32 r32 err r32 err err r32 err r32 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r33 err err r33 err r33 err r33 err err err err err err r33 err r33 r33 err r33 r33 err r33 err err r33 err r33 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r31 err err r31 err r31 err r31 err err err err err err r31 err r31 r31 err r31 r31 err r31 err err r31 err r31 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r36 err err r36 err r36 err r36 err err err err err err s278 err r36 r36 err r36 r36 err r36 err err r36 err r36 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err s1 s35 s36 s2 s37 s38 s3 s39 err err s61 err s281 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 55 279 57 58 280 60 
err err err r38 err err r38 err r38 err r38 err err err err err err err err r38 r38 err r38 r38 err r38 err err r38 err r38 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err r9 err err r9 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r12 err r12 err r12 r12 r12 r12 r12 r12 err r12 r12 err r12 r12 r12 err err err err err err err err err s187 err err r12 err err err err 282 err err err err err err err err err err err err err err err err err err err err err err err err err err 
r11 err r11 err r11 r11 r11 r11 r11 r11 err r11 r11 r11 r11 r11 r11 err err err err err err err err err err err err r11 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r11 err r11 err err r11 r11 r11 r11 r11 r11 r11 r11 err r11 r11 r11 err err err err err err err err err err err err r11 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r73 err err err err r73 r73 err r73 r73 err r73 r73 err r73 r73 r73 err err err err err err err err err err r73 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r12 err err err err r12 r12 err r12 r12 err r12 r12 err r12 r12 r12 err err err err err err err err err s214 r12 err err err err err err 283 err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s70 err err s71 err err err err err err err err 72 73 err err 74 err 75 284 err 77 err err err err err 78 err 79 err err 80 err 81 err err err 82 err err err 
err err err r39 err err r39 err r39 err r39 err err err err err err r39 err r39 r39 err r39 r39 err r39 err err r39 err r39 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err s285 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s67 err err s68 err s69 err err err err err err err err err err s70 err err s71 err err err err err err err err 72 73 err err 74 err 75 286 err 77 err err err err err 78 err 79 err err 80 err 81 err err err 82 err err err 
err err err r35 err err r35 err r35 err r35 err err err err err err r35 err r35 r35 err r35 r35 err r35 err err r35 err r35 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s61 err err 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 287 err 57 err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err s288 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s34 err err err err err err err err s35 s36 err s37 s38 err s39 err err s61 err s290 40 41 err err 42 43 44 45 46 47 err err err 48 49 50 err 51 err err 52 err 53 54 55 289 57 err err err 
err err err r19 err err r19 err r19 err r19 err err err err err err r19 err r19 r19 err r19 r19 err r19 err err r19 err r19 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r11 err r11 err r11 r11 r11 r11 r11 r11 err r11 r11 err r11 r11 r11 err err err err err err err err err err err err r11 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
r11 err err err err r11 r11 err r11 r11 err r11 r11 err r11 r11 r11 err err err err err err err err err err r11 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s291 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r40 err err r40 err r40 err r40 err err err err err err r40 err r40 r40 err r40 r40 err r40 err err r40 err r40 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err s292 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r37 err err r37 err r37 err r37 err err err err err err err err r37 r37 err r37 r37 err r37 err err r37 err r37 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r21 err err r21 err r21 err r21 err err err err err err r21 err r21 r21 err r21 r21 err r21 err err r21 err r21 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err s293 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r20 err err r20 err r20 err r20 err err err err err err r20 err r20 r20 err r20 r20 err r20 err err r20 err r20 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s254 err err err err err err err err s35 s255 err s37 s256 err s257 err err s265 err err 40 41 err err 42 258 44 259 260 47 err err err 261 262 50 err 51 err err 52 err 53 263 294 err 57 err err err 
err err err s31 err err s32 err s33 err s254 err err err err err err err err s35 s255 err s37 s256 err s257 err err s265 err err 40 41 err err 42 258 44 259 260 47 err err err 261 262 50 err 51 err err 52 err 53 263 295 err 57 err err err 
err err err r22 err err r22 err r22 err r22 err err err err err err r22 err r22 r22 err r22 r22 err r22 err err r22 err r22 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r36 err err r36 err r36 err r36 err err err err err err s296 err r36 r36 err r36 r36 err r36 err err r36 err r36 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err r38 err err r38 err r38 err r38 err err err err err err r38 err r38 r38 err r38 r38 err r38 err err r38 err r38 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
err err err s31 err err s32 err s33 err s254 err err err err err err err err s35 s255 err s37 s256 err s257 err err s265 err err 40 41 err err 42 258 44 259 260 47 err err err 261 262 50 err 51 err err 52 err 53 263 297 err 57 err err err 
err err err r37 err err r37 err r37 err r37 err err err err err err r37 err r37 r37 err r37 r37 err r37 err err r37 err r37 err err err err err err err err err err err err err err err err err err err err err err err err err err err err err err 
`;

const LRtitle = `!=                                   #                                  &&                                   (                                   )                                   *                                   +                                   ,                                   -                                   /                                   ;                                   <                                  <=                                   =                                  ==                                   >                                  >=                                ELSE                               FLOAT                                  ID                                  IF                                 INT                                 NUM                              RETURN                                VOID                               WHILE                                   [                                   ]                                   {                                  ||                                   }@                 additive_expression               addressing_expression                       array_closure            array_expression_closure               assignment_expression                  compound_statement                 equality_expression                          expression                expression_statement                       function_call                function_declaration                 function_definition            function_definition_list                 iteration_statement                      jump_statement                  logical_expression             logical_expression_list           multiplicative_expression               parameter_declaration                      parameter_list                  primary_expression                             program               relational_expression                 selection_statement                           statement                      statement_list                    unary_expression                 variable_definition            variable_definition_list                       variable_type`;

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
assignment_expression -> ID = assignment_expression
assignment_expression -> ID array_expression_closure = assignment_expression
assignment_expression -> logical_expression
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
unary_expression -> + primary_expression
unary_expression -> - primary_expression
primary_expression -> addressing_expression
primary_expression -> NUM
primary_expression -> function_call
primary_expression -> ( expression )
addressing_expression -> ID
addressing_expression -> ID array_expression_closure
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