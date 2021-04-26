import { ChapterIndex } from "../types/types";
import BucketSort from "../courses/BucketSort";
import React, { ClassAttributes, Component, ComponentClass, ComponentState } from "react";

export function getCourseElemByChapterIndex<P extends {}, T extends Component<P, ComponentState>, C extends ComponentClass<P>>(chapterIntex?: ChapterIndex, props?: ClassAttributes<T> & P | null): React.CElement<{}, React.Component<{}, any, any>> {
    let SelectedCourse: ComponentClass<{}, any>;
    if (!chapterIntex) {
        SelectedCourse = 'div' as unknown as React.ComponentClass<{}, any>;
    } else {
        switch (chapterIntex.chapter + ',' + chapterIntex.section) {
            case '0,0':
                SelectedCourse = BucketSort;
                break;    
            default:
                SelectedCourse = 'div' as unknown as React.ComponentClass<{}, any>;
                break;
        }    
    }
    return React.createElement(SelectedCourse, props);
}
