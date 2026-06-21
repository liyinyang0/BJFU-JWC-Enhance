import { roundFloat } from './utils.js';

/**
 * 评教评分策略（纯函数模块，便于单元测试）
 *
 * 数据结构约定：
 *   groups[name] = [{ el, score }, ...]  每道题的可选项，已按 score 降序排列
 *   el 为单选框元素（至少需要支持读写 .checked）
 */

/**
 * 找到"扰动题"：在所有至少有 2 个选项的题里，取相邻最高/次高分差最小的那一题。
 * 该题会被策略刻意选成非最高分，避免所有题一律给满分被判定敷衍。
 *
 * @param {string[]} gkeys 题目名顺序
 * @param {Record<string, {el: object, score: number}[]>} groups
 * @returns {number} 扰动题在 gkeys 中的下标；不存在则 -1
 */
export function findPerturbIdx(gkeys, groups) {
    let minDelta = Infinity, perturbIdx = -1;
    gkeys.forEach((k, i) => {
        const opts = groups[k];
        if (opts.length < 2) return;
        const delta = roundFloat(opts[0].score - opts[1].score);
        if (delta < minDelta) { minDelta = delta; perturbIdx = i; }
    });
    return perturbIdx;
}

/**
 * 按策略勾选每道题并返回总分。
 * 副作用：会把被选中项的 el.checked 置为 true。
 *
 * @param {'highest'|'high'|'mid'|'low'} strategy
 * @returns {number} 当前总分
 */
export function applyStrategy(strategy, gkeys, groups) {
    const perturbIdx = findPerturbIdx(gkeys, groups);
    let total = 0;
    gkeys.forEach((k, i) => {
        const opts = groups[k], len = opts.length;
        let pick;
        if (strategy === 'highest') {
            pick = (i === perturbIdx && len >= 2) ? 1 : 0;
        } else if (strategy === 'high') {
            pick = len < 2 ? 0 : (i === perturbIdx) ? 0 : 1;
        } else if (strategy === 'mid') {
            const midIdx = Math.floor((len - 1) / 2);
            pick = (i === perturbIdx && len >= 2) ? (midIdx > 0 ? midIdx - 1 : midIdx + 1) : midIdx;
        } else if (strategy === 'low') {
            pick = (i === perturbIdx && len >= 2) ? len - 2 : len - 1;
        }
        const chosen = opts[Math.min(pick, len - 1)];
        if (chosen) { chosen.el.checked = true; total += chosen.score; }
    });
    return roundFloat(total);
}
