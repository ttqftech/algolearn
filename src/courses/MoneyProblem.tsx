import { BasicType,Variable } from "../types/types";
import { BaseCourse, BaseCourseProps } from "./BaseCourse";
import './BaseCourse.scss';
import './MoneyProblem.scss';

const baseCode = `\
void main() {
    int count[6];   // 每 种 币 值 的 纸 币 的 剩 余 量 
    int usage[6];   // 每 种 币 值 的 纸 币 的 使 用 量 
    int value[6];   // 每 种 币 值 的 纸 币 的 价 值 
    int selected;   // 已 选 择 的 纸 币 的 序 号
    int total;      // 当 前 已 凑 钱 总 量 
    int errorFlag;  // 如 果 凑 不 成 ， 那 么 错 误
    int z;          // 用 于 输 出 
    count[0] = 3; count[1] = 3; count[2] = 3; count[3] = 3; count[4] = 3; count[5] = 3; // 需 要 保 证 钱 的 总 额 足 够 
    value[0] = 100; value[1] = 50; value[2] = 20; value[3] = 10; value[4] = 5; value[5] = 1;
    total = 0;

    // 1. 计 算 
    errorFlag = 0;
    while (total < 256)
    {
        // 选 择 可 用 的 最 大 面 值 的 纸 币 
        selected = 0;
        // 如 果 两 个 条 件 满 足 其 中 一 个 ， 那 么 选 面 值 更 小 的 一 张 
        // 1. 这 个 面 值 没 有 了 
        // 2. 选 这 张 则 加 起 来 超 过 需 要 的 总 额 
        while (count[selected] < 0 || total + value[selected] > 256)
        {
            selected = selected + 1;
        }
        if (selected > 5)
        {
            errorFlag = 1;
        }
        else
        {
            usage[selected] = usage[selected] + 1;
            count[selected] = count[selected] - 1;
            total = total + value[selected];
        }
    }

    // 2. 输 出
    if (errorFlag == 0)
    {
        z = 0;
        while (z < 6)
        {
            print2Buffer(usage[z]);
            z = z + 1;
        }
    }
    else
    {
        print2Buffer(0);
    }
    alert();
}
`

interface State {}

