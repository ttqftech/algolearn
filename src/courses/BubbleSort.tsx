import { ChangedVariable, TokenType } from "../types/types";
import { BaseCourse, BaseCourseProps } from "./BaseCourse";

const baseCode = `\
void function(){
    float s; int i;
    i = 1; s = 2;
    while (i < 10) {
        s = s * i;
        i = i + 3;
    }
    return 1;
}
`

const listeningVariable = [
	{
		name: 'array',
		type: [TokenType.unknown],
	},
	{
		name: 'bucket',
		type: [TokenType.unknown],
	},
	{
		name: 'i',
		type: [TokenType.number_dec_int],
	},
]

interface State {
	array: Array<number>;
	bucket: Array<number>;
	i: number;
}

class BubbleSort extends BaseCourse<BaseCourseProps, State> {
	constructor(props: (BaseCourseProps) | Readonly<BaseCourseProps>) {
		super(props);
		this.state = {
			array: [],
			bucket: [],
			i: NaN,
		}
	}
	getListeningVariable() {
		return listeningVariable;
	}
	getBaseCode() {
		return baseCode;
	}
	onVariableChanged<T>(changedVariable: ChangedVariable<T>) {
		if (['array', 'bucket', 'i'].includes(changedVariable.name)) {
			// @ts-ignore
			this.setState({
				[changedVariable.name]: changedVariable.value as any
			});
		}
	}
	render () {
		return (
			<div>
				<h2>Hallo! 冒泡排序</h2>
			</div>
		)
	}
}

export default BubbleSort;