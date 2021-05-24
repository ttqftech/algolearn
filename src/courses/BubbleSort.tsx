import { BasicType, Variable } from "../types/types";
import { BaseCourse, BaseCourseProps } from "./BaseCourse";
import './BaseCourse.scss';
import './BubbleSort.scss';

const baseCode = `\
void main() {
    int ball[7];
    int i; int j;
    int z; // 用 于 输 出 
    int temp;
    ball[0] = 6; ball[1] = 4; ball[2] = 3; ball[3] = 5; ball[4] = 7; ball[5] = 1; ball[6] = 2;

    // 1. 排 序
    i = 1;
    while (i <= 6)
    {
        // i 指 示 冒 泡 的 终 点
        // 因 为 冒 泡 机 制 使 得 最 小 的 元 素 会 一 路 连 续 冒 到 最 左 边
        // 因 此 小 于  i 的 元 素 都 已 经 排 好 序 了
        j = 6;
        while (j >= i)
        {
            // 如 果 右 边 的 球 比 左 边 更 小 ， 那 么 交 换
            if (ball[j] < ball[j - 1])
            {
                temp = ball[j];
                ball[j] = ball[j - 1];
                ball[j - 1] = temp;
            }
            // 要 让 更 小 的 元 素 往 左 冒 ， 就 要 让 冒 泡 从 右 出 发 向 左 进 行
            j = j - 1;
        }
        i = i + 1;
    }

    // 2. 输 出
    z = 0;
    while (z <= 6)
    {
        if (ball[z] != -1)
        {
            print2Buffer(ball[z]);
        }
        z = z + 1;
    }
    alert();
}
`
/*
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
					name: 'ball',
					type: {
						basic: BasicType.integer,
						length: [7],
					},
					value: [6, 4, 3, 5, 7, 2, 1],
				},
				{
					name: 'i',
					type: {
						basic: BasicType.integer
					},
					value: 0,
				},
				{
					name: 'j',
					type: {
						basic: BasicType.integer
					},
					value: 6,
				},
				{
					name: 'temp',
					type: {
						basic: BasicType.integer
					},
					value: 2,
				},
			],
			syntaxNode: null as any
		}
	],
	variableList: [],
	syntaxNode: null as any,
}
*/

interface State {
	initialBall: Array<number>;
}

