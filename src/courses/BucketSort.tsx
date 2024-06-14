import { BasicType,Variable } from "../types/types";
import { BaseCourse, BaseCourseProps } from "./BaseCourse";
import './BaseCourse.scss';
import './BucketSort.scss';

const baseCode = `\
void main() {
    int ball[7];
    int bucket[16];
    int i;
    int z; // 用 于 输 出 
    int value;
    ball[0] = 1; ball[1] = 4; ball[2] = 5; ball[3] = 2; ball[4] = 6; ball[5] = 7; ball[6] = 3;

    // 1. 排 序
    i = 0;
    while (i <= 6)
    {
        // 将 所 有 球 放 到 对 应 序 号 的 盒 子 里 去
        value = ball[i];
        bucket[value] = value;
        i = i + 1;
    }

    // 2. 输 出
    z = 0;
    while (z <= 15)
    {
        if (bucket[z] != 0)
        {
            print2Buffer(bucket[z]);
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
					name: 'bucket',
					type: {
						basic: BasicType.integer,
						length: [16],
					},
					value: [-1, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
				},
				{
					name: 'ball',
					type: {
						basic: BasicType.integer,
						length: [7],
					},
					value: [1, 4, 5, 2, 6, 7, 3],
				},
				{
					name: 'i',
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
*/

interface State {}

class BucketSort extends BaseCourse<BaseCourseProps, State> {
	constructor(props: (BaseCourseProps) | Readonly<BaseCourseProps>) {
		super(props);
		this.state = {}
	}
	getBaseCode() {
		return baseCode;
	}
	render () {
		let display1: React.CElement<{}, React.Component<{}, any, any>>;
		// ProgramNode 检查
		if (this.props.programNode) {
			let mainFunc = this.props.programNode.functionList.find((functionList) => functionList.name === 'main');
			let bucket, bucketTypeIsValid = false;
			let ball, ballTypeIsValid = false;
			let i: Variable | undefined, iTypeIsValid = false;
			let z: Variable | undefined, zTypeIsValid = false;
			let value: Variable | undefined, valueTypeIsValid = false;
			if (mainFunc) {
				bucket = mainFunc.variableList.find((variableList) => variableList.name === 'bucket');
				if (bucket?.type.basic === BasicType.integer && bucket.type.length?.length === 1) {
					bucketTypeIsValid = true;
				}
				ball = mainFunc.variableList.find((variableList) => variableList.name === 'ball');
				if (ball?.type.basic === BasicType.integer && ball.type.length?.length === 1) {
					ballTypeIsValid = true;
				}
				i = mainFunc.variableList.find((variableList) => variableList.name === 'i');
				if (i?.type.basic === BasicType.integer && !i.type.length) {
					iTypeIsValid = true;
				}
				z = mainFunc.variableList.find((variableList) => variableList.name === 'z');
				if (z?.type.basic === BasicType.integer && !z.type.length) {
					zTypeIsValid = true;
				}
				value = mainFunc.variableList.find((variableList) => variableList.name === 'value');
				if (value?.type.basic === BasicType.integer && !value.type.length) {
					valueTypeIsValid = true;
				}
			}
			// main 函数检查
			if (mainFunc) {
				// 变量是否存在检查
				if (bucket && ball) {
					// 变量类型是否正确检查
					if (!bucketTypeIsValid) {
						display1 = <p>变量 bucket 的类型不对，应是 1 维 int 数组，请修改</p>;
					} else if (!ballTypeIsValid) {
						display1 = <p>变量 ball 的类型不对，应是 1 维 int 数组，请修改</p>;
					} else {
						let bucketArr = bucket.value as Array<number>;
						let ballArr = ball.value as Array<number>;
						let textDiv;
						if (zTypeIsValid && z?.value !== undefined) {
							textDiv = <span>正在输出：序号 {z.value}</span>
						} else if (iTypeIsValid) {
							textDiv = <span>第 {i?.value + 1} 次循环，把序号为 {i?.value} 的球放入序号为 {i?.value} 的格子里</span>;
						} else {
							textDiv = <span>i 用作取第 i 个球，z 用作输出序号，请在代码编辑器修正变量名</span>
						}
						display1 = (
							<>
								{textDiv}
								{bucketArr.map((number, index) => {
									return (
										<div className="bucket" style={{ left: `${index * 48 + 24}px` }}>{index}</div>
									);
								})}
								{ballArr.map((number, index) => {
									let correspondingElement = bucketArr[number];
									let position, flash;
									if (correspondingElement && correspondingElement === number) {
										position = {
											left: `${number * 48 + 24}px`,
											top: '128px',
										};
									}
									if (valueTypeIsValid && value?.value === number) {
										flash = {
											animation: 'flashing1-1-1 0.5s ease-in 0s infinite alternate'
										}
									}
									return (
										<div className="ball" style={{ backgroundColor: `hsla(${number * 30}deg, 70%, 50%)`, left: `${index * 48 + 24}px`, ...position, ...flash }}>{number}</div>
									);
								})}
							</>
						)
					}
				} else if (!bucket) {
					display1 = <p>缺少变量 bucket，请在代码编辑器补充</p>;
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
					<h2>2.1 最快最简单的排序——桶排序</h2>
					<p>说到“算法”，大家脑海中浮现出来的第一画面是什么呢？</p>
					<p>相信大多数人，第一时间想到的，便是排序。因为它跟我们的生活实在是太贴近了——大家在操场站队的时候会按照身高排序，考试的名次会按照分数排序，网上购物的时候会按照价格排序，电子邮箱中的邮件往往按照时间排序……这样的事例实在数不胜数，可以说排序无处不在。</p>
					<p>我们先从最简单的桶排序出发～</p>
					<img src="./BucketSort/桌球_放大_裁剪.webp" alt="桌球" />
					<p>如图所示，这是一套桌球。它分为全色和花色。当然，咱不拿这套桌球打游戏，咱把它按顺序收起来。</p>
					<p>有人说，这 16 个球太多了，看得我眼花缭乱的～那行，咱取 7 个全色球，但装球的桶还得是 16 个格子。</p>
					<p>我们定义桶为 int bucket[16]，7 个球是 int ball[7]，然后分别给这 7 个球写上随机数，比如说，[1, 4, 5, 2, 6, 7, 3]。</p>
					<div className="display display1-1-1">
						{display1}
					</div>
					<p>接下来的方案就十分简单了，将每个球放进对应序号的格子就行了，不妨在右侧运行试试？上面的图形演示区会马上看到效果。</p>
					<p>在循环中，<pre>value = array[i]</pre>用于取出球的号码。<pre>bucket[value] = value</pre>用于将桶中对应序号的数字置为球的号码，即相当于把球放进去。最后，从左到右输出除了 0 以外的数值，便是排序后的结果了。</p>
					<p>同理，如果我们要把更多的物体进行排序，只需要保证桶的数量大于等于物体就可以了。</p>
					<p>我们可以看到，这是一个非常快的排序算法，只需要将所有数据遍历 2 遍就行了，第一遍将数据放入“桶”中，第二遍按顺序输出桶的内容，因此时间复杂度是<pre>O(n)</pre>。</p>
					<p>桶排序从 1956 年就开始被使用了。该算法的基本思想是由 E.J.Issac 和 R.C.Singleton 提出来的。但其实这只是一个简化版的桶排序，并不是真正的桶排序算法，真正的桶排序算法要比这个更加复杂。</p>
					<p>为什么这么说呢？不知道你有没有发现，这种排序算法只能解决较小整数的排序，但对于小数或者特别大的数字，这种算法就没辙了。比如说，有 [1, 3, 1.5] 三个数据，要把它进行排序。你或许一眼就知道该怎么做了，既然 1.5 比 1 大，比 3 小，那就把它插到这两者之间呗。没错，这便是下一节要讲到的算法——插入排序。</p>
				</article>
			</div>
		)
	}
}

export default BucketSort;