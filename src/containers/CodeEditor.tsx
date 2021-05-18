import React from "react";
import { CodeService, CodeServiceEvent } from "../core/CodeService";
import { ChangedVariable, CodeCharWrapper, CodePosition, TokenType } from "../types/types";
import './CodeEditor.scss'

const CW = 9;		// 每字符宽度
const CH = 20;		// 每行高度

interface Props {
	onRef: (_this: CodeEditor) => void;
	onVariableChanged<T>(changedVariable: ChangedVariable<T>): void;	// 变量发生变化时由父组件调用
}

interface State {
	width: number;
	pointerPos: CodePosition;
	focused: boolean;
	codeareaSize: {
		width: number;
	}
	runningLine: number;
}

class CodeEditor extends React.Component<Props, State> {
	private codeService: CodeService;
	private pointerElemRef: HTMLDivElement | null;
	private codeareaElemRef: HTMLDivElement | null;
	private maskDragging: boolean = false;

	constructor(props: Props | Readonly<Props>) {
		super(props);
		this.state = {
            width: 360,
			pointerPos: {
				ln: 0,
				col: 0,
			},
			focused: false,
			codeareaSize: {
				width: 0,
			},
			runningLine: -1,
		};
		this.codeService = new CodeService();
		(window as any).codeService = this.codeService;
		this.pointerElemRef = null;
		this.codeareaElemRef = null;
		this.mountCodeServiceEvent();
	}

	/**
	 * 父组件需要在 props 里传入 onRef，这里组件挂载后自动调用，用于给父组件获取对该组件的 ref 引用
	 */
	componentDidMount(): void {
		this.props.onRef(this);
	}

	mountCodeServiceEvent() {
		this.codeService.on(CodeServiceEvent.CodeUpdated, () => {
			// console.log('CodeUpdated');
			this.refreshCodeareaSize();
			// this.setState({});
		})
		this.codeService.on(CodeServiceEvent.LexicalReady, () => {
			this.setState({});
		})
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
		})
	}

	/**
	 * 每次移动光标都使光标进入画面
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
		this.scrollPointerIntoView(newPos);
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
				break;
		// 	default:
		// 		break;
		}
		if (newChar) {
			this.scrollPointerIntoView(newChar);
		}
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
				width: document.documentElement.clientWidth - ev.pageX + leftBarDragX - 16
			});
		};
		let upListener = (ev: MouseEvent) => {
			document.body.removeEventListener('mousemove', moveListener);
			document.body.removeEventListener('mouseup', upListener);
		}
		document.body.addEventListener('mousemove', moveListener);
		document.body.addEventListener('mouseup', upListener);
	}

	// 使光标重新闪烁
	restartPointerAnimation(): void {
		this.pointerElemRef?.style.setProperty('animation-name', '')
		window.requestAnimationFrame(() => {
			this.pointerElemRef?.style.setProperty('animation-name', 'flash');
		});
	}

	render() {
		return (
			<div className="code-editor" style={{ width: `${Math.max(200, this.state.width)}px` }}>
				<div className="dragger" onMouseDown={this.onLeftBarDragStart.bind(this)}></div>
				<div className="controller">
					<button>开始</button>
					<button>单步</button>
					<button>停止</button>
					<button>重启</button>
				</div>
				<div className="editor">
					<div className="lnarea">
						{this.codeService.getCodeLines().map((codeLine, ln) => {
							return (
								<div className="index" key={ln}>{ln + 1}</div>
							)
						})}
					</div>
					<div className="codearea" ref={div => this.codeareaElemRef = div}>
						<textarea className="opmask" onFocus={() => this.onEditorFocused(true)} onBlur={() => this.onEditorFocused(false)} onInput={this.onInput.bind(this)} onKeyDown={this.onKeyDown.bind(this)} onMouseMove={this.onMaskMouseMove.bind(this)} onMouseDown={this.onMaskDragStart.bind(this)} onMouseUp={this.onMaskDragEnd.bind(this)} style={{ width: this.state.codeareaSize.width }} />
						<div className="pointer" style={{ display: this.state.focused ? 'unset' : 'none', left: `${this.state.pointerPos.col * CW + 3}px`, top: `${this.state.pointerPos.ln * CH}px` }} ref={div => this.pointerElemRef = div} />
						{this.codeService.getCodeLines().map((codeLine, ln) => {
							return (
								<div className="codeline" key={ln}>
									<div className="content">
										{/* {codeLine.code} */}
										{codeLine.map((code, col) => {
											let color: string;
											color = this.codeService.getTokenColor(code.token.type);
											return (
												<div className="char" key={col} style={{ color: color }}>{code.char}</div>
											)
										})}
									</div>
								</div>
							)
						})}
					</div>
				</div>
			</div>
		)
	}
}

export default CodeEditor;