import React from "react";
// import { findDOMNode } from "react-dom";
import { CodeService, CodeServiceEvent } from "../core/CodeService";
import { CodeCharWrapper, CodeLine, CodePosition, ProgramNode, Token, TokenType } from "../types/types";
import { getCharPosFromCodeChar } from "../utils";
import './CodeEditor.scss'

const CW = 8;		// 每字符宽度
const CH = 20;		// 每行高度

interface Props {
	onRef: (_this: CodeEditor) => void;
	onProgramNodeUpdate: (programNode: ProgramNode | undefined) => void;
}

interface State {
	width: number;
	pointerPos: CodePosition;
	focused: boolean;
	codeareaSize: {
		width: number;
	}
	syntaxError?: {
		position: {
			ln: number,
			col: number,
		};
		message?: string;
	}
	runningPos?: CodePosition;
}

class CodeEditor extends React.Component<Props, State> {
	private codeService: CodeService;
	private pointerElemRef: HTMLDivElement | null;
	private codeareaElemRef: HTMLDivElement | null;
	private maskDragging: boolean = false;

	constructor(props: Props | Readonly<Props>) {
		super(props);
		this.state = {
            width: 480,
			pointerPos: {
				ln: 0,
				col: 0,
			},
			focused: false,
			codeareaSize: {
				width: 0,
			},
			runningPos: undefined,
		};
		this.codeService = new CodeService();
		(window as any).codeService = this.codeService;
		this.pointerElemRef = null;
		this.codeareaElemRef = null;
		this.mountCodeServiceEvent();
	}

	// getSnapshotBeforeUpdate(prevProps: Props, prevState: State) {
	// 	console.log('update');
	// 	return 0;
	// }

	/**
	 * 重渲染时，自动将界面滚动到光标位置（不是好的解决方案，此处有设计缺陷）
	 */
	componentDidUpdate() {
		this.scrollPointerIntoView(this.state.pointerPos);
	}

	/**
	 * 父组件需要在 props 里传入 onRef，这里组件挂载后自动调用，用于给父组件获取对该组件的 ref 引用
	 */
	componentDidMount(): void {
		this.props.onRef(this);
	}

	mountCodeServiceEvent() {
		this.codeService.on(CodeServiceEvent.CodeUpdated, () => {
			// 代码更新，刷新显示
			this.setState({});
		});
		this.codeService.on(CodeServiceEvent.LexicalReady, () => {
			// 词法分析结束，刷新代码高亮
			this.setState({});
		});
		this.codeService.on(CodeServiceEvent.GrammarReady, (errorToken: Token | undefined, message?: string) => {
			// 语法分析结束，如果有错误，那么 errorToken 指示错误位置，需要在界面上指示出来
			if (errorToken) {
				let codePosition;
				// errorToken 有可能是 eof，因此进一步判断
				if (errorToken.type !== TokenType.eof) {
					codePosition = getCharPosFromCodeChar(errorToken.firstCode!);
				} else {
					codePosition = {
						ln: this.codeService.getCodeLines().length,
						col: 0
					};
				}
				this.setState({
					syntaxError: {
						position: {
							ln: codePosition.ln,
							col: codePosition.col,
						},
						message,
					}
				});
			} else {
				this.setState({
					syntaxError: undefined
				});
			}
		});
		this.codeService.on(CodeServiceEvent.ProgramNodeReady, (progranNode: ProgramNode) => {			
			// 传至上层
			this.props.onProgramNodeUpdate(progranNode);
		})
		this.codeService.on(CodeServiceEvent.RuntimeReset, () => {
			this.setState({
				runningPos: undefined
			});	
		});
	}

	/**
	 * 每次输入代码后都刷新代码区域蒙层的大小
	 */
	refreshCodeareaSize() {
		let codeLines = this.codeService.getCodeLines();
		let longestCodeLine: number = 0;
		for (const codeLine of codeLines) {
			longestCodeLine = Math.max(longestCodeLine, codeLine.length);
		}
		this.setState({
			codeareaSize: {
				width: longestCodeLine * CW,
			}
		});
	}

