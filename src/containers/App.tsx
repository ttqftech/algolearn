import React from 'react';
import logo from '../others/logo.svg';
import { CourseIndex, ProgramNode } from '../types/types';
import CourseMenu from './CourseMenu';

import { getCourseByChapterIndex, getCourseElemByChapterIndex } from "../courses/CourseLoader";

import './App.scss';
import { BaseCourse } from '../courses/BaseCourse';
import CodeEditor from './CodeEditor';

interface State {
	courseIndex?: CourseIndex;
	courseRef?: BaseCourse;
	codeEditorRef?: CodeEditor;
	programNode?: ProgramNode;
}

class App extends React.Component<{}, State> {
	constructor(props: {} | Readonly<{}>) {
		super(props);
		this.state = {
			// courseIndex: {
			// 	chapter: 0,
			// 	section: 0,
			// },
			courseRef: undefined,
		};
	}

	/**
	 * 章节选择器选择后触发
	 */
	handleChapterSelected(courseIndex: CourseIndex) {
		this.setState({
			courseIndex
		});
		document.title = 'algolearn - ' + getCourseByChapterIndex(courseIndex)!.title;
		setTimeout(() => {
			if (this.state.courseRef) {
				this.state.codeEditorRef?.setCode(this.state.courseRef.getBaseCode());
			}
		}, 0);
	}

	/**
	 * ProgramNode 更新后触发
	 */
	handleProgramNodeUpdated(programNode: ProgramNode | undefined): void {
		this.setState({
			programNode
		});
	}

	/**
	 * 课程加载完成后由子组件 onRef 触发
	 */
	bindCourseRef(ref: BaseCourse) {
		this.setState({
			courseRef: ref
		});
	}

	/**
	 * 课程加载完成后由子组件 onRef 触发
	 */
	bindCodeEditorRef(ref: CodeEditor) {
		this.setState({
			codeEditorRef: ref
		});
	}

	render () {
		let SelectedCourse: React.CElement<{}, React.Component<{}, any, any>>;
		SelectedCourse = getCourseElemByChapterIndex(this.state.courseIndex, {
			onRef: this.bindCourseRef.bind(this) as any,
			programNode: this.state.programNode
		});

		return (
			<div className="App">
				<header className="header">
					<img src={logo} className="logo" alt="logo" />
					<h1 className="name">algolearn</h1>
					{this.state.courseIndex && (
						<div className="title">{getCourseByChapterIndex(this.state.courseIndex)!.title}</div>
					)}
				</header>
				<div className="apparea">
					<CourseMenu
						courseIndex={this.state.courseIndex}
						onChapterSelected={this.handleChapterSelected.bind(this)}
					></CourseMenu>
					{this.state.courseIndex && (
						<>
							<div className="playground">
								{SelectedCourse}
							</div>
							{/* <button onClick={this.handleClick.bind(this)}></button> */}
							<CodeEditor
								onRef={this.bindCodeEditorRef.bind(this)}
								onProgramNodeUpdate={this.handleProgramNodeUpdated.bind(this)}
							></CodeEditor>
						</>
					)}
				</div>
			</div>
		);
	}
}

export default App;
