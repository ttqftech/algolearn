export interface CodeLine {
	code: string;
	tokenMap: Array<Token>;
}

export interface CodeChar {
	char: string;	// 字符
	ln: number;		// 行
	col: number;	// 列
	token: Token;	// 向上对应的词 token
}

export interface Token {
	type: TokenType;
	value: any;
}

export interface CodePosition {
	ln: number;
	col: number;
}

export enum TokenType {
	error = -1,			// 状态机终态或非终态过后读取到的无法转移状态
	unknown = 0,		// 未读取
	preprocess = 10,	// 预处理（整句）
	comma = 20,			// 逗号
	semicon = 30,		// 分号
	endline = 40,		// 换行
	brakets_round_left = 110,	// (  左圆括号
	brakets_round_right = 115,	// )  右圆括号
	brakets_square_left = 120,	// [  左方括号
	brakets_square_right = 125,	// ]  右方括号
	brakets_curly_left = 130,	// {  左花括号
	brakets_curly_right = 135,	// }  右花括号
	compare_equal = 210,		// == 相等
	compare_unequal = 211,		// != 不相等
	compare_less = 220,			// <  小于
	compare_less_equal = 221,	// <= 小于等于
	compare_great = 230,		// >  大于
	compare_great_equal = 231,	// >= 大于
	compare_colon = 250,		// :  三目——冒号
	compare_question = 251,		// ?  三目——问号
	bit_logic_and = 310,		// && 逻辑与
	bit_logic_or = 311,			// || 逻辑或
	bit_and = 320,				// &  按位与
	bit_and_assign = 321,		// &= 按位与赋值
	bit_or = 330,				// |  按位与
	bit_or_assign = 331,		// |= 按位或赋值
	bit_negation = 340,			// |  按位取反
	bit_negation_assign = 341,	// |= 按位取反赋值
	bit_xor = 350,				// |  按位异或
	bit_xor_assign = 351,		// |= 按位异或赋值
	bit_move_left = 360,		// << 位左移
	bit_move_left_assign = 361,	// <<= 位左移赋值
	bit_move_right = 370,		// >> 位右移
	bit_move_right_assign = 371,// >>= 位右移赋值
	calc_assign = 410,			// =  赋值
	calc_negation = 420,		// !  取反
	calc_mod = 450,				// %  取余
	calc_mod_assign = 451,		// %= 取余赋值
	calc_multiply = 460,		// *  乘
	calc_multiply_assign = 461,	// *= 乘赋值
	calc_devide = 470,			// /  除以
	calc_devide_assign = 471,	// /= 除以赋值
	calc_add = 480,				// +  加
	calc_add_assign = 481,		// += 加赋值
	calc_add_self = 482,		// ++ 自加
	calc_minus = 490,			// -  减
	calc_minus_assign = 491,	// -= 减赋值
	calc_minus_self = 492,		// -- 自减
	struct_point = 510,			// .  结构体点操作
	struct_arrow = 511,			// -> 结构体箭头操作
	number_bin_int = 611,		// 二进制整数
	number_bin_float = 613,		// 二进制浮点数
	number_bin_float_e = 616,	// 二进制浮点数带 E
	number_oct_int = 621,		// 八进制整数
	number_oct_float = 623,		// 八进制浮点数
	number_oct_float_e = 626,	// 八进制浮点数带 E
	number_dec_int = 631,		// 十进制整数
	number_dec_float = 633,		// 十进制浮点数
	number_dec_float_e = 636,	// 十进制浮点数带 E
	number_hex_int = 641,		// 十六进制整数
	number_hex_float = 643,		// 十六进制浮点数
	number_hex_float_e = 646,	// 十六进制浮点数带 E
	char_char = 713,			// '' 字符
	char_string = 724,			// "" 字符串
	bool_true = 730,			// 布尔真
	bool_false = 731,			// 布尔假
	note_singleline = 912,		// // 单行注释
	note_multiline = 922,		// /* */ 多行注释
	identifier = 1000,			// 标识符
	keyword = 1100,				// 关键字
	keyword_void = 1101,
	keyword_short = 1102,
	keyword_int = 1103,
	keyword_long = 1104,
	keyword_float = 1105,
	keyword_double = 1106,
	keyword_char = 1107,
	keyword_for = 1108,
	keyword_while = 1109,
	keyword_do = 1110,
	keyword_if = 1111,
	keyword_else = 1112,
	keyword_switch = 1113,
	keyword_case = 1114,
	keyword_break = 1115,
	keyword_continue = 1116,
	keyword_return = 1117,
	eof = 9999,					// 文件结尾
	bof = 9998,					// 文件开头第 -1 个字符（无效位置）
}

export const Keywords = ['void','short','int','long','float','double','char','for','while','do','if','else','switch','case','break','continue','return'];

export interface CourseIndex {
	chapter: number;
	section: number;
}

export interface ChapterInfo {
	title: String;
	sections: Array<CourseInfo>;
};

export interface CourseInfo {
	title: String;
	course: React.ComponentClass<any, any>; // | typeof BaseCourse
}

export interface ListeningVariable {
	name: String;
	type: Array<TokenType>;	// 待定
}

export interface ChangedVariable<T> {
	name: string;
	value: T;
}