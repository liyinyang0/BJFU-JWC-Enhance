const fs = require('fs');
const path = require('path');

const BUNDLE = path.join(__dirname, '..', 'enhance.js');

function verify() {
    const content = fs.readFileSync(BUNDLE, 'utf-8');
    let errors = 0;

    console.log('1. Syntax check...');
    try {
        new Function(content);
        console.log('   ✓ Valid JavaScript syntax');
    } catch (e) {
        console.error('   ✗ Syntax error:', e.message);
        errors++;
    }

    console.log('2. Userscript header check...');
    if (content.startsWith('// ==UserScript==')) {
        console.log('   ✓ Header present at start');
    } else {
        console.error('   ✗ Header missing or not at start');
        errors++;
    }

    console.log('3. Feature completeness check...');
    const requiredFeatures = [
        'LogPanelUI', 'Logger', 'createUnifiedModal', 'checkQiangzhiPage',
        'createCreditSummaryWindow', 'updateCreditSummary', 'processAllTables',
        'autoRefreshLoginStatus', 'performLoginRefresh',
        'initEval', 'initCourseSort', 'initCaptcha'
    ];
    const missing = requiredFeatures.filter(f => !content.includes(f));
    if (missing.length > 0) {
        console.error('   ✗ Missing features:', missing.join(', '));
        errors++;
    } else {
        console.log('   ✓ All expected features present');
    }

    console.log('4. Bundle size check...');
    const sizeKB = (content.length / 1024).toFixed(1);
    if (content.length < 1000) {
        console.error('   ✗ Bundle suspiciously small (' + sizeKB + ' KB)');
        errors++;
    } else {
        console.log('   ✓ Bundle size: ' + sizeKB + ' KB');
    }

    console.log('\n' + (errors === 0 ? '✓ All checks passed' : `✗ ${errors} error(s) found`));
    process.exit(errors === 0 ? 0 : 1);
}

verify();