	/**
	 * 每次移动光标都使光标进入画面（此处有设计缺陷，因为透明蒙层响应了输入之后就自动跳到焦点位置，因此需要在 nextTick 变更 scroll 位置，会造成性能损耗和画面抖动）
	 */
	scrollPointerIntoView(position: CodePosition): void {
		let pointerLeft = position.col * CW;
		let pointerTop = position.ln * CH;
		let ref = this.codeareaElemRef!;
		if (pointerLeft > ref.offsetWidth + ref.scrollLeft - CW) {
			let sl = pointerLeft - ref.offsetWidth + CW;
			setTimeout((ref) => {
				ref.scrollLeft = sl;
			}, 0, ref);
		} else if (pointerLeft < ref.scrollLeft + CW) {
			let sl = pointerLeft - CW;
			setTimeout((ref) => {
				ref.scrollLeft = sl;
			}, 0, ref);
		}
		ref = ref.parentElement as HTMLDivElement;
		if (pointerTop > ref.offsetHeight + ref.scrollTop - CH) {
			let sl = pointerTop - ref.offsetHeight + CH;
			setTimeout((ref) => {
				ref.scrollTop = sl;
			}, 0, ref);
		} else if (pointerTop < ref.scrollTop + CH) {
			let sl = pointerTop - CH;
			setTimeout((ref) => {
				ref.scrollTop = sl;
			}, 0, ref);
		}
	}

	/**
	 * 选取新课件时将预置代码传入 CodeService
	 */
	setCode(code: string) {
		this.codeService.resetCode(code);
		this.refreshCodeareaSize();
	}

	/**
	 * 响应编辑器的获得/失去焦点事件
	 */
	onEditorFocused(focused: boolean) {
		this.setState({
			focused
		});
	}

	/**
	 * 响应编辑器 mask 的输入操作
	 */
	onInput(event: any) {
		let element = event.target as HTMLInputElement;
		let newPos = this.codeService.insertCode(element.value, this.state.pointerPos.ln, this.state.pointerPos.col);
		this.setState({
			pointerPos: newPos
		});
		element.value = '';
		this.refreshCodeareaSize();
		// this.scrollPointerIntoView(newPos);
	}

	/**
	 * 响应编辑器 mask 的键盘操作
	 */
	onKeyDown(event: any) {
		// console.log(event);
		let { ln, col } = this.state.pointerPos;
		let newChar: CodeCharWrapper | undefined;	// 临时值
		switch (event.key) {
			case 'ArrowLeft':
				newChar = this.codeService.readPrevChar(ln, col);
				if (newChar.code.token.type !== TokenType.bof) {
					this.setState({
						pointerPos: {
							ln: newChar.ln,
							col: newChar.col,
						}
					});	
				}
				break;
			case 'ArrowRight':
				newChar = this.codeService.readNextChar(ln, col);
				if (newChar.code.token.type !== TokenType.eof) {
					this.setState({
						pointerPos: {
							ln: newChar.ln,
							col: newChar.col,
						}
					});	
				}
				break;		
			case 'ArrowUp':
				newChar = this.codeService.readCharAt(ln - 1, col);
				this.setState({
					pointerPos: {
						ln: newChar.ln,
						col: newChar.col,
					}
				});	
				break;		
			case 'ArrowDown':
				newChar = this.codeService.readCharAt(ln + 1, col);
				this.setState({
					pointerPos: {
						ln: newChar.ln,
						col: newChar.col,
					}
				});	
				break;		
			case 'Backspace':
				if (event.altKey) {
					newChar = this.codeService.deleteCodeLine(ln, col);
				} else {
					newChar = this.codeService.deletePrevChar(ln, col) as CodeCharWrapper;
				}
				this.setState({
					pointerPos: {
						ln: newChar.ln,
						col: newChar.col,
					}
				});
				this.refreshCodeareaSize();
				break;
			case 'Delete':
				if (event.altKey) {
					newChar = this.codeService.deleteCodeLine(ln, col);
				} else {
					newChar = this.codeService.deleteNextChar(ln, col) as CodeCharWrapper;
				}
				this.setState({
					pointerPos: {
						ln: newChar.ln,
						col: newChar.col,
					}
				});
				this.refreshCodeareaSize();
				break;
		// 	default:
		// 		break;
		}
		// if (newChar) {
		// 	this.scrollPointerIntoView(newChar);
		// }
		this.restartPointerAnimation();
	}

	/**
	 * 响应编辑器 mask 的移动操作
	 */
	onMaskMouseMove(event: any | MouseEvent): void {
		if (!this.maskDragging) {
			return;
		}
		let x = event.nativeEvent.offsetX;
		let y = event.nativeEvent.offsetY - 6;
		let newChar = this.codeService.readCharAt(Math.round(y / CH), Math.round(x / CW));
		this.setState({
			pointerPos: {
				ln: newChar.ln,
				col: newChar.col,
			}
		});
		this.restartPointerAnimation();
	}

