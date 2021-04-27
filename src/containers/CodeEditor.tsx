import React from "react";
import { CodeService } from "../core/CodeService";
import { ChangedVariable, CodePosition } from "../types/types";
import './CodeEditor.scss'

interface Props {
	onVariableChanged<T>(changedVariable: ChangedVariable<T>): void;	// 变量发生变化时由父组件调用
}

interface State {
	width: number;
	pointerPos: CodePosition;
	runningLine: number;
}

class CodeEditor extends React.Component<Props, State> {
	private codeService: CodeService;

	constructor(props: Props | Readonly<Props>) {
		super(props);
		this.state = {
            width: 280,
			pointerPos: {
				ln: 0,
				col: 0,
			},
			runningLine: -1,
		};
		this.codeService = new CodeService();
		(window as any).codeService = this.codeService;
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
					{this.codeService.getAllCode()}
				</div>
			</div>
		)
	}
}

export default CodeEditor;