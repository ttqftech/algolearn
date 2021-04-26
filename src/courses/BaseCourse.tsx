import React from "react";
import { ChangedVariable, ListeningVariable } from "../types/types";

export abstract class BaseCourse<Props = {}, State = {}> extends React.Component<Props, State> {
	abstract getBaseCode(): string;  // 示例代码
	abstract getListeningVariable(): Array<ListeningVariable>;	// 获取需要在代码编辑器监听的变量
	abstract onVariableChange<T>(changedVariable: ChangedVariable<T>): void;	// 变量发生变化时由父组件调用
	abstract render(): JSX.Element;  // render 函数
}