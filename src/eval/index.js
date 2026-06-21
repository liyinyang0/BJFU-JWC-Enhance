import { initFindPage } from './find-page.js';
import { initListPage } from './list-page.js';
import { initEditPage } from './edit-page.js';

export function initEval() {
    const href = location.href;
    if (href.includes('xspj_find.do')) {
        initFindPage();
    } else if (href.includes('xspj_list.do')) {
        initListPage();
    } else if (href.includes('xspj_edit.do')) {
        initEditPage();
    }
}
