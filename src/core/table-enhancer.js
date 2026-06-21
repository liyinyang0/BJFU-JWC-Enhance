import { Logger } from './logger.js';
import { updateCreditSummary } from './credit-stats.js';

/**
 * 课程信息增强核心逻辑
 * 负责解析教务系统的表格 DOM，并插入老师说明等辅助信息。
 */
export function processAllTables() {
    try {
        const tables = document.querySelectorAll('table');
        const isGradePage = window.location.pathname.includes('/jsxsd/kscj/cjcx_list');
        const isSchedulePage = window.location.pathname.includes('xskb_list.do') &&
            document.title.includes('学期理论课表');
        if (isSchedulePage) return;
        let processedTables = 0, processedRows = 0, enhancedCourses = 0;

        tables.forEach(table => {
            try {
                const rows = table.querySelectorAll('tr');
                processedTables++;

                rows.forEach(row => {
                    try {
                        const tds = row.querySelectorAll('td');
                        if (tds.length < 3) return;
                        processedRows++;

                        let courseCodeTd, courseCode;

                        if (isGradePage) {
                            courseCodeTd = tds[2];
                            courseCode = courseCodeTd ? courseCodeTd.textContent.trim() : '';
                        } else if (isSchedulePage) {
                            courseCodeTd = tds[1];
                            courseCode = courseCodeTd ? courseCodeTd.textContent.trim() : '';
                        } else {
                            courseCodeTd = tds[1];
                            if (courseCodeTd) {
                                const br = courseCodeTd.querySelector('br');
                                if (br && br.nextSibling) {
                                    courseCode = br.nextSibling.textContent.trim();
                                } else {
                                    return;
                                }
                            } else return;
                        }

                        if (!courseCode) return;
                        let courseEnhanced = false;

                        // 插入老师说明（将 <td> 的 title 属性显性化）
                        try {
                            if (!isGradePage && !isSchedulePage && courseCodeTd &&
                                courseCodeTd.title && !courseCodeTd.querySelector('[data-title-inserted]')) {
                                const titleDiv = document.createElement('div');
                                titleDiv.setAttribute('data-title-inserted', '1');
                                titleDiv.style.color = '#666';
                                titleDiv.style.fontSize = '13px';
                                titleDiv.style.marginTop = '4px';
                                titleDiv.style.fontStyle = 'italic';
                                titleDiv.textContent = `📌 老师说明: ${courseCodeTd.title}`;
                                courseCodeTd.appendChild(titleDiv);
                                courseEnhanced = true;
                            }
                        } catch (e) { Logger.warn('添加老师说明时出错:', e); }

                        if (courseEnhanced) enhancedCourses++;
                    } catch (e) { Logger.warn('处理表格行时出错:', e); }
                });
            } catch (e) { Logger.warn('处理表格时出错:', e); }
        });

        Logger.info(`表格处理完成: ${processedTables}个表格, ${processedRows}行, 增强${enhancedCourses}门课程`);

        if (isGradePage) updateCreditSummary();
    } catch (e) {
        Logger.error('处理页面表格失败:', e);
    }
}
