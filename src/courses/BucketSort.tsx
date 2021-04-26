import { ChangedVariable, TokenType } from "../types/types";
import { BaseCourse } from "./BaseCourse";

const baseCode = `\
void main() {
	int array[5] = {5,1,4,2,3}; // 输入数组
	int bucket[5];              // 桶
	int i;
	int value;
	for (i = 0; i < 5; i++)
	{
		// 按顺序把输入数组中的每个数放入对应的桶里
		value = array[i];
		bucket[value - 1] = value;
	}
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

class BucketSort extends BaseCourse<{}, State> {
	constructor() {
		super({});
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
	onVariableChange<T>(changedVariable: ChangedVariable<T>) {
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
				<div>Hallo!</div>
			</div>
		)
	}
}

export default BucketSort;