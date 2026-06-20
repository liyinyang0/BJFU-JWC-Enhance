export function initCaptcha() {
    var captchaImg = document.getElementById('SafeCodeImg');
    if (!captchaImg) return;

    var AUTO_LOGIN = {
        username: '',
        password: '',
        autoLogin: false
    };

    var CAPTCHA_W = 62;
    var CAPTCHA_H = 22;
    var RGB_THRES = 150;

    var CHAR_MAP = {
        '1': "111100111110000111110000111111100111111100111111100111111100111111100111111100111111100111110000001110000001",
        '2': "100000111000000011111111001111111001111111001111110011111000111110011111100111111001111111000000001000000001",
        '3': "100000111000000011111110001111111001111110011110000111110000011111110001111111001111110001100000011100000111",
        'b': "001111111001111111001111111001000011000000001000111000001111100001111100001111100000111000000000001001000011",
        'c': "111111111111111111111111111110000011100000011000111111001111111001111111001111111000111111100000011110000011",
        'm': "111111111111111111111111111001000011000000000000111000001111001001111001001111001001111001001111001001111001",
        'n': "111111111111111111111111111001100001001000000000011100000111100001111100001111100001111100001111100001111100",
        'v': "111111111111111111111111111111111011001110011001110011001110011100100111100100111100100111110001111110001111",
        'x': "111111111111111111111111111001110011001110011100100111110001111110001111110001111100100111001110011001110011",
        'z': "111111111111111111111111111000000011000000011111100111111001111110011111100111111001111111000000011000000011"
    };

    function getLogger() {
        if (window.__BJFU_LOGGER__) return window.__BJFU_LOGGER__;
        return {
            info: function (m) { console.log('[北林教务] ' + m); },
            warn: function (m) { console.warn('[北林教务] ' + m); },
            error: function (m) { console.error('[北林教务] ' + m); },
            debug: function () {}
        };
    }

    function binaryImage(ctx) {
        var imageData = ctx.getImageData(0, 0, CAPTCHA_W, CAPTCHA_H).data;
        var imgArr = [];
        for (var x = 0; x < CAPTCHA_W; ++x) {
            for (var y = 0; y < CAPTCHA_H; ++y) {
                if (!imgArr[y]) imgArr[y] = [];
                if (x === 0 || y === 0 || x === CAPTCHA_W - 1 || y === CAPTCHA_H - 1) {
                    imgArr[y][x] = 1;
                    continue;
                }
                var i = (y * CAPTCHA_W + x) * 4;
                if (imageData[i] < RGB_THRES && imageData[i + 1] < RGB_THRES && imageData[i + 2] < RGB_THRES) {
                    imgArr[y][x] = 0;
                } else {
                    imgArr[y][x] = 1;
                }
            }
        }
        return imgArr;
    }

    function removeNoise(imgArr) {
        var yCount = imgArr.length;
        var xCount = imgArr[0].length;
        for (var i = 1; i < yCount - 1; ++i) {
            for (var k = 1; k < xCount - 1; ++k) {
                if (imgArr[i][k] === 0) {
                    var bgNeighbors = imgArr[i][k - 1] + imgArr[i][k + 1] +
                                     imgArr[i - 1][k] + imgArr[i + 1][k];
                    if (bgNeighbors > 2) imgArr[i][k] = 1;
                }
            }
        }
        return imgArr;
    }

    function cutChars(imgArr, cutsX, cutsY, n) {
        var result = [];
        for (var i = 0; i < n; ++i) {
            var charImg = [];
            for (var j = cutsY[i][0]; j < cutsY[i][1]; ++j) {
                if (!charImg[j - cutsY[i][0]]) charImg[j - cutsY[i][0]] = [];
                for (var k = cutsX[i][0]; k < cutsX[i][1]; ++k) {
                    charImg[j - cutsY[i][0]][k - cutsX[i][0]] = imgArr[j][k];
                }
            }
            result.push(charImg);
        }
        return result;
    }

    function imgToString(imgArr) {
        var s = '';
        imgArr.forEach(function (row) {
            row.forEach(function (v) { s += v; });
        });
        return s;
    }

    function matchChar(charImg) {
        var maxScore = 0;
        var bestChar = '?';
        var targetStr = imgToString(charImg);
        var totalPixels = targetStr.length;

        for (var ch in CHAR_MAP) {
            var template = CHAR_MAP[ch];
            var score = 0;
            for (var i = 0; i < totalPixels; ++i) {
                if (targetStr[i] === template[i]) ++score;
            }
            if (score > maxScore) {
                maxScore = score;
                bestChar = ch;
            }
        }
        return { char: bestChar, confidence: maxScore / totalPixels };
    }

    function recognize(img) {
        var canvas = document.createElement('canvas');
        canvas.width = CAPTCHA_W;
        canvas.height = CAPTCHA_H;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        var imgArr = binaryImage(ctx);
        imgArr = removeNoise(imgArr);

        var charCutsX = [[4, 13], [14, 23], [24, 33], [34, 43]];
        var charCutsY = [[4, 16], [4, 16], [4, 16], [4, 16]];
        var charImgs = cutChars(imgArr, charCutsX, charCutsY, 4);

        var result = '';
        var confidences = [];
        charImgs.forEach(function (ci) {
            var m = matchChar(ci);
            result += m.char;
            confidences.push(m.confidence);
        });

        var avgConf = confidences.reduce(function (a, b) { return a + b; }, 0) / confidences.length;
        return { code: result, confidence: avgConf };
    }

    function showToast(msg) {
        var toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText =
            'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);' +
            'background:rgba(0,0,0,0.72);color:#fff;padding:6px 18px;' +
            'border-radius:6px;font-size:12px;z-index:100000;' +
            'font-family:-apple-system,BlinkMacSystemFont,sans-serif;' +
            'pointer-events:none;opacity:0;transition:opacity 0.3s;';
        document.body.appendChild(toast);
        requestAnimationFrame(function () {
            toast.style.opacity = '1';
            setTimeout(function () {
                toast.style.opacity = '0';
                setTimeout(function () { toast.remove(); }, 350);
            }, 1800);
        });
    }

    function doAutoFill() {
        var img = document.getElementById('SafeCodeImg');
        if (!img || !img.complete || img.naturalWidth === 0) return;

        var logger = getLogger();
        var result = recognize(img);

        var codeInput = document.getElementById('RANDOMCODE');
        if (codeInput) codeInput.value = result.code;

        showToast('北林教务增强助手：验证码识别成功');

        if (AUTO_LOGIN.username) {
            var userInput = document.getElementById('userAccount');
            if (userInput && !userInput.value) userInput.value = AUTO_LOGIN.username;
        }
        if (AUTO_LOGIN.password) {
            var passInput = document.getElementById('userPassword');
            if (passInput && !passInput.value) passInput.value = AUTO_LOGIN.password;
        }

        logger.info('[验证码] 识别结果: ' + result.code +
            ' (置信度 ' + (result.confidence * 100).toFixed(0) + '%)');

        if (AUTO_LOGIN.autoLogin && AUTO_LOGIN.username && AUTO_LOGIN.password) {
            if (result.confidence > 0.60) {
                logger.info('[验证码] 置信度达标，自动登录...');
                setTimeout(function () {
                    var loginBtn = document.getElementById('btnSubmit');
                    if (loginBtn) loginBtn.click();
                }, 200);
            } else {
                logger.warn('[验证码] 置信度过低 (' +
                    (result.confidence * 100).toFixed(0) + '%)，跳过自动登录，请手动确认');
            }
        }
    }

    function setupListeners() {
        var img = document.getElementById('SafeCodeImg');
        if (!img) return;

        img.addEventListener('load', function () {
            setTimeout(doAutoFill, 80);
        });

        if (img.complete && img.naturalWidth > 0) {
            setTimeout(doAutoFill, 120);
        } else {
            img.src = img.src;
        }
    }

    function setupRefreshHook() {
        var refreshBtn = document.getElementById('btnTest');
        if (!refreshBtn) return;

        var originalReShow = window.ReShowCode;
        if (originalReShow && !window._bjfu_captcha_hooked) {
            window._bjfu_captcha_hooked = true;
            window.ReShowCode = function () {
                originalReShow.apply(this, arguments);
                var img = document.getElementById('SafeCodeImg');
                if (img) {
                    img.addEventListener('load', function handler() {
                        setTimeout(doAutoFill, 80);
                        img.removeEventListener('load', handler);
                    });
                }
            };
        }

        refreshBtn.addEventListener('click', function () {
            setTimeout(function () {
                var img = document.getElementById('SafeCodeImg');
                if (img) {
                    img.addEventListener('load', function handler() {
                        setTimeout(doAutoFill, 80);
                        img.removeEventListener('load', handler);
                    });
                }
            }, 50);
        });
    }

    function init() {
        setupListeners();
        setupRefreshHook();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 150); });
    } else {
        setTimeout(init, 150);
    }
}
