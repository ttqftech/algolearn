import React from "react";
import { ChangedVariable, ListeningVariable } from "../types/types";

export abstract class BaseCourse<Props = {}, State = {}> extends React.Component<Props, State> {
	// 父组件需要在 props 里传入 onRef，这里组件挂载后自动调用，用于给父组件获取对该组件的 ref 引用
	componentDidMount(): void {
		(this.props as any).onRef(this);
	}
	abstract getBaseCode(): string;  // 示例代码
	abstract getListeningVariable(): Array<ListeningVariable>;	// 获取需要在代码编辑器监听的变量
	abstract onVariableChanged<T>(changedVariable: ChangedVariable<T>): void;	// 变量发生变化时由父组件调用
	abstract render(): JSX.Element;  // render 函数
}

export interface BaseCourseProps {
	onRef: (_this: BaseCourse) => void;
}