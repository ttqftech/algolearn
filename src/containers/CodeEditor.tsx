import React from "react";
import { CodeService, CodeServiceEvent } from "../core/CodeService";
import { ChangedVariable, CodeChar, CodePosition, TokenType } from "../types/types";
import './CodeEditor.scss'

interface Props {
	onVariableChanged<T>(changedVariable: ChangedVariable<T>): void;	// 变量发生变化时由父组件调用
}

interface State {
	width: number;
	pointerPos: CodePosition;
	focused: boolean;
	runningLine: number;
}

class CodeEditor extends React.Component<Props, State> {
	private codeService: CodeService;
	private pointerElemRef: HTMLDivElement | null;
	private dragging: boolean = false;

	constructor(props: Props | Readonly<Props>) {
		super(props);
		this.state = {
            width: 360,
			pointerPos: {
				ln: 0,
				col: 0,
			},
			focused: false,
			runningLine: -1,
		};
		this.codeService = new CodeService();
		(window as any).codeService = this.codeService;
		this.pointerElemRef = null;
		this.mountCodeServiceEvent();
	}

	mountCodeServiceEvent() {
		this.codeService.on(CodeServiceEvent.CodeUpdated, () => {
			// console.log('CodeUpdated');
			this.setState({});
		})
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
	}

	/**
	 * 响应编辑器 mask 的键盘操作
	 */
	onKeyDown(event: any) {
		// console.log(event);
		let { ln, col } = this.state.pointerPos;
		let newChar: CodeChar;	// 临时值
		switch (event.key) {
			case 'ArrowLeft':
				newChar = this.codeService.readPrevChar(ln, col);
				if (newChar.token.type !== TokenType.bof) {
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
				if (newChar.token.type !== TokenType.eof) {
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
					newChar = this.codeService.deletePrevChar(ln, col) as CodeChar;
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
					newChar = this.codeService.deleteNextChar(ln, col) as CodeChar;
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
		this.restartPointerAnimation();
	}

	/**
	 * 响应编辑器 mask 的移动操作
	 */
	onMouseMove(event: any): void {
		if (!this.dragging) {
			return;
		}
		let x = event.nativeEvent.offsetX;
		let y = event.nativeEvent.offsetY - 6;
		let newChar = this.codeService.readCharAt(Math.round(y / 20), Math.round(x / 9));
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
	onDragStart(event: any) {
		this.dragging = true;
		this.onMouseMove(event);
	}

	/**
	 * 响应编辑器 mask 的 DragEnd 操作
	 */
	onDragEnd(event: any) {
		this.dragging = false;
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
			<div className="code-editor" style={{ width: `${this.state.width}px` }}>
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
					<div className="codearea">
						<textarea className="opmask" onFocus={() => this.onEditorFocused(true)} onBlur={() => this.onEditorFocused(false)} onInput={this.onInput.bind(this)} onKeyDown={this.onKeyDown.bind(this)} onMouseMove={this.onMouseMove.bind(this)} onMouseDown={this.onDragStart.bind(this)} onMouseUp={this.onDragEnd.bind(this)} />
						<div className="pointer" style={{ display: this.state.focused ? 'unset' : 'none', left: `${this.state.pointerPos.col * 9 + 3}px`, top: `${this.state.pointerPos.ln * 20}px` }} ref={div => this.pointerElemRef = div} />
						{this.codeService.getCodeLines().map((codeLine, ln) => {
							return (
								<div className="codeline" key={ln}>
									<div className="content">
										{/* {codeLine.code} */}
										{codeLine.code.split('').map((char, col) => {
											let color: string;
											if (codeLine.tokenMap[col]) {
												color = this.codeService.getTokenColor(codeLine.tokenMap[col].type);
											} else {
												color = ''
											}
											return (
												<div className="char" key={col} style={{ color: color }}>{char}</div>
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