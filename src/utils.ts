import { CodeCharWrapper, CodePosition, Keywords, TokenType } from "./types/types";

export function isTerminator(type: TokenType | number): boolean {
    return [
        TokenType.preprocess,
        TokenType.comma,
        TokenType.semicon,
        TokenType.endline,
        TokenType.brakets_round_left,
        TokenType.brakets_round_right,
        TokenType.brakets_square_left,
        TokenType.brakets_square_right,
        TokenType.brakets_curly_left,
        TokenType.brakets_curly_right,
        TokenType.compare_equal,
        TokenType.compare_unequal,
        TokenType.compare_less,
        TokenType.compare_less_equal,
        TokenType.compare_great,
        TokenType.compare_great_equal,
        TokenType.compare_colon,
        TokenType.compare_question,
        TokenType.bit_logic_and,
        TokenType.bit_logic_or,
        TokenType.bit_and,
        TokenType.bit_and_assign,
        TokenType.bit_or,
        TokenType.bit_or_assign,
        TokenType.bit_negation,
        TokenType.bit_negation_assign,
        TokenType.bit_xor,
        TokenType.bit_xor_assign,
        TokenType.bit_move_left_assign,
        TokenType.bit_move_left,
        TokenType.bit_move_right,
        TokenType.bit_move_right_assign,
        TokenType.calc_assign,
        TokenType.calc_negation,
        TokenType.calc_mod,
        TokenType.calc_mod_assign,
        TokenType.calc_multiply,
        TokenType.calc_multiply_assign,
        TokenType.calc_devide,
        TokenType.calc_devide_assign,
        TokenType.calc_minus,
        TokenType.calc_minus_assign,
        TokenType.calc_add,
        TokenType.calc_add_assign,
        TokenType.number_bin_int,
        TokenType.number_bin_float,
        TokenType.number_bin_float_e,
        TokenType.number_oct_int,
        TokenType.number_oct_float,
        TokenType.number_oct_float_e,
        TokenType.number_dec_int,
        TokenType.number_dec_float,
        TokenType.number_dec_float_e,
        TokenType.number_hex_int,
        TokenType.number_hex_float,
        TokenType.number_hex_float_e,
        TokenType.number_bin_int,
        TokenType.number_bin_float,
        TokenType.number_bin_float_e,
        TokenType.struct_point,
        TokenType.struct_arrow,
        TokenType.char_char,
        TokenType.char_string,
        TokenType.note_singleline,
        TokenType.note_multiline,
        TokenType.identifier,
        TokenType.keyword,
        TokenType.eof,
    ].indexOf(type) >= 0;
}

export function getKeyWordIndex(code: string) {
    return Keywords.indexOf(code);
}

export function getCharPosFromCodeChar(c: CodeCharWrapper): CodePosition {
    return {
        ln: c.ln,
        col: c.col,
    };
}

export function mid(a: number, b: number, c: number) {
    return [a, b, c].sort((a, b) => a > b ? 1 : -1)[1];
}