class BubbleSort extends BaseCourse<BaseCourseProps, State> {
	constructor(props: (BaseCourseProps) | Readonly<BaseCourseProps>) {
		super(props);
		this.state = {
			initialBall: [6, 4, 3, 5, 7, 2, 1],
		}
	}
	getBaseCode() {
		return baseCode;
	}
	render () {
		let display1: React.CElement<{}, React.Component<{}, any, any>>;
		// ProgramNode 检查
		if (this.props.programNode) {
			let mainFunc = this.props.programNode.functionList.find((functionList) => functionList.name === 'main');
			let ball, ballTypeIsValid = false;
			let i: Variable | undefined, iTypeIsValid = false;
			let j: Variable | undefined, jTypeIsValid = false;
			let z: Variable | undefined, zTypeIsValid = false;
			let temp: Variable | undefined, tempTypeIsValid = false;
			if (mainFunc) {
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
				z = mainFunc.variableList.find((variableList) => variableList.name === 'z');
				if (z?.type.basic === BasicType.integer && !z.type.length) {
					zTypeIsValid = true;
				}
				temp = mainFunc.variableList.find((variableList) => variableList.name === 'temp');
				if (temp?.type.basic === BasicType.integer && !temp.type.length) {
					tempTypeIsValid = true;
				}
			}
			// main 函数检查
			if (mainFunc) {
				// 变量是否存在检查
				if (ball && temp) {
					// 变量类型是否正确检查
					if (!ballTypeIsValid) {
						display1 = <p>变量 ball 的类型不对，应是 1 维 int 数组，请修改</p>;
					} else if (!tempTypeIsValid) {
						display1 = <p>变量 temp 的类型不对，应是 int，请修改</p>;
					} else {
						let ballArr = ball.value as Array<number>;
						let textDiv;
						if (zTypeIsValid && z?.value !== undefined) {
							textDiv = <span>正在输出：序号 {z.value}</span>
						} else if (iTypeIsValid && jTypeIsValid) {
							textDiv = <span>第 {i?.value} 次循环，把序号为 {j?.value} 的方块与序号为 {j?.value - 1} 的方块比较，直到序号 {i?.value} 结束</span>;
						} else {
							textDiv = <span>i 指示冒泡的终点，z 用作输出序号，请在代码编辑器修正变量名</span>
						}
						console.log('dis');
						display1 = (
							<>
								{textDiv}
								{temp.value && (
									<>
										<div className="ball" style={{ top: '20px', left: '24px', backgroundColor: `hsla(${temp.value * 30}deg, 70%, 50%)` }}>{temp.value}</div>
										<div className="temp">临时值</div>
									</>
								)}
								{this.state.initialBall.map((number, index) => {
									let position = ballArr.findIndex((ball) => ball === number);
									if (position >= 0) {
										return (
											<div className="ball" style={{ left: `${position * 48 + 24}px`, backgroundColor: `hsla(${number * 30}deg, 70%, 50%)` }}>{number}</div>
										);
									} else {
										return null;
									}
								})}
								{j?.value ? <div className="pointerJ" style={{ left: `${j?.value * 48 + 24 + 10}px` }}></div> : null}
								{j?.value ? <div className="pointerJ" style={{ left: `${j?.value * 48 - 24 + 10}px` }}></div> : null}
								{i?.value ? <div className="pointerI" style={{ left: `${i?.value * 48 - 24 + 6}px` }}></div> : null}
							</>
						)
					}
				} else if (!ball) {
					display1 = <p>缺少变量 ball，请在代码编辑器补充</p>;
				} else {
					display1 = <p>缺少变量 temp，请在代码编辑器补充</p>;
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
					<h2>1.3 消消乐排序？冒泡排序！</h2>
					<p>接下来介绍一种不需要额外空间的排序方法——冒泡排序！</p>
					<p>如果大家有玩过“消消乐”的游戏的话，对这种排序方式应该就会倍感亲切。</p>
					<img src="./BubbleSort/消消乐_裁剪.png" alt="消消乐游戏" />
					<p>这款游戏的玩法是：将三个颜色相同的方块连续地排成一条直线，便可得分。移动方块的方法是将两个相邻的方块交换。</p>
					<p>现在我们来改一下规则，方块只有一行，我们给它标上数字。我们的目标是让它们按顺序排列，而不是把它们连在一起消除，并且每个方块都允许连续移动。</p>
					<img src="./BubbleSort/消消乐_裁剪_单行.png" alt="消消乐游戏_单行" />
					<p>从哪边开始往哪边冒泡比较好呢？我们思考，最终的目的是为了把最小的放到左边，而冒泡机制允许一个数字连续移动，因此我们应该从右边出发，往左移动，把元素一路往左边移动。</p>
					<p>亲自试验一下吧～</p>
					<div className="display display1-3-1">
						{display1}
					</div>
					<p>因为同样是使用了两层循环，第一层循环遍历了整个数组，第二层循环平均遍历了半个数组，因此时间复杂度依然是 O(n²)</p>
					<p>这种方式其实在现实中也非常常用。想一下你在学校集合排队的时候，老师要按身高让调整学生的站队顺序，便是把那个站得不对的同学一路向前或者向后交换。只不过，老师可以一眼就看过去谁站得不对，但对于电脑来说，一般就只按一个方向调整，这样比较方便。</p>
					<p>在下一节——快速排序中，我们要面临的同样是现实中的按身高排队问题。不过，我们拥有一个大操场，那可就比冒泡排序的速度快多了。</p>
				</article>
			</div>
		)
	}
}

export default BubbleSort;