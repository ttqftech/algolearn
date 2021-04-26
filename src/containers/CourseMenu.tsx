import React from "react";
import { ChapterIndex } from "../types/types";
import './CourseMenu.scss'

interface Props {
    chapterIndex?: ChapterIndex;
    onChapterSelected: (chapterIndex: ChapterIndex) => any;
}

interface State {
    width: number;
}

class CourseMenu extends React.Component<Props, State> {
    constructor(props: Props | Readonly<Props>) {
        super(props);
        this.state = {
            width: 280
        };
    }
    render () {
        return (
            <div className="course-menu" style={{flexBasis: this.props.chapterIndex ? `${this.state.width}px` : `100%`}}>
                {!this.props.chapterIndex ?
                    <div className="welcome">
                        <h2>欢迎来到 algolearn</h2>
                        <h2>从下面的章节中选择你想要学习的算法课程吧~</h2>
                    </div>
                : null}
            </div>
        );
    }
}

export default CourseMenu;
