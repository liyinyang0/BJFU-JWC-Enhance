import { describe, it, expect } from 'vitest';
import { findPerturbIdx, applyStrategy } from '../src/eval/scoring.js';

// 构造选项列表：scores 已按降序给出，el 用最小 mock（仅需 .checked 可读写）
function makeOpts(...scores) {
    return scores.map(score => ({ el: { checked: false }, score }));
}

describe('findPerturbIdx', () => {
    it('取相邻最高/次高分差最小的题目下标', () => {
        const groups = { a: makeOpts(10, 9), b: makeOpts(10, 5) };
        // a 差 1，b 差 5 → 最小差是 a
        expect(findPerturbIdx(['a', 'b'], groups)).toBe(0);
    });

    it('跳过只有 1 个选项的题', () => {
        const groups = { a: makeOpts(10), b: makeOpts(10, 8) };
        expect(findPerturbIdx(['a', 'b'], groups)).toBe(1);
    });

    it('没有 2 选项题时返回 -1', () => {
        const groups = { a: makeOpts(10), b: makeOpts(8) };
        expect(findPerturbIdx(['a', 'b'], groups)).toBe(-1);
    });
});

describe('applyStrategy', () => {
    it('highest：扰动题选次高分，其余选最高分', () => {
        const groups = { a: makeOpts(10, 9), b: makeOpts(10, 5) };
        // perturb=a → a 选 9，b 选 10 → 19
        const total = applyStrategy('highest', ['a', 'b'], groups);
        expect(total).toBe(19);
        expect(groups.a[1].el.checked).toBe(true);
        expect(groups.b[0].el.checked).toBe(true);
        expect(groups.a[0].el.checked).toBe(false);
    });

    it('highest：单选项题直接选唯一项', () => {
        const groups = { a: makeOpts(10), b: makeOpts(10, 8) };
        // perturb=b → b 选 8，a 选 10 → 18
        expect(applyStrategy('highest', ['a', 'b'], groups)).toBe(18);
    });

    it('high：扰动题选最高分，其余选次高分', () => {
        const groups = { a: makeOpts(10, 9), b: makeOpts(10, 8, 5) };
        // perturb=a → a 选 10，b 选次高 8 → 18
        expect(applyStrategy('high', ['a', 'b'], groups)).toBe(18);
    });

    it('mid：选中间偏上的分值', () => {
        const groups = { a: makeOpts(10, 9), b: makeOpts(10, 7, 4, 1) };
        // perturb=a → a 选 9；b 非扰动选 midIdx=1 → 7 → 16
        const total = applyStrategy('mid', ['a', 'b'], groups);
        expect(total).toBe(16);
        expect(groups.a[1].el.checked).toBe(true);
        expect(groups.b[1].el.checked).toBe(true);
    });

    it('low：扰动题选次低分，其余选最低分', () => {
        const groups = { a: makeOpts(10, 9, 6, 3), b: makeOpts(10, 8, 5) };
        // perturb=a → a 选次低 opts[2]=6；b 选最低 opts[2]=5 → 11
        expect(applyStrategy('low', ['a', 'b'], groups)).toBe(11);
    });
});
