import { CourseIndex, ChapterInfo } from '../types/types';
import BucketSort from '../courses/BucketSort';
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

export function getCourseElemByChapterIndex<P extends {}, T extends React.Component<P, React.ComponentState>>(chapterIntex?: CourseIndex, props?: React.ClassAttributes<T> & P | null): React.CElement<{}, React.Component<{}, any, any>> {
	let SelectedCourse: React.ComponentClass<any, any>;
	SelectedCourse = 'div' as unknown as React.ComponentClass<{}, any>;
	if (chapterIntex) {
		let chapter = courseMenu[chapterIntex.chapter];
		if (chapter) {
			let section = chapter.sections[chapterIntex.section];
			if (section) {
				SelectedCourse = section.course;
			}
		}
	}
	return React.createElement(SelectedCourse, props);
}

export function getCourseMenu(): Array<ChapterInfo> {
	return courseMenu;
}