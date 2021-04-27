import React from 'react';
import { getCourseMenu } from '../courses/CourseGetter';
import { CourseIndex } from '../types/types';
import './CourseMenu.scss'

interface Props {
	courseIndex?: CourseIndex;
	onChapterSelected: (courseIndex: CourseIndex) => any;
}

interface State {
	width: number;
	selectedChapter: number;
}

class CourseMenu extends React.Component<Props, State> {
	constructor(props: Props | Readonly<Props>) {
		super(props);
		this.state = {
			width: 296,
			selectedChapter: -1,
		};
	}

	onChapterClick(index: number): void {
		this.setState({
			selectedChapter: this.state.selectedChapter === index ? -1 : index
		});
	}

	onSectionClick(chapterIndex: number, sectionIndex: number): void {
		this.props.onChapterSelected({
			chapter: chapterIndex,
			section: sectionIndex,
		});
	}

	render() {
		return (
			<div className="course-menu" style={{ width: this.props.courseIndex ? `${this.state.width}px` : `100%`, boxShadow: this.props.courseIndex ? '0 0 8px hsla(0, 0%, 20%, 0.25)' : 'unset' }}>
				<div className="welcome" style={{ height: this.props.courseIndex ? '0' : '224px' }}>
					<div>
						<h2>欢迎来到 algolearn</h2>
						<h2>从下面的章节中选择你想要学习的算法课程吧~</h2>
						<div className="hline"></div>
					</div>
				</div>
				<div className="menu" style={{ top: this.props.courseIndex ? '0' : '216px' }}>
					{getCourseMenu().map((chapter, chapterIndex) => {
						return (
							<div className="chapter">
								<div className="bar" onClick={this.onChapterClick.bind(this, chapterIndex)}>
									<div className="title">{chapter.title}</div>
									<div className="blueline" style={{ width: this.state.selectedChapter === chapterIndex ? '100%' : '0' }}></div>
									{/* @ts-ignore */}
									<svg className="triangle" t="1619515982364" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3204" width="128" height="128"><path d="M781.790276 554.042745c25.5968-22.013248 25.5968-58.360705 3.583552-83.957506L317.464317 16.509936c-25.5968-22.013248-61.944257-22.013248-83.957505 0-22.013248 22.013248-22.013248 58.360705 0 80.373954l424.39495 416.71591-427.978502 413.132358c-22.013248 22.013248-22.013248 58.360705 0 80.373954 25.5968 22.013248 61.944257 22.013248 83.957505 0l467.909511-453.063367z" fill="" p-id="3205"></path></svg>
								</div>
								<div className="content" style={{ height: this.state.selectedChapter === chapterIndex ? 'unset' : '0' }}>
									{chapter.sections.map((section, sectionIndex) => {
										return (
											<div className="section" onClick={this.onSectionClick.bind(this, chapterIndex, sectionIndex)}>
												<div className="background" style={{ width: this.props.courseIndex && this.props.courseIndex.chapter === chapterIndex && this.props.courseIndex.section === sectionIndex ? '100%' : '0' }}>
												</div>
												<div className="title">{section.title}</div>
												<div className="grayline"></div>
											</div>
										)
									})}
								</div>
							</div>
						)
					})}
				</div>
			</div>
		);
	}
}

export default CourseMenu;
