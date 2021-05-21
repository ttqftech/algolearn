import React from "react";
import { ProgramNode } from "../types/types";

export abstract class BaseCourse<Props = {}, State = {}> extends React.Component<Props, State> {
	// 父组件需要在 props 里传入 onRef，这里组件挂载后自动调用，用于给父组件获取对该组件的 ref 引用
	componentDidMount(): void {
		(this.props as any).onRef(this);
	}
	abstract getBaseCode(): string;  // 示例代码
	abstract render(): JSX.Element;  // render 函数
}

export interface BaseCourseProps {
	onRef: (_this: BaseCourse) => void;
	programNode?: ProgramNode;
}