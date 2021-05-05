import { CourseIndex, ChapterInfo, CourseInfo } from '../types/types';
import BucketSort from './BucketSort';
import React from 'react';

const courseMenu: Array<ChapterInfo> = [
	{
		title: '第一章　排序',
		sections: [
			{
				title: '1.1 桶排序',
				course: BucketSort,
			},
			{
				title: '1.2 桶排序',
				course: BucketSort,
			},
		]
	},
	{
		title: '第二章　排序',
		sections: [
			{
				title: '2.1 桶排序',
				course: BucketSort,
			},
			{
				title: '2.2 桶排序',
				course: BucketSort,
			},
		]
	},
];

/**
 * 根据课程 index 初始化课程对象，返回一个可直接在 JSX 使用的 React.CElement
 * 请不要反复调用，因为每调用一次它就初始化一次
 */
export function getCourseElemByChapterIndex<P extends {}, T extends React.Component<P, React.ComponentState>>(chapterIntex?: CourseIndex, props?: React.ClassAttributes<T> & P | null): React.CElement<{}, React.Component<{}, any, any>> {
	let SelectedCourse: React.ComponentClass<any, any>;
	SelectedCourse = 'div' as unknown as React.ComponentClass<{}, any>;
	if (chapterIntex) {
		let section = getCourseByChapterIndex(chapterIntex);
		if (section) {
			SelectedCourse = section.course;
		}
	}
	return React.createElement(SelectedCourse, props);
}

/**
 * 根据课程 index 获取课程信息
 */
export function getCourseByChapterIndex(chapterIntex: CourseIndex): CourseInfo | null {
	if (chapterIntex) {
		let chapter = courseMenu[chapterIntex.chapter];
		if (chapter) {
			return chapter.sections[chapterIntex.section];
		}
	}
	return null;
}

export function getCourseMenu(): Array<ChapterInfo> {
	return courseMenu;
}