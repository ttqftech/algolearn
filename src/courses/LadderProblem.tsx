import { BasicType,Variable } from "../types/types";
import { BaseCourse, BaseCourseProps } from "./BaseCourse";
import './BaseCourse.scss';
import './LadderProblem.scss';

const baseCode = `\
void main() {
    int solve[10];  // 每 级 阶 梯 有 多 少 种 方 法 
    int i;
    solve[0] = 1;
    solve[1] = 2;

    // 1. 计 算 
    i = 2;
    while (i < 10)
    {
        // 每 级 阶 梯 的 方 法 数 是 前 两 级 阶 梯 的 方 法 数 的 总 和 
        solve[i] = solve[i - 1] + solve[i - 2];
        i = i + 1;
    }

    // 2. 输 出
    print2Buffer(solve[9]);
    alert();
}
`

interface State {}

class LadderProblem extends BaseCourse<BaseCourseProps, State> {
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
			let solve, solveTypeIsValid = false;
			let i: Variable | undefined, iTypeIsValid = false;
			if (mainFunc) {
				solve = mainFunc.variableList.find((variableList) => variableList.name === 'solve');
				if (solve?.type.basic === BasicType.integer && solve.type.length?.length === 1) {
					solveTypeIsValid = true;
				}
				i = mainFunc.variableList.find((variableList) => variableList.name === 'i');
				if (i?.type.basic === BasicType.integer && !i.type.length) {
					iTypeIsValid = true;
				}
			}
			// main 函数检查
			if (mainFunc) {
				// 变量是否存在检查
				if (solve && i) {
					// 变量类型是否正确检查
					if (!solveTypeIsValid) {
						display1 = <p>变量 solve 的类型不对，应是 1 维 int 数组，请修改</p>;
					} else {
						let solveArr = solve.value as Array<number>;
						let textDiv;
						if (iTypeIsValid) {
							textDiv = <span>计算上第 {i.value + 1} 级阶梯的总方法<br />等于上第 {i.value} 级阶梯的总方法 +  {i.value - 1} 级阶梯的总方法</span>;
						} else {
							textDiv = <span>i 指示现在正在计算的序号，请在代码编辑器修正变量名</span>
						}
						display1 = (
							<>
								{textDiv}
								<div className="buckets">
									{solveArr.map((value, index) => {
										let appendColor;
										if (i?.value === index) {
											appendColor = {
												border: 'hsla(15deg, 100%, 50%, 0.3) 1.5px dashed',
												backgroundColor: 'hsla(15deg, 100%, 50%, 0.15)',
											};
										} else if (i?.value === index + 1 || i?.value === index + 2) {
											appendColor = {
												border: 'hsla(210deg, 100%, 50%, 0.3) 1.5px dashed',
												backgroundColor: 'hsla(210deg, 100%, 50%, 0.15)',
											};
										}
										return <div className="bucket" style={{ ...appendColor }}>{value || '-'}</div>;
									})}
								</div>
							</>
						)
					}
				} else if (!solve) {
					display1 = <p>缺少变量 solve，请在代码编辑器补充</p>;
				} else {
					display1 = <p>缺少变量 i，请在代码编辑器补充</p>;
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
					<h2>3.1 动态规划——迈 2 阶还是 1 阶？上阶梯问题</h2>
					<p>这章我们来介绍“动态规划算法”。</p>
					<p>“动态规划”这个名字可能一开始有点不太好理解。我给您换个说法：“缓存算法”。</p>
					<p>怎么理解它呢？我们可以认为，<span style={{ color: '#BB0000' }}>使用动态规划的算法，后面的解取决于前面的解。也就是说，只要给出前面的解，后面的解可以由前面的解<strong>递推</strong>出来。</span></p>
					<p>也就是说，可以使用数组来<strong>缓存</strong>之前计算的结果，一路<strong>递推</strong>出所需答案。</p>
					<p>比如前面提到的“凑钱问题”，便可以使用动态规划来解决。计算凑 256 元可以使用什么样的组合，相当于计算使用 1 张 1 元 + 剩余的 255 元可以使用什么样的组合，也相当于计算使用 1 张 5 元 + 剩余的 251 元可以使用什么样的组合……</p>
					<p>上面提到的“凑钱问题”听起来就有点复杂，实际上确实稍微复杂了些，需要使用到二维数组。咱们先举个简单的例子——上阶梯问题</p>
					<p>假设一共有 n = 10 级阶梯，每次上阶梯只能走 1 阶或者 2 阶，问有多少种上阶梯的方法？</p>
					<p>这道题可以使用穷举的方法解决，即从<pre>[1, 1, 1, 1, 1, 1, 1, 1, 1, 1]</pre>出发，然后<pre>[1, 1, 1, 1, 1, 1, 1, 1, 2]</pre>……这样算可以算到最终的结果，但速度太慢了。下面就来介绍本题的动态规划解法。</p>
					<img src="./LadderProblem/ladder.png" alt="阶梯" />
					<p>首先设本题解为 f(n)，也就是上 n 级阶梯的方法数量。</p>
					<p>我们发现，如果最后迈的阶级是 1 阶，那么在迈此级阶梯之前，一共有 f(n-1) 种方法。</p>
					<p>　　　　　如果最后迈的阶级是 2 阶，那么在迈此级阶梯之前，一共有 f(n-2) 种方法。</p>
					<p>那么最后一迈可以是这两种方法之中的一种，这两种方法加起来，便是最后一迈的方法数。因此，<pre>f(n) = f(n-1) + f(n-2)</pre></p>
					<p>熟悉吗？没错，这便是著名的斐波那契数列。我们先行给出<pre>f(1) = 1</pre>，<pre>f(2) = 2</pre>，后面的数字便可一路递推下去。</p>
					<div className="display display3-1-1">
						{display1}
					</div>
					<p>可以看到，这个算法非常简单，简单到难以使用图形演示数字背后的意义（会非常庞大）。但解决问题的关键和难点是找到数据中的推导关系，也就是状态转移方程。在本题中，该方程为<pre>f(n) = f(n-1) + f(n-2)</pre>。同时还要找到方程的一些初始解，在本题中为<pre>f(1) = 1</pre>，<pre>f(2) = 2</pre>。一旦找到这两个关系，后面要做的事情便不会太复杂。</p>
					<p>在未来的课程中，将会讲述更多可使用动态规划解决的算法问题。</p>
				</article>
			</div>
		)
	}
}

export default LadderProblem;