	/**
	 * 响应编辑器 mask 的 DragStart 操作
	 */
	onMaskDragStart(event: any | MouseEvent) {
		this.maskDragging = true;
		this.onMaskMouseMove(event);
	}

	/**
	 * 响应编辑器 mask 的 DragEnd 操作
	 */
	onMaskDragEnd(event: any | MouseEvent) {
		this.maskDragging = false;
	}

	/**
	 * 响应左边栏的 DragStart 操作
	 */
	onLeftBarDragStart(event: any) {
		event.preventDefault();	// 阻止触摸时浏览器的缩放、滚动条滚动 
		let leftBarDragX = (event.nativeEvent as MouseEvent).offsetX;
		let moveListener = (ev: MouseEvent) => {
			this.setState({
				width: document.documentElement.clientWidth - ev.pageX + leftBarDragX - 16,
	
			});
			// 代码编辑器宽度适配
			this.refreshCodeareaSize();
		};
		let upListener = (ev: MouseEvent) => {
			document.body.removeEventListener('mousemove', moveListener);
			document.body.removeEventListener('mouseup', upListener);
		}
		document.body.addEventListener('mousemove', moveListener);
		document.body.addEventListener('mouseup', upListener);
	}

	/**
	 * 响应“单步”按钮
	 */
	onStepClick() {
		this.codeService.step();
		this.setState({
			runningPos: this.codeService.getRunningPos()
		});
		// 传至上层
		this.props.onProgramNodeUpdate(this.codeService.getProgramNode());
	}

	/**
	 * 响应“单步”按钮长按
	 */
	onStepDown() {
		let me = this;
		let beginTimer = setTimeout(startsequenceClick, 500);
		let clickTimer: any;
		function startsequenceClick() {
			clickTimer = setInterval(() => {
				me.onStepClick();
			}, 66);
		}
		let upListener = (ev: MouseEvent) => {
			document.body.removeEventListener('mouseup', upListener);
			clearInterval(beginTimer);
			clearInterval(clickTimer);
		}
		document.body.addEventListener('mouseup', upListener);
	}

	/**
	 * 响应“重启”按钮
	 */
	onResetClick() {
		this.codeService.reset();
		// 传至上层
		this.props.onProgramNodeUpdate(this.codeService.getProgramNode());
	}

	/**
	 * 使光标重新闪烁
	 */
	restartPointerAnimation(): void {
		this.pointerElemRef?.style.setProperty('animation-name', '')
		window.requestAnimationFrame(() => {
			this.pointerElemRef?.style.setProperty('animation-name', 'flash');
		});
	}

	render() {
		return (
			<div className="code-editor" style={{ width: `${Math.max(200, this.state.width)}px` }}>
				<div className="controller">
					<button onClick={this.onStepClick.bind(this)} onMouseDown={this.onStepDown.bind(this)}>单步</button>
					<button onClick={this.onResetClick.bind(this)}>重启</button>
				</div>
				<div className="editor">
					<div className="linepointer" style={{ top: (this.state.runningPos?.ln || -1) * CH }}></div>
					<div className="lnarea">
						{this.codeService.getCodeLines().map((codeLine, ln) => {
							return (
								<div className="index" key={ln}>{ln + 1}</div>
							)
						})}
					</div>
					<div className="codearea" ref={div => this.codeareaElemRef = div}>
						<textarea className="opmask" onFocus={() => this.onEditorFocused(true)} onBlur={() => this.onEditorFocused(false)} onInput={this.onInput.bind(this)} onKeyDown={this.onKeyDown.bind(this)} onMouseMove={this.onMaskMouseMove.bind(this)} onMouseDown={this.onMaskDragStart.bind(this)} onMouseUp={this.onMaskDragEnd.bind(this)} style={{ width: this.state.codeareaSize.width }} disabled={!!this.state.runningPos} />
						<div className="pointer" style={{ display: this.state.focused ? 'unset' : 'none', left: `${this.state.pointerPos.col * CW + 3}px`, top: `${this.state.pointerPos.ln * CH}px` }} ref={div => this.pointerElemRef = div} />
						<CodeLinesComp codeService={this.codeService}></CodeLinesComp>
						{this.state.runningPos ? (
						<div className="runningpointer" style={{ left: (this.state.runningPos.col + 0.5) * CW + 4, top: (this.state.runningPos.ln + 1) * CH }}>
							<div className="triangle"></div>
						</div>
					) : null}
					</div>
					{this.state.syntaxError ? (
						<div className="syntaxerror" style={{ left: (this.state.syntaxError.position.col + 0.5) * CW + 40, top: (this.state.syntaxError.position.ln + 1) * CH }}>
							<div className="triangle"></div>
							<div className="message">{this.state.syntaxError.message || '语法错误'}</div>
						</div>
					) : null}
				</div>
				<div className="dragger" onMouseDown={this.onLeftBarDragStart.bind(this)}>
					<div className="draggerimg"></div>
				</div>
			</div>
		)
	}
}