class MoneyProblem extends BaseCourse<BaseCourseProps, State> {
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
			let count, countTypeIsValid = false;
			let usage, usageTypeIsValid = false;
			let value, valueTypeIsValid = false;
			let selected: Variable | undefined, selectedTypeIsValid = false;
			let total: Variable | undefined, totalTypeIsValid = false;
			let z: Variable | undefined, zTypeIsValid = false;
			if (mainFunc) {
				count = mainFunc.variableList.find((variableList) => variableList.name === 'count');
				if (count?.type.basic === BasicType.integer && count.type.length?.length === 1) {
					countTypeIsValid = true;
				}
				usage = mainFunc.variableList.find((variableList) => variableList.name === 'usage');
				if (usage?.type.basic === BasicType.integer && usage.type.length?.length === 1) {
					usageTypeIsValid = true;
				}
				value = mainFunc.variableList.find((variableList) => variableList.name === 'value');
				if (value?.type.basic === BasicType.integer && value.type.length?.length === 1) {
					valueTypeIsValid = true;
				}
				selected = mainFunc.variableList.find((variableList) => variableList.name === 'selected');
				if (selected?.type.basic === BasicType.integer && !selected.type.length) {
					selectedTypeIsValid = true;
				}
				total = mainFunc.variableList.find((variableList) => variableList.name === 'total');
				if (total?.type.basic === BasicType.integer && !total.type.length) {
					totalTypeIsValid = true;
				}
				z = mainFunc.variableList.find((variableList) => variableList.name === 'z');
				if (z?.type.basic === BasicType.integer && !z.type.length) {
					zTypeIsValid = true;
				}
			}
			// main 函数检查
			if (mainFunc) {
				// 变量是否存在检查
				if (count && usage && value) {
					// 变量类型是否正确检查
					if (!countTypeIsValid) {
						display1 = <p>变量 count 的类型不对，应是 1 维 int 数组，请修改</p>;
					} else if (!usageTypeIsValid) {
						display1 = <p>变量 usage 的类型不对，应是 1 维 int 数组，请修改</p>;
					} else if (!valueTypeIsValid) {
						display1 = <p>变量 value 的类型不对，应是 1 维 int 数组，请修改</p>;
					} else {
						let countArr = count.value as Array<number>;
						let usageArr = usage.value as Array<number>;
						let valueArr = value.value as Array<number>;
						let textDiv;
						if (zTypeIsValid && z?.value !== undefined) {
							textDiv = <span>正在输出：序号 {z.value}</span>
						} else if (valueTypeIsValid && selectedTypeIsValid && totalTypeIsValid) {
							textDiv = <span>正在挑选纸币面值：{valueArr[selected?.value]}，已选总值：{total?.value}</span>;
						} else {
							textDiv = <span>value 存储每种币的面值，selected 指示现在选择的纸币，total 指示已选好的总量，请在代码编辑器修正变量名</span>
						}
						let collectedLeft = 0;	// 在遍历的过程中把钱放进来，此值增加
						const WIDTH = 2;		// 每元的像素宽度
						const HEIGHT = 40;		// 每行高度
						display1 = (
							<>
								{textDiv}
								<div className="pocket">
									{valueArr.map((value, valueIndex) => {
										console.log('计算', valueIndex);
										let top = HEIGHT * valueIndex;
										let total = countArr[valueIndex] + usageArr[valueIndex];	// 这个面值钱币的总量
										let ret = [];
										for (let i = 0; i < total; i++) {
											// 对于该面值的每张纸币进行计算位置
											let position;
											if (i >= usageArr[valueIndex]) {
												// 这张钱没被用过
												position = {
													left: (i - usageArr[valueIndex]) * value * WIDTH + 40,
													top
												};
											} else {
												// 这张钱用过
												position = {
													left: collectedLeft * WIDTH + 40,
													top: -HEIGHT - 20,
												};
												collectedLeft += value;
											}
											ret.push((
												<div className={`bar bar-${valueIndex}`} style={{ width: value * WIDTH, ...position }}>{value}</div>
											))
										}
										return ret;
									})}
									<div className="line"></div>
									<div className="moneyicon">💰</div>
									{selected?.value !== undefined ? <div className="selectedpointer" style={{ top: selected?.value * HEIGHT }}></div> : null}
								</div>
							</>
						)
					}
				} else if (!count) {
					display1 = <p>缺少变量 count，请在代码编辑器补充</p>;
				} else if (!usage) {
					display1 = <p>缺少变量 usage，请在代码编辑器补充</p>;
				} else {
					display1 = <p>缺少变量 value，请在代码编辑器补充</p>;
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
					<h2>3.1 贪心算法——贪啥？贪钱！</h2>
					<p>这章我们来介绍“贪心算法”。</p>
					<p>这个算法的道理很直白，它就是——有好多好东西摆在你面前，让你尽快拿走，你当然首先会选择最好的那一个。</p>
					<p>比如说，你钱包不小心洒了，洒出来的人民币各种面值都有，为了避免被风刮走，你肯定优先捡面值最大的 100 块~</p>
					<img src="./MoneyProblem/人民币_放大_去色.webp" alt="人民币" />
					<p>不过，刮风就太简单了些，毕竟你肯定想把所有钱都捡起来，一分不留，这可称不上贪心算法。咱加点难度，来个现实生活中的问题——凑钱问题。</p>
					<p>问题是这样的：现在你有面值为 100 元、50 元、20 元、10 元、5 元、1 元人民币各 3 张，请用最快方式凑出 256 元。</p>
					<p>这道题的贪心解法是很符合一般认知的——我们会优先选择面值最大的钱，然后在不超过所需面值的前提下一路选下去。大多数情况下，这样都能凑到需要的钱。</p>
					<p>有人可能会说：那如果这样选凑不到那咋办？找个小卖部老板换零钱去呀！当然会有更好的算法去恰好凑够钱，但是一般人都不愿意这么麻烦的</p>
					<p>动态规划可以更完美地解决这个问题。但是相信我，你不会现场算动态规划的，你会找个小卖部老板换零钱。因为动态规划太麻烦了，贪心算法，快！好用！</p>
					<p>因此，这边是贪心算法的关键特点——<span style={{ color: '#BB0000' }}>速度快，每次都选择局部最优解，但并不能保证能得到全局最优解。</span></p>
					<p>我们来试着解一下这道题目吧～</p>
					<div className="display display2-1-1">
						{display1}
					</div>
					<p>使用这种贪心算法，可以快速地解决生活中的类似问题。但贪心算法解出的有可能不是最优解，如果确实需要找到一个方案，可以完美地使用最少的纸币数恰好满足所需总额的需求，那么你需要动态规划算法。</p>
				</article>
			</div>
		)
	}
}

export default MoneyProblem;