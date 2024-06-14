import { BasicType, Variable } from "../types/types";
import { BaseCourse, BaseCourseProps } from "./BaseCourse";
import './BaseCourse.scss';
import './MinMax.scss';

const baseCode = `\
void main() {
    int tower[5];
    int i;        // i 是 当 前 正 在 检 查 的 元 素 序 号 
    int min;      // min 记 录 当 前 已 发 现 的 最 小 的 数 字 
    int max;      // max 记 录 当 前 已 发 现 的 最 大 的 数 字 
    tower[0] = 632; tower[1] = 601; tower[2] = 656; tower[3] = 828; tower[4] = 599;

    // 1. 遍 历 
    min = 2147483648;     // 先 定 一 个 超 大 的 数 ，这 样 就 可 以 避 免 输 入 数 据 里 没 一 个 数 比 它 小 ， 记 录 不 到 的 情 况 
    max = -2147483648;    // 同 理 。 或 者 可 以 换 种 思 路 ： 先 把  max 定 在 数 轴 尽 可 能 左 的 位 置 ， 让 输 入 数 据 一 个 个 把 它 往 右 推 
    i = 0;                // C 语 言 中 序 号 从 0 开 始 
    while (i <= 4)
    {
        if (tower[i] < min) {
            min = tower[i];   // 如 果 它 比 曾 记 录 过 的 最 小 值 还 要 小 ， 那 么 更 新 记 录 
        }
        if (tower[i] > max) {
            max = tower[i];   // 反 之 亦 然
        }
        i = i + 1;
    }

    // 2. 输 出
    print2Buffer(min);    // print2Buffer 是 本 教 学 系 统 的 内 置 函 数 ，不 是  C 标 准 自 带 的 东 西 
    print2Buffer(max);
    alert();              // alert 也 是 
}
`

interface State {}

