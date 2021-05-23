import { BasicType, ProgramNode, Variable } from "../types/types";
import { BaseCourse, BaseCourseProps } from "./BaseCourse";
import './BaseCourse.scss';
import './InsertSort.scss';

const baseCode = `\
void main() {
    int ball[7];
    int box[7];
    int i; int j; int pos;
    int value;
    ball[0] = 52; ball[1] = 79; ball[2] = 24; ball[3] = 7; ball[4] = 13; ball[5] = 97; ball[6] = 47;

    // 1. 排 序
    i = 0;
    while (i <= 6)
    {
        // 一 层 循 环 ： 拿 起  ball[i]
        value = ball[i];
        while (j <= 6)
        {
            // 二 层 循 环 ： 与 盒 中 的 所 有 球 逐 一 比 较 ， 直 到 发 现 比 自 己 大 的 或 者 比 较 到 末 尾
            if (box[j] <= value || j > i)
            {
                // 将 后 面 的 所 有 球 都 后 移 一 位 ， 腾 出 空 间 
                pos = j;
                while (j <= i)
                {
                    box[j + 1] = box[j];
                    j = j + 1;
                }
                box[j] = value;
            }
            j = j + 1;
        }
        box[value] = value;
        i = i + 1;
    }

    // 2. 输 出
    i = 0;
    while (i <= 6)
    {
        if (box[i] != -1)
        {
            print(box[i]);
        }
        i = i + 1;
    }
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
					name: 'box',
					type: {
						basic: BasicType.integer,
						length: [7],
					},
					value: [52, -1, -1, -1, -1, -1, -1],
				},
				{
					name: 'ball',
					type: {
						basic: BasicType.integer,
						length: [7],
					},
					value: [52, 79, 24, 7, 13, 97, 47],
				},
				{
					name: 'i',
					type: {
						basic: BasicType.integer
					},
					value: 1,
				},
				{
					name: 'j',
					type: {
						basic: BasicType.integer
					},
					value: 1,
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
		let box, boxTypeIsValid = false;
		let ball, ballTypeIsValid = false;
		let i: Variable | undefined, iTypeIsValid = false;
		let j: Variable | undefined, jTypeIsValid = false;
		if (mainFunc) {
			box = mainFunc.variableList.find((variableList) => variableList.name === 'box');
			if (box?.type.basic === BasicType.integer && box.type.length?.length === 1) {
				boxTypeIsValid = true;
			}
			ball = mainFunc.variableList.find((variableList) => variableList.name === 'ball');
			if (ball?.type.basic === BasicType.integer && ball.type.length?.length === 1) {
				ballTypeIsValid = true;
			}
			i = mainFunc.variableList.find((variableList) => variableList.name === 'i');
			if (i?.type.basic === BasicType.integer && !i.type.length) {
				iTypeIsValid = true;
			}
			j = mainFunc.variableList.find((variableList) => variableList.name === 'j');
			if (j?.type.basic === BasicType.integer && !j.type.length) {
				jTypeIsValid = true;
			}
		}
		let display1: React.CElement<{}, React.Component<{}, any, any>>;
		// ProgramNode 检查
		if (testProgramNode) {
			// main 函数检查
			if (mainFunc) {
				// 变量是否存在检查
				if (box && ball) {
					// 变量类型是否正确检查
					if (!boxTypeIsValid) {
						display1 = <p>变量 box 的类型不对，应是 1 维 int 数组，请修改</p>;
					} else if (!ballTypeIsValid) {
						display1 = <p>变量 ball 的类型不对，应是 1 维 int 数组，请修改</p>;
					} else {
						let boxArr = box.value as Array<number>;
						let ballArr = ball.value as Array<number>;
						display1 = (
							<>
								{iTypeIsValid && jTypeIsValid ? (
									<span>第 {i?.value} 次循环，把数字为 {ballArr[i?.value]} 的球与盒子里 {j?.value} 号位置比较</span>
								) : (
									<span>图形演示区</span>
								)}
								{boxArr.map((number, index) => {
									let appendColor;
									console.log('valid?');
									if (jTypeIsValid && j?.value === index) {
										appendColor = {
											border: 'hsla(15deg, 100%, 50%, 0.3) 1.5px dashed',
											backgroundColor: 'hsla(15deg, 100%, 50%, 0.15)',
										};
									}
									return (
										<div className="box" style={{ left: `${index * 48 + 24}px`, ...appendColor }}>{index}</div>
									);
								})}
								{ballArr.map((number, index) => {
									let posInBox = boxArr.findIndex((value) => value === number);
									let position;
									if (posInBox >= 0) {
										position = {
											left: `${posInBox * 48 + 24}px`,
											top: '128px',
										};
									}
									return (
										<div className="ball" style={{ backgroundColor: `hsla(${number * 3.6}deg, 70%, 50%)`, left: `${index * 48 + 24}px`, ...position }}>{number}</div>
									);
								})}
							</>
						)
					}
				} else if (!box) {
					display1 = <p>缺少变量 box，请在代码编辑器补充</p>;
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
					<p>快速排序是最符合直觉的一种排序方法。</p>
					<p>没错，咱用的还是上一节中的桌球。不过咱稍微加一点难度，把 7 个球上的数字都改一下。比如说：[52, 79, 24, 7, 13, 97, 47]。</p>
					<p>虽然你一眼就看出来这是 100 以内的数了，但电脑可不像你能这样看，还是得一个一个读取的～所以咱先从第一个球开始，把它拿出来，放到盒子的最左边。</p>
					<p>或许你会说，为什么不把它放到中间呀？记住咯，这可不是桶排序，电脑一开始是不知道数字有多大，有多少个数字的。因此咱把它放到最左边。</p>
					<p>下一步便是取第二个数字了。跟盒子里的数字从左到右逐个比对一下，如果发现盒子里的球比手上的球大了，或者盒子里所有球都没你手上的那么大，就把它放下。</p>
					<p>在下面的图形演示区实验一下吧～</p>
					<div className="display display1-2-1">
						{display1}
					</div>
					<p>在这个算法中，一共涉及到了 2 层循环。第一层循环用于在待排序区取球，第二层循环用于在已排好序的球中找到合适的插入位置，并在适当的位置，把后面的球都向后挪一下，以方便把球插进去～</p>
					<p>显然，这个算法的时间复杂度是 O(n²)，因为有两层循环，每层循环都需要完整地遍历元素。如果关注空间复杂度的话，那么它的空间复杂度是 O(n)，因为一共需要两份空间去存储这些球。大家不妨想一下，有没有方法可以实现只需要 n+1 个空间就能进行插入排序？</p>
				</article>
			</div>
		)
	}
}

export default InsertSort;