interface CodeLinesCompProps {
	codeService: CodeService;
}

interface CodeLinesCompState {
	lineCount: number;
}

class CodeLinesComp extends React.Component<CodeLinesCompProps, CodeLinesCompState> {

	constructor (props: CodeLinesCompProps | Readonly<CodeLinesCompProps>) {
		super(props);
		this.setState({
			lineCount: 0
		});
	}

	// getSnapshotBeforeUpdate(prevProps: CodeLinesCompProps, prevState: CodeLinesCompState) {
	// 	const I = findDOMNode(this)?.parentElement?.parentElement as HTMLElement;
	// 	if (I) {
	// 		return I.scrollTop;
	// 	} else {
	// 		return null;
	// 	}
	// }

	// componentDidUpdate(prevProps: CodeLinesCompProps, prevState: CodeLinesCompState, snapshot: number | null) {
	// 	if (snapshot !== null) {
	// 		const I = findDOMNode(this)?.parentElement?.parentElement as HTMLElement;
	// 		if (I) {
	// 			// I.scrollTop = snapshot;
	// 		}
	// 	}
	// }
	
	// shouldComponentUpdate(nextProps: CodeLinesCompProps, nextState: CodeLinesCompState) {
	// 	return true;
	// 	let newLineCount = nextProps.codeService.getCodeLines().length;
	// 	if (!nextState || newLineCount !== nextState.lineCount) {
	// 		this.setState({
	// 			lineCount: newLineCount
	// 		});
	// 		return true;
	// 	} else {
	// 		return false;
	// 	}
	// }

	render () {
		return (
			<>
				{this.props.codeService.getCodeLines().map((codeLine, ln) => {
					return (
						<CodeLineComp key={ln} codeLine={codeLine} codeService={this.props.codeService} ln={ln}></CodeLineComp>
					)
				})}
			</>
		)
	}
}


interface CodeLineCompProps {
	codeLine: CodeLine;
	codeService: CodeService;
	ln: number;
}

interface CodeLineCompState {
	charCount: number;
}

class CodeLineComp extends React.Component<CodeLineCompProps, CodeLineCompState> {
	constructor(props: CodeLineCompProps | Readonly<CodeLineCompProps>) {
		super(props);
		this.setState({
			charCount: 0,
		});
	}	
	
	// shouldComponentUpdate(nextProps: CodeLineCompProps, nextState: CodeLineCompState) {
	// 	return true;
	// 	let newCharCount = nextProps.codeLine.length;
	// 	if (!nextState || newCharCount !== nextState.charCount) {
	// 		this.setState({
	// 			charCount: newCharCount
	// 		});
	// 		return true;
	// 	} else {
	// 		return false;
	// 	}
	// }

	render () {
		return (
			<div className="codeline">
				<div className="content">
					{/* {codeLine.code} */}
					{this.props.codeLine.map((code, col) => {
						let color: string;
						color = getTokenColor(code.token.type);
						return (
							<div className="char" key={col} style={{ color: color }}>{code.char}</div>
						)
					})}
				</div>
			</div>
		)
	}
}


export default CodeEditor;

function getTokenColor(tokenType: TokenType): string {
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
			return '#994444'
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
			return '#22AA66';
		case TokenType.char_char:
		case TokenType.char_string:
			return '#FF0000';		// 暂不支持
		case TokenType.bool_true:
		case TokenType.bool_false:
			return '#22AA66';
		case TokenType.note_singleline:
		case TokenType.note_multiline:
			return '#22AA22';
		case TokenType.identifier:
			return '#990099';
		case TokenType.keyword_void:
		case TokenType.keyword_short:
		case TokenType.keyword_int:
		case TokenType.keyword_long:
		case TokenType.keyword_float:
		case TokenType.keyword_double:
			return '#2277CC';
		case TokenType.keyword_while:
		case TokenType.keyword_if:
		case TokenType.keyword_else:
		case TokenType.keyword_return:
			return '#0000BB';
		default:
			return '#FF0000';
	}
}