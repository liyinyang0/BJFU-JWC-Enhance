export function initCourseSort() {
    var path = window.location.pathname;
    if (!path.includes('/xsxkkc/') && !path.includes('/xsxk/')) return;

    var script = document.createElement('script');
    script.textContent = '(' + function () {
        'use strict';

        // 注意：本块代码经 <script> 注入到页面上下文运行，无法访问 Tampermonkey 沙箱内的
        // Logger，故直接用 console.log 输出（这是有意为之，非遗留）。
        var sortedCache = null,
            fetchingAll = false,
            lastUrl = '',
            polling = 0,
            MAX_POLL = 60;

        function showStatus(msg, bg) {
            var el = document.getElementById('bjfu-sort-badge');
            if (!el) {
                el = document.createElement('div');
                el.id = 'bjfu-sort-badge';
                el.style.cssText = 'position:fixed;top:10px;right:10px;z-index:100000;' +
                    'padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;' +
                    'font-family:-apple-system,BlinkMacSystemFont,sans-serif;pointer-events:none;';
                document.body.appendChild(el);
            }
            el.textContent = msg;
            var warn = bg === '#fffaf0';
            el.style.background = bg || '#f0fff4';
            el.style.color = warn ? '#c05621' : '#276749';
            el.style.border = '1px solid ' + (warn ? '#feebc8' : '#c6f6d5');
            el.style.opacity = '1';
            clearTimeout(el._timer);
            el._timer = setTimeout(function () { el.style.opacity = '0'; }, 3000);
        }

        function sortRows(aaData) {
            return aaData.slice().sort(function (a, b) {
                function conflict(row) {
                    var c = row.ctsm;
                    if (!c) return false;
                    var s = String(c).trim();
                    return s !== '' && s !== '&nbsp;';
                }
                return conflict(a) - conflict(b);
            });
        }

        function fetchAllData(sSource, aoData, callback) {
            var params = [];
            for (var i = 0; i < aoData.length; i++) {
                params.push({ name: aoData[i].name, value: aoData[i].value });
            }
            var hasLen = false;
            for (var j = 0; j < params.length; j++) {
                if (params[j].name === 'iDisplayLength') { params[j].value = '9999'; hasLen = true; }
                if (params[j].name === 'iDisplayStart') { params[j].value = '0'; }
            }
            if (!hasLen) params.push({ name: 'iDisplayLength', value: '9999' });

            var body = params.map(function (p) {
                return encodeURIComponent(p.name) + '=' + encodeURIComponent(p.value);
            }).join('&');

            var xhr = new XMLHttpRequest();
            xhr.open('POST', sSource, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
            xhr.timeout = 15000;
            xhr.onload = function () {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (typeof kxkcHandleData === 'function') data = kxkcHandleData(data);
                    callback(data && data.aaData ? data.aaData : []);
                } catch (e) { callback([]); }
            };
            xhr.onerror = function () { callback([]); };
            xhr.send(body);
        }

        function installSort(dt) {
            var os;
            try { os = dt.fnSettings(); } catch (e) { return false; }
            if (!os || !os.oFeatures || !os.oFeatures.bServerSide) return false;

            var origFn = os.fnServerData;

            function gpv(arr, name) {
                for (var i = 0; i < arr.length; i++) {
                    if (arr[i].name === name) return arr[i].value;
                }
                return null;
            }

            os.fnServerData = function (sSource, aoData, fnCallback) {
                var curUrl = sSource;
                if (sortedCache && curUrl === lastUrl) {
                    var start = parseInt(gpv(aoData, 'iDisplayStart'), 10) || 0;
                    var len = parseInt(gpv(aoData, 'iDisplayLength'), 10) || 15;
                    var echo = gpv(aoData, 'sEcho');
                    var page = sortedCache.slice(start, start + len);
                    fnCallback({
                        sEcho: echo,
                        iTotalRecords: sortedCache.length,
                        iTotalDisplayRecords: sortedCache.length,
                        aaData: page
                    });
                } else if (!fetchingAll) {
                    sortedCache = null;
                    lastUrl = curUrl;
                    fetchingAll = true;
                    showStatus('正在加载全部课程…', '#fffaf0');
                    origFn.call(this, sSource, aoData, fnCallback);
                    fetchAllData(sSource, aoData, function (allData) {
                        sortedCache = sortRows(allData);
                        fetchingAll = false;
                        var avail = 0;
                        for (var i = 0; i < sortedCache.length; i++) {
                            var c = sortedCache[i].ctsm;
                            var s = c ? String(c).trim() : '';
                            if (!s || s === '&nbsp;') avail++;
                        }
                        showStatus('已排序：' + avail + ' 门可选 ↑   ' +
                            (sortedCache.length - avail) + ' 门冲突 ↓');
                        dt.fnDraw();
                    });
                } else {
                    origFn.call(this, sSource, aoData, fnCallback);
                }
            };
            return true;
        }

        function tryInstallOnCurrent() {
            if (typeof jQuery === 'undefined' || !jQuery.fn.dataTable) return false;
            var dt;
            try { dt = jQuery('#dataView').dataTable(); } catch (e) { return false; }
            if (!dt || !dt.fnSettings) return false;
            var os = dt.fnSettings();
            if (!os || !os.oFeatures || !os.oFeatures.bServerSide) return false;
            if (os.fnServerData.toString().indexOf('sortedCache') > -1) return true;
            if (installSort(dt)) {
                dt.fnDraw();
                return true;
            }
            return false;
        }

        function pollAndInstall() {
            polling++;
            if (tryInstallOnCurrent()) {
                console.log('[北林教务] 选课排序已安装');
                return;
            }
            if (polling < MAX_POLL) setTimeout(pollAndInstall, 250);
        }

        function startObserver() {
            var target = document.getElementById('mainDiv') ||
                         document.querySelector('#dataView') ||
                         document.body;

            var observeTarget = document.body;
            if (target && target !== document.body) {
                var p = target.parentNode;
                while (p && p !== document.body) {
                    if (p.parentNode === document.body) { observeTarget = p; break; }
                    p = p.parentNode;
                }
            }

            var observer = new MutationObserver(function (mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    var added = mutations[i].addedNodes;
                    for (var j = 0; j < added.length; j++) {
                        var node = added[j];
                        if (node.nodeType !== 1) continue;
                        if (node.id === 'dataView' ||
                            (node.querySelector && node.querySelector('#dataView'))) {
                            sortedCache = null;
                            fetchingAll = false;
                            lastUrl = '';
                            polling = 0;
                            console.log('[北林教务] 检测到表格重建，重新安装排序');
                            setTimeout(pollAndInstall, 200);
                            return;
                        }
                    }
                }
            });

            observer.observe(observeTarget, { childList: true, subtree: true });
            console.log('[北林教务] MutationObserver 已启动，监控容器：' +
                (observeTarget.id || observeTarget.tagName));
        }

        var qkl = window.queryKxkcList;
        if (qkl && !window._bjfu_qkl_hooked) {
            window._bjfu_qkl_hooked = true;
            window.queryKxkcList = function () {
                sortedCache = null;
                fetchingAll = false;
                lastUrl = '';
                polling = 0;
                var ret = qkl.apply(this, arguments);
                setTimeout(pollAndInstall, 200);
                return ret;
            };
            console.log('[北林教务] queryKxkcList 已拦截');
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                setTimeout(pollAndInstall, 400);
                startObserver();
            });
        } else {
            setTimeout(pollAndInstall, 400);
            startObserver();
        }
    } + ')();';

    if (document.body) {
        document.body.appendChild(script);
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            document.body.appendChild(script);
        });
    }
}
