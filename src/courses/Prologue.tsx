// import { BasicType, Variable } from "../types/types";
import { BaseCourse, BaseCourseProps } from "./BaseCourse";
import './BaseCourse.scss';
import './Prologue.scss';

const baseCode = `\
void main() {
    // 尝 试 在 这 里 写 点  C 语 言 代 码 测 试 一 下 吧 ～ 
    // 不 要 忘 了 这 只 是 一 个 删 减 版 的  C 语 言 解 释 器 
    // 所 以 只 能 使 用 一 些 基 本 功 能 哦 ～ 
                                                    // ↖  如 果 提 示 语 法 错 误 了 ， 那 有 可 能 不 是 你 的 问 题 ， 而 是 我 的 问 题 
                                                    //    这 里 只 教 基 本 思 想 ， 学  C 语 言 请 另 找 教 程 哦 ～ 
    int a;
    a = 0;
    while (1) {
        a = a + 1;
    }
}
`

interface State {}

class Prologue extends BaseCourse<BaseCourseProps, State> {
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
			// main 函数检查
			if (mainFunc) {
                console.log(mainFunc);
                display1 = (
                    <>
                        {mainFunc.variableList.map((parameter) => (
                            <p>您定义了一个名为 {parameter.name}，类型为 {JSON.stringify(parameter.type)} 的变量，当前值为 {String(parameter.value)}</p>
                        ))}
                    </>
                );
                // display1 = <>6</>;
			} else {
				display1 = <p>缺少 main 函数，请在代码编辑器补充</p>;
			}
		} else {
			display1 = <p>动态内容加载失败</p>;
		}
		return (
			<div className="article-wrapper">
				<article>
					<h2>0.1 前言！</h2>
                    <p>欢迎来到 algolearn！✨️</p>
                    <p>如你所见这个系统并没有中文名 ┐(‘～`;)┌。同样的，也没有图标，用的是 React.js 的默认图标 ┐(´ー｀)┌</p>
                    <p>为什么呢？因为——</p>
                    <p>这只是我的毕设 ദ്ദി˶ｰ̀֊ｰ́ )✧</p>
                    <p>老师们可不在乎我给这玩意起什么名，画什么图标，只要功能好就行🌚</p>
                    <p>当然啦，老师也不会看这个网页的样式设计。做样式真的耗时，所以这里丑点也无所谓了 (｡•̀ᴗ-)</p>
                    {/* <p>(. ❛ ᴗ ❛.)</p> */}
                    <img src="./Prologue/温迪_诶嘿.png" alt="诶嘿" className="windy" />
                    <p>鄙人只是个写前端的，既不会写书，更不会搞算法。做这东西也只是班门弄斧一下 ¯_(ツ)_/¯。不过，我可不是做那种某某管理系统的普通大学生，要做就得做点有用的东西，所以 algolearn 就诞生啦~</p>
                    <p>本系统旨在以“动态课本”的形式，以轻松诙谐的语言，来对小学至老年大学的计算机编程初学者，做基础算法的讲解。相比于静态的书本，本系统可实现在讲解之余动态执行代码；相比于 playground，本系统可讲代码中的数据以可视化的形式展现，相当的好用！（自评的）</p>
                    <p>在工程上，本系统使用几乎纯前端的方式构造。界面上使用了时下较为流行的 React.js 进行页面构造，样式采用 scss，语言使用 Typescript。底层通过 Typescript 实现了一个 C 语言删减版的解释器。作为初入编程门的作品，希望可以为入门前端开发的同学们带来一定参考价值上的帮助！</p>
                    <p>（不要问我编译原理咯，忘得七七八八了，再也写不出别的语言的编译器了 cry ಠ╭╮ಠ</p>
					<div className="display display-Prologue">
						{display1}
					</div>
                    <p>噢对了，有空之余欢迎点击左上角和右上角来我的官网和仓库参观 (. ❛ ᴗ ❛.)。如果可以的话，给个⭐也是相当不错的！</p>
                    <p style={{ color: '#77777777', fontSize: '0.8em' }}>如果想看毕业论文的话在仓库里也是有的哈</p>
				</article>
			</div>
		);
	}
}

export default Prologue;
