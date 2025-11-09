function isMobileDevice() {
    if (navigator.userAgentData && navigator.userAgentData.mobile) {
        return true;
    }
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(navigator.userAgent);
}

if (isMobileDevice()) {
    function getOrientation() {
        return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
    }

    function setDefaultBottomLayout() {
        const joystick = document.getElementById('joystick-zone');
        const buttonZone = document.getElementById('button-zone');
        if (!joystick || !buttonZone) return;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        const joystickSize = Math.min(120, screenWidth * 0.3);
        joystick.style.width = joystickSize + 'px';
        joystick.style.height = joystickSize + 'px';
        joystick.style.position = 'absolute';
        joystick.style.left = '10px';
        joystick.style.top = (screenHeight - joystickSize - 10) + 'px';

        const buttonWidth = 60;
        const buttonHeight = joystickSize;
        buttonZone.style.width = buttonWidth + 'px';
        buttonZone.style.height = buttonHeight + 'px';
        buttonZone.style.position = 'absolute';
        buttonZone.style.left = (10 + joystickSize + 10) + 'px';
        buttonZone.style.top = (screenHeight - buttonHeight - 10) + 'px';
        buttonZone.style.display = 'flex';
        buttonZone.style.flexDirection = 'column';
        buttonZone.style.justifyContent = 'space-between';
        buttonZone.style.alignItems = 'center';
    }

    function scaleFromBaseline(baselineW, baselineH, baselinePos, targetW, targetH) {
        return {
            left: Math.round((baselinePos.left / baselineW) * targetW),
            top: Math.round((baselinePos.top / baselineH) * targetH),
        };
    }

    function saveControlPositions() {
        const ids = ['button-z', 'button-x', 'button-c', 'button-zone', 'joystick-zone'];
        const data = {};
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                data[id] = {
                    left: parseInt(el.style.left) || el.offsetLeft,
                    top: parseInt(el.style.top) || el.offsetTop,
                    width: el.offsetWidth,
                    height: el.offsetHeight,
                };
            }
        });
        data.dpadMode = window.dpadMode;

        const allPositions = JSON.parse(localStorage.getItem('controlPositions') || '{}');
        const orientation = getOrientation();
        allPositions[orientation] = data;
        localStorage.setItem('controlPositions', JSON.stringify(allPositions));
    }

    function resetControlPositions() {
        const orientation = getOrientation();
        const isPortrait = orientation === 'portrait';
        const w = isPortrait ?
            Math.min(window.innerWidth, window.innerHeight) :
            Math.max(window.innerWidth, window.innerHeight);
        const h = isPortrait ?
            Math.max(window.innerWidth, window.innerHeight) :
            Math.min(window.innerWidth, window.innerHeight);

        const baselinePos = getDefaultButtonPositionsForSize(w, h, orientation);
        const allPositions = JSON.parse(localStorage.getItem('controlPositions') || '{}');
        const saved = allPositions[orientation] || {};
        const ids = ['button-z', 'button-x', 'button-c', 'joystick-zone'];
        const buttonZone = document.getElementById('button-zone');
        let prevDisplay = '';
        if (buttonZone) {
            prevDisplay = buttonZone.style.display || '';
            buttonZone.style.display = 'none';
        }
        ids.forEach(id => {
            const el = document.getElementById(id);
            const p = baselinePos[id];
            if (!el || !p) return;
            el.style.position = 'absolute';
            el.style.left = p.left + 'px';
            el.style.top = p.top + 'px';
            if (id === 'joystick-zone') {
                const jSize = Math.round(w * 0.28);
                el.style.width = jSize + 'px';
                el.style.height = jSize + 'px';
                saved[id] = {
                    left: p.left,
                    top: p.top,
                    width: jSize,
                    height: jSize,
                };
            } else {
                saved[id] = {
                    left: p.left,
                    top: p.top
                };
            }
            if (el.parentElement !== document.body) {
                document.body.appendChild(el);
            }
            el.dataset.dragged = 'true';
            el.dataset.initialized = 'true';
        });
        if (buttonZone) {
            buttonZone.style.display = prevDisplay;
        }
        allPositions[orientation] = saved;
        localStorage.setItem('controlPositions', JSON.stringify(allPositions));
        if (typeof window.updateControlPositions === 'function') {
            window.updateControlPositions(getOrientation());
        }
    }

    function getDefaultButtonPositionsForSize(screenW, screenH, orientation) {
        const isPortrait = orientation === 'portrait';
        const baseline = isPortrait ? BASELINE_PORTRAIT : BASELINE_LANDSCAPE;
        const designMaxX = isPortrait ? BASE_PORTRAIT_W : 667;
        const designMaxY = isPortrait ? BASE_PORTRAIT_H : 375;
        const out = {};
        for (const id in baseline) {
            out[id] = scaleFromBaseline(designMaxX, designMaxY, baseline[id], screenW, screenH);
        }
        return out;
    }

    function ensurePortraitDefaultsOnly() {
        const allDefaults = JSON.parse(localStorage.getItem('defaultPositions') || '{}');
        if (allDefaults.portrait) return;

        const portraitW = Math.min(window.innerWidth, window.innerHeight);
        const portraitH = Math.max(window.innerWidth, window.innerHeight);
        const portraitDefaults = getDefaultButtonPositionsForSize(portraitW, portraitH, 'portrait');

        const ids = ['button-z', 'button-x', 'button-c', 'joystick-zone', 'button-zone'];
        const portraitStored = {};
        ids.forEach(id => {
            const el = document.getElementById(id);
            const p = portraitDefaults[id] || {
                left: 10,
                top: 10
            };
            portraitStored[id] = {
                left: p.left,
                top: p.top,
                width: (el && el.offsetWidth) ? el.offsetWidth : (id === 'joystick-zone' ? Math.round(portraitW * 0.28) : 75),
                height: (el && el.offsetHeight) ? el.offsetHeight : (id === 'joystick-zone' ? Math.round(portraitW * 0.28) : 75),
            };
        });
        allDefaults.portrait = portraitStored;
        localStorage.setItem('defaultPositions', JSON.stringify(allDefaults));
    }

    function captureDefaultPositions() {
        ensurePortraitDefaultsOnly();
        const orientation = getOrientation();
        const allDefaults = JSON.parse(localStorage.getItem('defaultPositions') || '{}');
        const orientationDefaults = allDefaults[orientation] || {};
        if (Object.keys(orientationDefaults).length > 0) {
            trueDefaultPositions[orientation] = orientationDefaults;
            return;
        }

        const ids = ['button-z', 'button-x', 'button-c', 'joystick-zone', 'button-zone'];
        const captured = {};
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const rect = el.getBoundingClientRect();
            captured[id] = {
                left: Math.round(rect.left),
                top: Math.round(rect.top),
                width: el.offsetWidth,
                height: el.offsetHeight,
            };
        });
        allDefaults[orientation] = captured;
        localStorage.setItem('defaultPositions', JSON.stringify(allDefaults));
        trueDefaultPositions[orientation] = captured;
    }

    function exitPositionMode() {
        if (!window.positionMode) return;
        window.positionMode = false;

        const overlay = document.getElementById('positionOverlay');
        if (overlay) overlay.style.display = 'none';
        const backButton = document.getElementById('exitPositionModeButton');
        if (backButton) backButton.style.display = 'none';
        const resetButton = document.getElementById('resetPositionsButton');
        if (resetButton) resetButton.style.display = 'none';

        ['button-z', 'button-x', 'button-c', 'joystick-zone'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.pointerEvents = 'auto';
                el.style.zIndex = '';
            }
        });

        saveControlPositions();
        if (typeof GM_unpause === "function") GM_unpause();
        if (typeof showUI === "function") showUI();
        if (typeof window.createOrUpdateControls === "function") {
            window.createOrUpdateControls();
        }
    }

    function makeDraggable(el) {
        if (!el) return;
        el.style.touchAction = 'none';
        el.style.position = el.style.position || 'absolute';

        let offsetX = 0,
            offsetY = 0,
            isDragging = false;

        el.addEventListener('pointerdown', e => {
            if (!window.positionMode) return;
            e.preventDefault();
            isDragging = true;
            offsetX = e.clientX - el.offsetLeft;
            offsetY = e.clientY - el.offsetTop;
            try {
                el.setPointerCapture(e.pointerId);
            } catch (err) {}
        });

        el.addEventListener('pointermove', e => {
            if (!isDragging || !window.positionMode) return;
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;

            const width = el.offsetWidth;
            const height = el.offsetHeight;
            let minLeft = 0;
            let maxLeft = window.innerWidth - width;
            let minTop = 0;
            let maxTop = window.innerHeight - height;

            if (el.id === 'joystick-zone') {
                const isPortrait = window.innerHeight > window.innerWidth;
                const C = isPortrait ? 120 : 180;
                const tx = isPortrait ? 20 : 0;
                const ty = isPortrait ? -17.5 : 0;
                const jW = width;
                const jH = height;

                const derivedMinLeft = -(jW / 2) + 0.625 * C - tx;
                const derivedMaxLeft = window.innerWidth - (jW / 2) - 0.615 * C - tx;
                const derivedMinTop = -(jH / 2) + 0.625 * C - ty;
                const derivedMaxTop = window.innerHeight - (jH / 2) - 0.615 * C - ty;

                minLeft = Math.max(0, derivedMinLeft);
                maxLeft = Math.min(window.innerWidth - jW, derivedMaxLeft);
                minTop = Math.max(0, derivedMinTop);
                maxTop = Math.min(window.innerHeight - jH, derivedMaxTop);

                if (minLeft > maxLeft) {
                    minLeft = 0;
                    maxLeft = window.innerWidth - jW;
                }
                if (minTop > maxTop) {
                    minTop = 0;
                    maxTop = window.innerHeight - jH;
                }
            }

            newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
            newTop = Math.max(minTop, Math.min(newTop, maxTop));
            el.style.left = Math.round(newLeft) + 'px';
            el.style.top = Math.round(newTop) + 'px';
        });

        el.addEventListener('pointerup', () => {
            if (!window.positionMode) return;
            isDragging = false;
            el.dataset.dragged = 'true';
            saveControlPositions();
        });

        el.addEventListener('pointercancel', () => {
            isDragging = false;
        });
    }

    function loadControlPositions() {
        const allPositions = JSON.parse(localStorage.getItem('controlPositions') || '{}');
        const orientation = getOrientation();
        const requiredIds = ['button-z', 'button-x', 'button-c', 'joystick-zone'];
        const isPortrait = orientation === 'portrait';
        const w = isPortrait ?
            Math.min(window.innerWidth, window.innerHeight) :
            Math.max(window.innerWidth, window.innerHeight);
        const h = isPortrait ?
            Math.max(window.innerWidth, window.innerHeight) :
            Math.min(window.innerWidth, window.innerHeight);

        const scaledDefaults = getDefaultButtonPositionsForSize(w, h, orientation);
        const saved = { ...(allPositions[orientation] || {})
        };
        let changed = false;

        requiredIds.forEach(id => {
            if (!saved[id]) {
                const pos = scaledDefaults[id];
                if (pos) {
                    saved[id] = {
                        left: pos.left,
                        top: pos.top,
                        width: id === 'joystick-zone' ? Math.round(w * 0.28) : 75,
                        height: id === 'joystick-zone' ? Math.round(w * 0.28) : 75,
                    };
                    changed = true;
                }
            }
        });

        if (Object.keys(saved).length === 0) return;

        requiredIds.forEach(id => {
            const pos = saved[id];
            const el = document.getElementById(id);
            if (!el || !pos) return;
            el.style.position = 'absolute';
            el.style.left = pos.left + 'px';
            el.style.top = pos.top + 'px';
            if (pos.width) el.style.width = pos.width + 'px';
            if (pos.height) el.style.height = pos.height + 'px';
            if (el.parentElement !== document.body) {
                document.body.appendChild(el);
            }
            el.dataset.dragged = 'true';
            el.dataset.initialized = 'true';
        });

        if (changed) {
            allPositions[orientation] = saved;
            localStorage.setItem('controlPositions', JSON.stringify(allPositions));
        }

        if (typeof saved.dpadMode === 'boolean') {
            window.dpadMode = saved.dpadMode;
        }
    }

    function ensureDefaultPositionsForAllOrientations() {
        const allDefaults = JSON.parse(localStorage.getItem('defaultPositions') || '{}');
        const orientations = ['portrait', 'landscape'];

        orientations.forEach(o => {
            if (!allDefaults[o]) {
                const w = o === 'portrait' ?
                    Math.min(window.innerWidth, window.innerHeight) :
                    Math.max(window.innerWidth, window.innerHeight);
                const h = o === 'portrait' ?
                    Math.max(window.innerWidth, window.innerHeight) :
                    Math.min(window.innerWidth, window.innerHeight);

                const positions = getDefaultButtonPositionsForSize(w, h, o);

                ['button-z', 'button-x', 'button-c', 'joystick-zone', 'button-zone'].forEach(id => {
                    const el = document.getElementById(id);
                    const pos = positions[id] || {
                        left: 10,
                        top: 10
                    };
                    positions[id] = {
                        left: pos.left,
                        top: pos.top,
                        width: (el && el.offsetWidth) ? el.offsetWidth : (id === 'joystick-zone' ? Math.round(w * 0.28) : 75),
                        height: (el && el.offsetHeight) ? el.offsetHeight : (id === 'joystick-zone' ? Math.round(w * 0.28) : 75),
                    };
                });
                allDefaults[o] = positions;
            }
        });

        localStorage.setItem('defaultPositions', JSON.stringify(allDefaults));
    }


    let trueDefaultPositions = {};
    const BASE_PORTRAIT_W = 430;
    const BASE_PORTRAIT_H = 932;
    const BASELINE_PORTRAIT = {
        'button-c': {
            left: 319,
            top: 660
        },
        'button-x': {
            left: 275,
            top: 745
        },
        'button-z': {
            left: 235,
            top: 835
        },
        'joystick-zone': {
            left: 20,
            top: 685
        },
    };
    const BASELINE_LANDSCAPE = {
        'button-c': {
            left: 544,
            top: 46
        },
        'button-x': {
            left: 544,
            top: 146
        },
        'button-z': {
            left: 544,
            top: 246
        },
        'joystick-zone': {
            left: 20,
            top: 0
        },
    };

    window.dpadMode = false;
    window.toggleDpadMode = function() {
        window.dpadMode = !window.dpadMode;
        const allPositions = JSON.parse(localStorage.getItem('controlPositions') || '{}');
        const orientation = getOrientation();
        const saved = allPositions[orientation] || {};
        saved.dpadMode = window.dpadMode;
        allPositions[orientation] = saved;
        localStorage.setItem('controlPositions', JSON.stringify(allPositions));
        if (typeof window.createOrUpdateControls === "function") {
            window.createOrUpdateControls();
        }
    };

    window.positionMode = false;
    window.enterPositionMode = function() {
        if (window.positionMode) return;
        window.positionMode = true;
        if (typeof GM_pause === "function") GM_pause();
        if (typeof hideUI === "function") hideUI();

        let overlay = document.getElementById('positionOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'positionOverlay';
            Object.assign(overlay.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.15)',
                zIndex: 9998,
                pointerEvents: 'none',
            });
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        let backButton = document.getElementById('exitPositionModeButton');
        if (!backButton) {
            backButton = document.createElement('button');
            backButton.id = 'exitPositionModeButton';
            backButton.textContent = 'â† back to game?';
            Object.assign(backButton.style, {
                position: 'absolute',
                top: '10px',
                left: '10px',
                zIndex: 10000,
                padding: '8px 12px',
                fontSize: '16px',
                pointerEvents: 'auto',
            });
            overlay.appendChild(backButton);
            backButton.onclick = exitPositionMode;
        }
        backButton.style.display = 'block';

        let resetButton = document.getElementById('resetPositionsButton');
        if (!resetButton) {
            resetButton = document.createElement('button');
            resetButton.id = 'resetPositionsButton';
            resetButton.textContent = 'reset positions?';
            Object.assign(resetButton.style, {
                position: 'absolute',
                top: '50px',
                left: '10px',
                zIndex: 10000,
                padding: '8px 12px',
                fontSize: '16px',
                pointerEvents: 'auto',
            });
            overlay.appendChild(resetButton);
            resetButton.onclick = resetControlPositions;
        }
        resetButton.style.display = 'block';

        const buttons = ['button-z', 'button-x', 'button-c'];
        buttons.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const rect = el.getBoundingClientRect();
            el.dataset.originalParent = el.parentElement.id || '';
            el.style.position = 'absolute';
            el.style.left = rect.left + 'px';
            el.style.top = rect.top + 'px';
            el.style.zIndex = 10001;
            el.style.pointerEvents = 'auto';
            document.body.appendChild(el);
            makeDraggable(el);
        });

        const joystick = document.getElementById('joystick-zone');
        if (joystick) {
            joystick.style.position = 'absolute';
            joystick.style.zIndex = 100000;
            joystick.style.pointerEvents = 'auto';
            makeDraggable(joystick);
        }
    };

    window.addEventListener('load', () => {
        if (!localStorage.getItem('controlPositions')) {
            captureDefaultPositions();
        }
    });

    window.addEventListener('load', () => {
        if (getOrientation() === 'portrait') {
            setDefaultBottomLayout();
        }
        ensureDefaultPositionsForAllOrientations();
        loadControlPositions();
    });

    window.addEventListener('load', () => {
        function waitForControlsFn(tries = 20) {
            if (typeof window.createOrUpdateControls === 'function' || tries <= 0) {
                if (getOrientation() === 'portrait') {
                    setDefaultBottomLayout();
                }
                ensureDefaultPositionsForAllOrientations();
                loadControlPositions();
                updateControlPositions(getOrientation());
                if (typeof window.createOrUpdateControls === 'function') {
                    window.createOrUpdateControls();
                }
            } else {
                setTimeout(() => waitForControlsFn(tries - 1), 25);
            }
        }
        waitForControlsFn();
    });

    window.addEventListener('load', () => {
        let fadeOverlay = document.getElementById("fadeOverlay");
        if (!fadeOverlay) {
            fadeOverlay = document.createElement("div");
            fadeOverlay.id = "fadeOverlay";
            Object.assign(fadeOverlay.style, {
                position: "fixed",
                top: "0",
                left: "0",
                width: "100%",
                height: "100%",
                backgroundColor: "black",
                opacity: "0",
                transition: "opacity 0.25s ease",
                pointerEvents: "none",
                zIndex: "9999"
            });
            document.body.appendChild(fadeOverlay);
        }

        let tapCount = 0;
        let tapTimer = null;
        const requiredTaps = 5;
        const tapTimeout = 400;

        document.body.addEventListener('touchstart', (e) => {
            if (e.target.closest('#button-zone') || e.target.closest('#joystick-zone')) {
                return;
            }
            tapCount++;
            clearTimeout(tapTimer);
            tapTimer = setTimeout(() => {
                tapCount = 0;
            }, tapTimeout);
            if (tapCount >= requiredTaps) {
                if (typeof showUI === 'function') {
                    showUI();
                }
                tapCount = 0;
                clearTimeout(tapTimer);
            }
        });

        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            mobileControls.style.display = 'block';
        }

        const buttonZone = document.getElementById('button-zone');
        const joystickZone = document.getElementById('joystick-zone');

        const keyState = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        const keyMap = {
            up: {
                key: 'ArrowUp',
                code: 38
            },
            down: {
                key: 'ArrowDown',
                code: 40
            },
            left: {
                key: 'ArrowLeft',
                code: 37
            },
            right: {
                key: 'ArrowRight',
                code: 39
            }
        };
        let joystick = null;

        function createOrUpdateControls() {
            const joystickZone = document.getElementById('joystick-zone');
            const buttonZone = document.getElementById('button-zone');
            if (!joystickZone || !buttonZone) return;

            const saved = JSON.parse(localStorage.getItem('controlPositions') || '{}');
            const orientation = getOrientation();
            const savedPositions = saved[orientation] || {};

            const buttons = ['button-z', 'button-x', 'button-c'];
            buttons.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                if (savedPositions[id]) {
                    const pos = savedPositions[id];
                    el.style.position = 'absolute';
                    el.style.left = pos.left + 'px';
                    el.style.top = pos.top + 'px';
                    if (el.parentElement !== document.body) {
                        document.body.appendChild(el);
                    }
                    el.dataset.dragged = 'true';
                    el.dataset.initialized = 'true';
                }
            });

            const jpos = savedPositions['joystick-zone'];
            if (jpos) {
                const j = document.getElementById('joystick-zone');
                if (j) {
                    j.style.position = 'absolute';
                    j.style.left = jpos.left + 'px';
                    j.style.top = jpos.top + 'px';
                    if (jpos.width) j.style.width = jpos.width + 'px';
                    if (jpos.height) j.style.height = jpos.height + 'px';
                    if (j.parentElement !== document.body) {
                        document.body.appendChild(j);
                    }
                    j.dataset.dragged = 'true';
                    j.dataset.initialized = 'true';
                }
            }

            if (!window.positionMode) {
                joystickZone.innerHTML = '';
                if (window.dpadMode) {
                    createDpad();
                } else {
                    createJoystick();
                }
            }
        }
        window.createOrUpdateControls = createOrUpdateControls;

        function createJoystick() {
            const zone = document.getElementById('joystick-zone');
            if (!zone) return;
            zone.style.width = '195px';
            zone.style.height = '195px';
            zone.style.overflow = 'visible';

            if (joystick && joystick.destroy) {
                joystick.destroy();
            }
            joystick = new JoyStick('joystick-zone', {
                internalFillColor: 'rgba(255,255,255,0)',
                internalStrokeColor: 'rgba(255,255,255,0.4)',
                externalStrokeColor: 'rgba(255,255,255,0.15)',
            }, (stickStatus) => {
                const x = stickStatus.x / 100;
                const y = stickStatus.y / 100;
                const threshold = 0.3;
                const newKeyState = {
                    up: false,
                    down: false,
                    left: false,
                    right: false
                };
                if (y > threshold) newKeyState.up = true;
                if (y < -threshold) newKeyState.down = true;
                if (x < -threshold) newKeyState.left = true;
                if (x > threshold) newKeyState.right = true;
                updateKeyState(newKeyState);
            });
        }

        function createDpad() {
            joystickZone.innerHTML = '';
            joystickZone.style.display = 'flex';
            joystickZone.style.alignItems = 'center';
            joystickZone.style.justifyContent = 'center';

            const dpadContainer = document.createElement('div');
            dpadContainer.style.position = 'relative';
            const isPortrait = window.innerHeight > window.innerWidth;
            if (isPortrait) {
                dpadContainer.style.width = '120px';
                dpadContainer.style.height = '120px';
                dpadContainer.style.transform = 'translate(20px, -17.5px)';
            } else {
                dpadContainer.style.width = '180px';
                dpadContainer.style.height = '180px';
            }
            dpadContainer.style.display = 'flex';
            dpadContainer.style.alignItems = 'center';
            dpadContainer.style.justifyContent = 'center';
            joystickZone.appendChild(dpadContainer);

            const directionsMap = {
                up: {
                    top: '5.5%',
                    left: '50%',
                    img: '/spr/dpad_up.svg',
                    imgPressed: '/spr/dpad_up-pressed.svg'
                },
                down: {
                    top: '95.5%',
                    left: '50%',
                    img: '/spr/dpad_down.svg',
                    imgPressed: '/spr/dpad_down-pressed.svg'
                },
                left: {
                    top: '50%',
                    left: '2.5%',
                    img: '/spr/dpad_left.svg',
                    imgPressed: '/spr/dpad_left-pressed.svg'
                },
                right: {
                    top: '50%',
                    left: '96%',
                    img: '/spr/dpad_right.svg',
                    imgPressed: '/spr/dpad_right-pressed.svg'
                },
            };

            const dpadElements = {};
            for (const id in directionsMap) {
                const dir = directionsMap[id];
                const wrapper = document.createElement('div');
                wrapper.style.position = 'absolute';
                wrapper.style.top = dir.top;
                wrapper.style.left = dir.left;
                wrapper.style.transform = 'translate(-50%, -50%)';
                wrapper.style.width = '30%';
                wrapper.style.height = '30%';

                const imgNormal = document.createElement('img');
                imgNormal.src = dir.img;
                imgNormal.style.cssText = 'position:absolute; width:100%; height:100%; opacity:0.5; transition:opacity 0.05s ease;';
                const imgPressed = document.createElement('img');
                imgPressed.src = dir.imgPressed;
                imgPressed.style.cssText = 'position:absolute; width:100%; height:100%; opacity:0; transition:opacity 0.05s ease;';

                wrapper.appendChild(imgNormal);
                wrapper.appendChild(imgPressed);
                dpadContainer.appendChild(wrapper);
                dpadElements[id] = {
                    normal: imgNormal,
                    pressed: imgPressed
                };
            }

            const touchLayer = document.createElement('div');
            touchLayer.style.cssText = 'position:absolute; top:-10%; left:-12.5%; width:124%; height:121%; z-index:10; background:transparent;';
            dpadContainer.appendChild(touchLayer);

            const updateDpadVisualsAndState = (newKeyState) => {
                for (const id in dpadElements) {
                    const elem = dpadElements[id];
                    const pressed = newKeyState[id];
                    elem.normal.style.opacity = pressed ? '0' : '0.5';
                    elem.pressed.style.opacity = pressed ? '0.5' : '0';
                }
                updateKeyState(newKeyState);
            };

            const handleTouch = (e) => {
                e.preventDefault();
                const rect = dpadContainer.getBoundingClientRect();
                const touch = e.touches[0];
                const normalizedX = ((touch.clientX - rect.left) / rect.width - 0.5) * 2;
                const normalizedY = ((touch.clientY - rect.top) / rect.height - 0.5) * 2;
                const threshold = 0.25;
                const newKeyState = {
                    up: false,
                    down: false,
                    left: false,
                    right: false
                };
                if (normalizedY < -threshold) newKeyState.up = true;
                if (normalizedY > threshold) newKeyState.down = true;
                if (normalizedX < -threshold) newKeyState.left = true;
                if (normalizedX > threshold) newKeyState.right = true;
                updateDpadVisualsAndState(newKeyState);
            };

            const handleRelease = (e) => {
                e.preventDefault();
                updateDpadVisualsAndState({
                    up: false,
                    down: false,
                    left: false,
                    right: false
                });
            };

            touchLayer.addEventListener('touchstart', handleTouch, {
                passive: false
            });
            touchLayer.addEventListener('touchmove', handleTouch, {
                passive: false
            });
            touchLayer.addEventListener('touchend', handleRelease, {
                passive: false
            });
            touchLayer.addEventListener('touchcancel', handleRelease, {
                passive: false
            });
        }

        function updateKeyState(newKeyState) {
            for (const dir in keyState) {
                if (keyState[dir] && !newKeyState[dir]) {
                    simulateKeyEvent('keyup', keyMap[dir].key, keyMap[dir].code);
                } else if (!keyState[dir] && newKeyState[dir]) {
                    simulateKeyEvent('keydown', keyMap[dir].key, keyMap[dir].code);
                }
                keyState[dir] = newKeyState[dir];
            }
        }

        function updateControlPositions(orientation) {
            if (window.positionMode) return;
            const isPortrait = orientation === "portrait";
            const joystickZone = document.getElementById('joystick-zone');
            const buttonZone = document.getElementById('button-zone');
            if (!joystickZone || !buttonZone) return;

            if (typeof window.createOrUpdateControls === 'function') {
                window.createOrUpdateControls();
            }

            var buttonSize = 75;
            const buttonGap = 12;

            if (!isPortrait) {
                Object.assign(joystickZone.style, {
                    position: 'absolute',
                    left: '5.5vw',
                    top: '0',
                    width: '25vw',
                    height: '100%'
                });
                Object.assign(buttonZone.style, {
                    position: 'absolute',
                    right: '2vw',
                    top: '0',
                    width: '25vw',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '25px',
                    pointerEvents: 'none',
                    background: 'transparent'
                });
                buttonSize = 90;
            } else {
                Object.assign(joystickZone.style, {
                    position: 'absolute',
                    left: '2vw',
                    bottom: '2vh',
                    width: '30vw',
                    height: '30vw'
                });
                Object.assign(buttonZone.style, {
                    position: 'absolute',
                    right: '2vw',
                    bottom: '2vh',
                    width: (buttonSize + 10) + 'px',
                    height: (buttonSize * 3 + buttonGap * 2) + 'px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: buttonGap + 'px',
                    pointerEvents: 'none',
                    background: 'transparent'
                });
                buttonSize = 75;
            }

            ['button-z', 'button-x', 'button-c'].forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                el.style.width = buttonSize + 'px';
                el.style.height = buttonSize + 'px';
            });
        }
        window.updateControlPositions = updateControlPositions;

        window.addEventListener("orientationchange", () => {
            fadeOverlay.style.opacity = '1';
            if (buttonZone) buttonZone.style.opacity = '0';
            if (joystickZone) joystickZone.style.opacity = '0';
            setTimeout(() => {
                ensureDefaultPositionsForAllOrientations();
                loadControlPositions();
                updateControlPositions(getOrientation());
                if (buttonZone) buttonZone.style.opacity = '1';
                if (joystickZone) joystickZone.style.opacity = '1';
                fadeOverlay.style.opacity = '0';
            }, 500);
        });

        window.addEventListener('resize', () => {
            updateControlPositions(getOrientation());
        });

        updateControlPositions(getOrientation());

        const buttons = [{
            id: 'button-z',
            key: 'z',
            keyCode: 90,
            img_up: '/spr/z.svg',
            img_down: '/spr/z_pressed.svg'
        }, {
            id: 'button-x',
            key: 'x',
            keyCode: 88,
            img_up: '/spr/x.svg',
            img_down: '/spr/x_pressed.svg'
        }, {
            id: 'button-c',
            key: 'c',
            keyCode: 67,
            img_up: '/spr/c.svg',
            img_down: '/spr/c_pressed.svg'
        }, ];

        buttons.forEach(buttonInfo => {
            const buttonElement = document.getElementById(buttonInfo.id);
            if (buttonElement) {
                buttonElement.src = buttonInfo.img_up;
                buttonElement.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    buttonElement.src = buttonInfo.img_down;
                    simulateKeyEvent('keydown', buttonInfo.key, buttonInfo.keyCode);
                }, {
                    passive: false
                });
                buttonElement.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    buttonElement.src = buttonInfo.img_up;
                    simulateKeyEvent('keyup', buttonInfo.key, buttonInfo.keyCode);
                }, {
                    passive: false
                });
            }
        });
    });
}
