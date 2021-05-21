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
	getBaseCode() {
		return baseCode;
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