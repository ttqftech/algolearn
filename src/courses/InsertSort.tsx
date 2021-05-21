import { BasicType, ProgramNode } from "../types/types";
import { BaseCourse, BaseCourseProps } from "./BaseCourse";
import './BaseCourse.scss';
import './BucketSort.scss';

const baseCode = `\

}
`

const testProgramNode: ProgramNode = {
	functionList: [
		{
			returnType: {
				basic: BasicType.void,	
			},
			name: 'main',
			parameterList: [],
			variableList: [
				{
					name: 'drawer',
					type: {
						basic: BasicType.integer,
						length: [7],
					},
					value: [-1, -1, -1, -1, -1, -1, -1],
				},
				{
					name: 'ball',
					type: {
						basic: BasicType.integer,
						length: [7],
					},
					value: [1, 4, 5, 2, 6, 7, 3],
				},
			],
			syntaxNode: null as any
		}
	],
	variableList: [],
	syntaxNode: null as any,
}

interface State {}

class InsertSort extends BaseCourse<BaseCourseProps, State> {
	constructor(props: (BaseCourseProps) | Readonly<BaseCourseProps>) {
		super(props);
		this.state = {}
	}
	getBaseCode() {
		return baseCode;
	}
	render () {
		let mainFunc = testProgramNode.functionList.find((functionList) => functionList.name === 'main');
		let drawer, drawerTypeIsValid = false;
		let ball, ballTypeIsValid = false;
		if (mainFunc) {
			drawer = mainFunc.variableList.find((variableList) => variableList.name === 'drawer');
			if (drawer?.type.basic === BasicType.integer && drawer.type.length?.length === 1) {
				drawerTypeIsValid = true;
			}
			ball = mainFunc.variableList.find((variableList) => variableList.name === 'ball');
			if (ball?.type.basic === BasicType.integer && ball.type.length?.length === 1) {
				ballTypeIsValid = true;
			}
		}
		let display1: React.CElement<{}, React.Component<{}, any, any>>;
		// ProgramNode 检查
		if (testProgramNode) {
			// main 函数检查
			if (mainFunc) {
				// 变量是否存在检查
				if (drawer && ball) {
					// 变量类型是否正确检查
					if (!drawerTypeIsValid) {
						display1 = <p>变量 drawer 的类型不对，应是 1 维 int 数组，请修改</p>;
					} else if (!ballTypeIsValid) {
						display1 = <p>变量 ball 的类型不对，应是 1 维 int 数组，请修改</p>;
					} else {
						let drawerArr = drawer.value as Array<number>;
						let ballArr = ball.value as Array<number>;
						display1 = (
							<>
								<span>图形演示区</span>
								{drawerArr.map((number, index) => {
									return (
										<div className="drawer" style={{ left: `${index * 48 + 24}px` }}>{index}</div>
									);
								})}
								{ballArr.map((number, index) => {
									let correspondingElement = drawerArr[number];
									let position;
									if (correspondingElement && correspondingElement === number) {
										position = {
											left: `${number * 48 + 24}px`,
											top: '128px',
										};
									}
									return (
										<div className="ball" style={{ backgroundColor: `hsla(${number * 30}deg, 70%, 50%)`, left: `${index * 48 + 24}px`, ...position }}>{number}</div>
									);
								})}
							</>
						)
					}
				} else if (!drawer) {
					display1 = <p>缺少变量 drawer，请在代码编辑器补充</p>;
				} else {
					display1 = <p>缺少变量 ball，请在代码编辑器补充</p>;
				}
			} else {
				display1 = <p>缺少 main 函数，请在代码编辑器补充</p>;
			}
		} else {
			display1 = <p>动态内容加载失败</p>;
		}
		return (
			<div className="article-wrapper">
				<article>
					<h2>1.2 最常用的排序算法——插入排序</h2>
				</article>
			</div>
		)
	}
}

export default InsertSort;