class BubbleSort extends BaseCourse<BaseCourseProps, State> {
	constructor(props: (BaseCourseProps) | Readonly<BaseCourseProps>) {
		super(props);
		this.state = {}
	}
	getBaseCode() {
		return baseCode;
	}
	render () {
		let display1: React.CElement<{}, React.Component<{}, any, any>>;
		let display2 = <></>;
		// ProgramNode 检查
		if (this.props.programNode) {
			let mainFunc = this.props.programNode.functionList.find((functionList) => functionList.name === 'main');
			let tower, towerTypeIsValid = false;
			let min: Variable | undefined, minTypeIsValid = false;
			let max: Variable | undefined, maxTypeIsValid = false;
			let i: Variable | undefined, iTypeIsValid = false;
			// let temp: Variable | undefined, tempTypeIsValid = false;
			if (mainFunc) {
				tower = mainFunc.variableList.find((variableList) => variableList.name === 'tower');
				if (tower?.type.basic === BasicType.integer && tower.type.length?.length === 1) {
					towerTypeIsValid = true;
				}
				min = mainFunc.variableList.find((variableList) => variableList.name === 'min');
				if (min?.type.basic === BasicType.integer && !min.type.length) {
					minTypeIsValid = true;
				}
				max = mainFunc.variableList.find((variableList) => variableList.name === 'max');
				if (max?.type.basic === BasicType.integer && !max.type.length) {
					maxTypeIsValid = true;
				}
				i = mainFunc.variableList.find((variableList) => variableList.name === 'i');
				if (i?.type.basic === BasicType.integer && !i.type.length) {
					iTypeIsValid = true;
				}
			}
			// main 函数检查
			if (mainFunc) {
				// 变量是否存在检查
				if (tower && min && max && i) {
					// 变量类型是否正确检查
					if (!towerTypeIsValid || !minTypeIsValid || !maxTypeIsValid || !iTypeIsValid) {
						display1 = (
							<>
								{!towerTypeIsValid && <p>变量 ball 的类型不对，应是 1 维 int 数组，请修改</p>}
								{!minTypeIsValid && <p>变量 min 的类型不对，应是 int，请修改</p>}
								{!maxTypeIsValid && <p>变量 max 的类型不对，应是 int，请修改</p>}
								{!iTypeIsValid && <p>变量 i 的类型不对，应是 int，请修改</p>}
							</>
						);	
					} else {
						const [minTower, maxTower] = i.value !== undefined ? [Math.min(...tower.value), Math.max(...tower.value)] : [undefined, undefined];
						display1 = (
							<>
								<div className="description">
									{i.value === undefined ? (
										<>
											<p>先把变量初始化好～</p>
											<p>i 定在 0，表示从 0 号元素开始</p>
											<p>min max 分别定一个超大值和超小值，等下让数据把它们推过去～</p>
										</>
									) : (
										<>
											<p>第 <strong>{i.value}</strong> 序循环，取出来塔的高度是 {tower.value[i.value]}</p>
											<p>现在的历史记录是 <span style={{ color: '#3355DD' }}>{min.value}</span> ~ <span style={{ color: '#33BB55' }}>{max.value}</span></p>
											<p>
												{ tower.value[i.value] < min.value ? <span style={{ color: '#BB0000' }}>比历史记录低，替换历史。</span> : <span style={{ opacity: 0.5 }}>不比历史记录低。</span>}
												{ tower.value[i.value] > max.value ? <span style={{ color: '#BB0000' }}>比历史记录高，替换历史。</span> : <span style={{ opacity: 0.5 }}>不比历史记录高。</span>}
											</p>
										</>
									)}
								</div>
								<div className="towers">
									{tower.value.map((num: number, index: number) => {
										const heightIndex = [599, 601, 632, 656, 828].indexOf(num);
										if (heightIndex === -1) {
											return (
												<div><div style={index === i?.value ? { animation: 'flashing-MinMax 0.5s ease-in 0s infinite alternate' } : undefined}>
													<img src="./MinMax/pngtree_building_5689603.png" alt="默认高楼" />
													<span>{num}</span>
												</div></div>
											);
										} else {
											return (
												<div><div style={index === i?.value ? { animation: 'flashing-MinMax 0.5s ease-in 0s infinite alternate' } : undefined}>
													<img src={`./MinMax/${['5_599.png', '4_601.png', '3_632.png', '2_656.png', '1_828.png'][heightIndex]}`} alt="" />
													<span>{num}</span>
												</div></div>
											);
										}
									})}
								</div>
								<div className="hline"></div>
								<div className="scale">
									{new Array(21).fill(undefined).map((_) => <div></div>)}
								</div>
								{(minTower !== undefined && maxTower !== undefined) && (
									<div className="scaleNumber">
										{new Array(11).fill(undefined).map((_, index) => <div>{Math.round(minTower + (maxTower - minTower) * (index / 10))}</div>)}
									</div>
								)}
								<div className="min" style={{ left: !minTower || !maxTower || min.value > maxTower ? '95%' : `${15 + (min.value - minTower) / (maxTower - minTower) * 70}%` }}><div>最小值</div></div>
								<div className="max" style={{ left: !minTower || !maxTower || max.value < minTower ? '5%' : `${15 + (max.value - minTower) / (maxTower - minTower) * 70}%` }}><div>最大值</div></div>
								{/* {i.value !== undefined && i.value < tower.value.length && (
									<div className="indexIndicator" style={{ left: `${15 + i.value / (tower.value.length - 1) * 70}%`}}><div></div></div>
								)} */}
							</>
						);
						if (i.value >= tower.value.length) {
							display2 = <p>看，这样我们就成功把五座塔之中最高和最低的都找了出来！🖔</p>;
						}
					}
				} else {
					display1 = (
						<>
							{!tower && <p>缺少变量 tower，请在代码编辑器补充</p>}
							{!min && <p>缺少变量 min，请在代码编辑器补充</p>}
							{!max && <p>缺少变量 max，请在代码编辑器补充</p>}
							{!i && <p>缺少变量 i，请在代码编辑器补充</p>}
						</>
					);
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
					<h2>1.1 谁最大？谁最小？</h2>
					<p>作为本教程的第一章，咱先不搞那些复杂的，先来点简单的热热身。</p>
					<p>像我们在算法领域耳熟能详的“排序算法”，多少是有点复杂。所以，咱先不管中间那堆，咱就要一个最小的，一个最大的！</p>
					<p>这个思路其实非常简单：<span style={{ color: '#BB0000' }}>先把数据一个个过一遍，看到一个有史以来最小的就记录下来更改历史，看到一个有史以来最大的就记录下来更改历史，直到把所有数据都看完。</span></p>
					<p>所以，我们要构造两次循环：一次找最大，一次找最小。</p>
					<p>既然两次循环干的事情都差不多，那是不是能合并呢？当然可以！</p>
					<p>　</p>
					<p>现有世界五大高楼，但是我把它打乱了顺序，看看能否通过代码把最高和最矮的找出来😏</p>
					<div className="display display-MinMax1">
						{display1}
					</div>
					{display2}
				</article>
			</div>
		)
	}
}

export default BubbleSort;