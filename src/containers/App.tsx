import React from 'react';
import logo from '../others/logo.svg';
import { ChapterIndex } from '../types/types';
import CourseMenu from './CourseMenu';

import { getCourseElemByChapterIndex } from "../courses/CourseGetter";

import './App.scss';

interface State {
	chapterIndex?: ChapterIndex;
}

class App extends React.Component<{}, State> {
	constructor(props: {} | Readonly<{}>) {
		super(props);
		this.state = {
			// chapterIndex: {
			// 	chapter: 0,
			// 	section: 0,
			// }
		};
	}

	handleChapterSelected(chapterIndex: ChapterIndex) {
		this.setState({
			chapterIndex
		});
	}

	render () {
		let SelectedCourse: React.CElement<{}, React.Component<{}, any, any>>;
		SelectedCourse = getCourseElemByChapterIndex(this.state.chapterIndex);

		return (
			<div className="App">
				<header className="header">
					<img src={logo} className="logo" alt="logo" />
					<h1 className="name">algolearn</h1>
				</header>
				<div className="apparea">
					<CourseMenu
						chapterIndex={this.state.chapterIndex}
						onChapterSelected={this.handleChapterSelected}
					></CourseMenu>
					{SelectedCourse}

				</div>
			</div>
		);
	}
}

export default App;
