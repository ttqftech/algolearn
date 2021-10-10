import React from 'react';
import { getCourseMenu } from '../courses/CourseLoader';
import { CourseIndex } from '../types/types';
import './CourseMenu.scss'

interface Props {
	courseIndex?: CourseIndex;
	onChapterSelected: (courseIndex: CourseIndex) => any;
}

interface State {
	width: number;
	dragging: boolean;
	selectedChapter: number;
}

class CourseMenu extends React.Component<Props, State> {
	constructor(props: Props | Readonly<Props>) {
		super(props);
		this.state = {
			width: 260,
			dragging: false,
			selectedChapter: -1,
		};
	}

	/**
	 * 响应本组件章点击
	 */
	onChapterClick(index: number): void {
		this.setState({
			selectedChapter: this.state.selectedChapter === index ? -1 : index
		});
	}

	/**
	 * 响应本组件节点击
	 */
	onSectionClick(chapterIndex: number, sectionIndex: number): void {
		this.props.onChapterSelected({
			chapter: chapterIndex,
			section: sectionIndex,
		});
	}

	/**
	 * 响应右边栏的 DragStart 操作
	 */
	onRightBarDragStart(event: any) {
		// event.preventDefault();		// 阻止触摸时浏览器的缩放、滚动条滚动（对于触摸事件，因为 react 默认 passive = true，所以不能用这个）
		this.setState({
			dragging: true,
		});
		let 这 = this;
		let leftBarDragX = (event.nativeEvent as MouseEvent).offsetX;	// 按下位置相对当前元素的 X
		if (leftBarDragX === undefined) {
			// 因为 touch 事件没有 offsetX/Y 属性，所以使用触摸点在窗口上的位置减去元素在窗口上的位置实现 offsetX
			let elem = (event.nativeEvent as TouchEvent).target as HTMLDivElement;
			leftBarDragX = (event.nativeEvent as TouchEvent).touches[0].pageX - elem.getBoundingClientRect().left;
		}
		let moveListener = (ev: MouseEvent | TouchEvent) => {
			let pageX = (ev as MouseEvent).pageX || (ev as TouchEvent).touches[0].pageX;	// 当前位置在窗口内的 X
			this.setState({
				width: pageX - leftBarDragX + 16,
			});
		};
		let upListener = (ev: MouseEvent | TouchEvent) => {
			这.setState({
				dragging: false,
			});
			document.body.removeEventListener('mousemove', moveListener);
			document.body.removeEventListener('mouseup', upListener);
			document.body.removeEventListener('touchmove', moveListener);
			document.body.removeEventListener('touchend', upListener);
		}
		document.body.addEventListener('mousemove', moveListener);
		document.body.addEventListener('mouseup', upListener);
		document.body.addEventListener('touchmove', moveListener);
		document.body.addEventListener('touchend', upListener);
	}

	render() {
		return (
			<div className="course-menu" style={{ width: this.props.courseIndex ? `${this.state.width}px` : `100%`, boxShadow: this.props.courseIndex ? '0 0 8px hsla(0, 0%, 20%, 0.25)' : 'unset', transition: this.props.courseIndex && !this.state.dragging ? 'width cubic-bezier(0.1, 0.3, 0.2, 1.0) 0.5s' : 'unset' }}>
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
							<div className="chapter" key={chapterIndex}>
								<div className="bar" onClick={this.onChapterClick.bind(this, chapterIndex)}>
									<div className="title" style={{ fontSize: this.props.courseIndex ? '20px' : '' }}>{chapter.title}</div>
									<div className="blueline" style={{ width: this.state.selectedChapter === chapterIndex ? '100%' : '0' }}></div>
									{/* @ts-ignore */}
									<svg className="triangle" t="1619515982364" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3204" width="128" height="128"><path d="M781.790276 554.042745c25.5968-22.013248 25.5968-58.360705 3.583552-83.957506L317.464317 16.509936c-25.5968-22.013248-61.944257-22.013248-83.957505 0-22.013248 22.013248-22.013248 58.360705 0 80.373954l424.39495 416.71591-427.978502 413.132358c-22.013248 22.013248-22.013248 58.360705 0 80.373954 25.5968 22.013248 61.944257 22.013248 83.957505 0l467.909511-453.063367z" fill="" p-id="3205"></path></svg>
								</div>
								<div className="content" style={{ height: this.state.selectedChapter === chapterIndex ? 'unset' : '0' }}>
									{chapter.sections.map((section, sectionIndex) => {
										return (
											<div className="section" key={sectionIndex} onClick={this.onSectionClick.bind(this, chapterIndex, sectionIndex)}>
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
				{this.props.courseIndex && (
					<div className="dragger" onMouseDown={this.onRightBarDragStart.bind(this)} onTouchStart={this.onRightBarDragStart.bind(this)}>
						<div className="draggerimg"></div>
					</div>
				)}
			</div>
		);
	}
}

export default CourseMenu;
