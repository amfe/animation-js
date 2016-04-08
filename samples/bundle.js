require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.generate = generate;
function generate(p1x, p1y, p2x, p2y) {
    var ZERO_LIMIT = 1e-6;
    // Calculate the polynomial coefficients,
    // implicit first and last control points are (0,0) and (1,1).
    var ax = 3 * p1x - 3 * p2x + 1;
    var bx = 3 * p2x - 6 * p1x;
    var cx = 3 * p1x;

    var ay = 3 * p1y - 3 * p2y + 1;
    var by = 3 * p2y - 6 * p1y;
    var cy = 3 * p1y;

    function sampleCurveDerivativeX(t) {
        // `ax t^3 + bx t^2 + cx t' expanded using Horner 's rule.
        return (3 * ax * t + 2 * bx) * t + cx;
    }

    function sampleCurveX(t) {
        return ((ax * t + bx) * t + cx) * t;
    }

    function sampleCurveY(t) {
        return ((ay * t + by) * t + cy) * t;
    }

    // Given an x value, find a parametric value it came from.
    function solveCurveX(x) {
        var t2 = x;
        var derivative;
        var x2;

        // https://trac.webkit.org/browser/trunk/Source/WebCore/platform/animation
        // First try a few iterations of Newton's method -- normally very fast.
        // http://en.wikipedia.org/wiki/Newton's_method
        for (var i = 0; i < 8; i++) {
            // f(t)-x=0
            x2 = sampleCurveX(t2) - x;
            if (Math.abs(x2) < ZERO_LIMIT) {
                return t2;
            }
            derivative = sampleCurveDerivativeX(t2);
            // == 0, failure
            /* istanbul ignore if */
            if (Math.abs(derivative) < ZERO_LIMIT) {
                break;
            }
            t2 -= x2 / derivative;
        }

        // Fall back to the bisection method for reliability.
        // bisection
        // http://en.wikipedia.org/wiki/Bisection_method
        var t1 = 1;
        /* istanbul ignore next */
        var t0 = 0;

        /* istanbul ignore next */
        t2 = x;
        /* istanbul ignore next */
        while (t1 > t0) {
            x2 = sampleCurveX(t2) - x;
            if (Math.abs(x2) < ZERO_LIMIT) {
                return t2;
            }
            if (x2 > 0) {
                t1 = t2;
            } else {
                t0 = t2;
            }
            t2 = (t1 + t0) / 2;
        }

        // Failure
        return t2;
    }

    function solve(x) {
        return sampleCurveY(solveCurveX(x));
    }

    return solve;
}

var linear = exports.linear = generate(0, 0, 1, 1);
var ease = exports.ease = generate(.25, .1, .25, 1);
var easeIn = exports.easeIn = generate(.42, 0, 1, 1);
var easeOut = exports.easeOut = generate(0, 0, .58, 1);
var easeInOut = exports.easeInOut = generate(.42, 0, .58, 1);
},{}],"animation-js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _amfeCubicbezier = require('amfe-cubicbezier');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var FPS = 60;
var INTERVAL = 1000 / FPS;

function setTimeoutFrame(cb) {
    return setTimeout(cb, INTERVAL);
}

function clearTimeoutFrame(tick) {
    clearTimeout(tick);
}

var requestAnimationFrame = window.requestAnimationFrame || window.msRequestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || setTimeoutFrame;

var cancelAnimationFrame = window.cancelAnimationFrame || window.msCancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || clearTimeoutFrame;

if (requestAnimationFrame === setTimeoutFrame || cancelAnimationFrame === clearTimeoutFrame) {
    requestAnimationFrame = setTimeoutFrame;
    cancelAnimationFrame = clearTimeoutFrame;
}

function PromiseDefer() {
    var deferred = {};
    var promise = new Promise(function (resolve, reject) {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });
    deferred.promise = promise;
    return deferred;
}

function PromiseMixin(promise, context) {
    var _promise = promise;
    ['then', 'catch'].forEach(function (method) {
        context[method] = function () {
            return promise[method].apply(_promise, arguments);
        };
    });
    return context;
}

function getFrameQueue(duration, frames) {
    if (typeof frames === 'function') {
        frames = {
            '0': frames
        };
    }

    var frameCount = duration / INTERVAL;
    var framePercent = 1 / frameCount;
    var frameQueue = [];
    var frameKeys = Object.keys(frames).map(function (i) {
        return parseInt(i);
    });

    for (var i = 0; i < frameCount; i++) {
        var key = frameKeys[0];
        var percent = framePercent * i;
        if (key !== null && key <= percent * 100) {
            var frame = frames[key.toString()];
            if (!(frame instanceof Frame)) {
                frame = new Frame(frame);
            }
            frameQueue.push(frame);
            frameKeys.shift();
        } else if (frameQueue.length) {
            frameQueue.push(frameQueue[frameQueue.length - 1].clone());
        }
    }

    return frameQueue;
}

function getBezier(timingFunction) {
    var bezier;
    if (typeof timingFunction === 'string' || timingFunction instanceof Array) {
        if (_amfeCubicbezier.Bezier) {
            //console.error('require amfe-cubicbezier');
        } else {
                if (typeof timingFunction === 'string') {
                    if (_amfeCubicbezier.Bezier[timingFunction]) {
                        bezier = _amfeCubicbezier.Bezier[timingFunction];
                    }
                } else if (timingFunction instanceof Array && timingFunction.length === 4) {
                    bezier = _amfeCubicbezier.Bezier.apply(_amfeCubicbezier.Bezier, timingFunction);
                }
            }
    } else if (typeof timingFunction === 'function') {
        bezier = timingFunction;
    }

    return bezier;
}

/**
 * 构造一个帧对象
 * @class lib.animation~Frame
 * @param {Function} fun 当前帧执行的函数
 */
function Frame(fun) {
    var defer;
    var tick;
    var isCancel = false;

    /**
     * 执行帧
     * @method request
     * @instance
     * @memberOf lib.animation~Frame
     * @return {lib.animation~Frame} 当前实例
     */
    this.request = function () {
        isCancel = false;
        var args = arguments;

        defer = PromiseDefer();
        PromiseMixin(defer.promise, this);

        tick = requestAnimationFrame(function () {
            if (isCancel) {
                return;
            }
            defer && defer.resolve(fun.apply(window, args));
        });

        return this;
    };

    /**
     * 取消执行
     * @method cancel
     * @instance
     * @memberOf lib.animation~Frame
     * @return {lib.animation~Frame} 当前实例
     */
    this.cancel = function () {
        if (tick) {
            isCancel = true;
            cancelAnimationFrame(tick);
            defer && defer.reject('CANCEL');
        }

        return this;
    };

    /**
     * 复制一个帧实例
     * @method clone
     * @instance
     * @memberOf lib.animation~Frame
     * @return {lib.animation~Frame} 新实例
     */
    this.clone = function () {
        return new Frame(fun);
    };
}

var animation = function () {

    /**
     * 初始化一个动画实例
     * @method animation
     * @memberOf lib
     * @param {Number} duration       动画时间，单位毫秒
     * @param {String|Array|Function} timingFunction 时间函数，支持标准的时间函数名、贝塞尔曲线数组（需要lib.cubicbezier库支持）以及自定义函数
     * @param {Function} frames       每一帧执行的函数
     * @property {Function} frame 初始化一个帧实例
     * @property {Function} requestFrame 立即请求帧
     * @return {lib.animation~Animation}            Animation实例
     */

    function animation(duration, timingFunction, frames) {
        _classCallCheck(this, animation);

        var defer;
        var frameQueue = getFrameQueue(duration, frames);
        var framePercent = 1 / (duration / INTERVAL);
        var frameIndex = 0;
        var bezier = getBezier(timingFunction);

        if (!bezier) {
            throw new Error('unexcept timing function');
        }

        var isPlaying = false;
        /**
         * 播放动画
         * @method play
         * @return {lib.animation~Animation} this 当前实例
         * @instance
         * @memberOf lib.animation~Animation
         */
        this.play = function () {
            if (isPlaying) {
                return;
            }
            isPlaying = true;

            if (!defer) {
                defer = PromiseDefer();
                PromiseMixin(defer.promise, this);
            }

            function request() {
                var percent = framePercent * (frameIndex + 1).toFixed(10);
                var currentFrame = frameQueue[frameIndex];

                currentFrame.request(percent.toFixed(10), timingFunction(percent).toFixed(10)).then(function () {
                    if (!isPlaying) {
                        return;
                    }

                    if (frameIndex === frameQueue.length - 1) {
                        isPlaying = false;
                        defer && defer.resolve('FINISH');
                        defer = null;
                    } else {
                        frameIndex++;
                        request();
                    }
                }, function () {
                    // CANCEL
                });
            }

            request();
            return this;
        };

        /**
         * 暂停动画
         * @method stop
         * @return {lib.animation~Animation} this 当前实例
         * @instance
         * @memberOf lib.animation~Animation
         */
        this.stop = function () {
            if (!isPlaying) {
                return;
            }
            isPlaying = false;

            if (frameQueue[frameIndex]) {
                frameQueue[frameIndex].cancel();
            }
            return this;
        };
    }
    /**
     * 构造一个帧对象
     * @class lib.animation~Frame
     * @param {Function} fun 当前帧执行的函数
     */


    _createClass(animation, [{
        key: 'frame',
        value: function frame(fun) {
            return new Frame(fun);
        }
    }, {
        key: 'requestFrame',
        value: function requestFrame(fun) {
            var frame = new Frame(fun);
            return frame.request();
        }
    }]);

    return animation;
}();

exports.default = animation;

},{"amfe-cubicbezier":1}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYW1mZS1jdWJpY2Jlemllci9zcmMvaW5kZXguanMiLCJzcmMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7Ozs7Ozs7O0FBRUE7Ozs7QUFFQSxJQUFNLE1BQU0sRUFBTjtBQUNOLElBQUksV0FBVyxPQUFPLEdBQVA7O0FBRWYsU0FBUyxlQUFULENBQXlCLEVBQXpCLEVBQTZCO0FBQ3pCLFdBQU8sV0FBVyxFQUFYLEVBQWUsUUFBZixDQUFQLENBRHlCO0NBQTdCOztBQUlBLFNBQVMsaUJBQVQsQ0FBMkIsSUFBM0IsRUFBaUM7QUFDN0IsaUJBQWEsSUFBYixFQUQ2QjtDQUFqQzs7QUFJQSxJQUFJLHdCQUNBLE9BQU8scUJBQVAsSUFDQSxPQUFPLHVCQUFQLElBQ0EsT0FBTywyQkFBUCxJQUNB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LEVBQVc7QUFDWCwrQkFEVztxQkFBZjs7QUFJQSx3QkFBSSxlQUFlLFdBQVcsTUFBWCxHQUFvQixDQUFwQixFQUF1QjtBQUN0QyxvQ0FBWSxLQUFaLENBRHNDO0FBRXRDLGlDQUFTLE1BQU0sT0FBTixDQUFjLFFBQWQsQ0FBVCxDQUZzQztBQUd0QyxnQ0FBUSxJQUFSLENBSHNDO3FCQUExQyxNQUlPO0FBQ0gscUNBREc7QUFFSCxrQ0FGRztxQkFKUDtpQkFMRSxFQWFILFlBQU07O2lCQUFOLENBZlAsQ0FKZTthQUFuQjs7QUF3QkEsc0JBbkNtQjtBQW9DbkIsbUJBQU8sSUFBUCxDQXBDbUI7U0FBWDs7Ozs7Ozs7O0FBbkI4QixZQWlFMUMsQ0FBSyxJQUFMLEdBQVksWUFBVztBQUNuQixnQkFBSSxDQUFDLFNBQUQsRUFBWTtBQUNaLHVCQURZO2FBQWhCO0FBR0Esd0JBQVksS0FBWixDQUptQjs7QUFNbkIsZ0JBQUksV0FBVyxVQUFYLENBQUosRUFBNEI7QUFDeEIsMkJBQVcsVUFBWCxFQUF1QixNQUF2QixHQUR3QjthQUE1QjtBQUdBLG1CQUFPLElBQVAsQ0FUbUI7U0FBWCxDQWpFOEI7S0FBOUM7Ozs7Ozs7O2lCQWJpQjs7OEJBK0ZWLEtBQUk7QUFDUCxtQkFBTyxJQUFJLEtBQUosQ0FBVSxHQUFWLENBQVAsQ0FETzs7OztxQ0FJRyxLQUFLO0FBQ2YsZ0JBQUksUUFBUSxJQUFJLEtBQUosQ0FBVSxHQUFWLENBQVIsQ0FEVztBQUVmLG1CQUFPLE1BQU0sT0FBTixFQUFQLENBRmU7Ozs7V0FuR0YiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmdlbmVyYXRlID0gZ2VuZXJhdGU7XG5mdW5jdGlvbiBnZW5lcmF0ZShwMXgsIHAxeSwgcDJ4LCBwMnkpIHtcbiAgICB2YXIgWkVST19MSU1JVCA9IDFlLTY7XG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBwb2x5bm9taWFsIGNvZWZmaWNpZW50cyxcbiAgICAvLyBpbXBsaWNpdCBmaXJzdCBhbmQgbGFzdCBjb250cm9sIHBvaW50cyBhcmUgKDAsMCkgYW5kICgxLDEpLlxuICAgIHZhciBheCA9IDMgKiBwMXggLSAzICogcDJ4ICsgMTtcbiAgICB2YXIgYnggPSAzICogcDJ4IC0gNiAqIHAxeDtcbiAgICB2YXIgY3ggPSAzICogcDF4O1xuXG4gICAgdmFyIGF5ID0gMyAqIHAxeSAtIDMgKiBwMnkgKyAxO1xuICAgIHZhciBieSA9IDMgKiBwMnkgLSA2ICogcDF5O1xuICAgIHZhciBjeSA9IDMgKiBwMXk7XG5cbiAgICBmdW5jdGlvbiBzYW1wbGVDdXJ2ZURlcml2YXRpdmVYKHQpIHtcbiAgICAgICAgLy8gYGF4IHReMyArIGJ4IHReMiArIGN4IHQnIGV4cGFuZGVkIHVzaW5nIEhvcm5lciAncyBydWxlLlxuICAgICAgICByZXR1cm4gKDMgKiBheCAqIHQgKyAyICogYngpICogdCArIGN4O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNhbXBsZUN1cnZlWCh0KSB7XG4gICAgICAgIHJldHVybiAoKGF4ICogdCArIGJ4KSAqIHQgKyBjeCkgKiB0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNhbXBsZUN1cnZlWSh0KSB7XG4gICAgICAgIHJldHVybiAoKGF5ICogdCArIGJ5KSAqIHQgKyBjeSkgKiB0O1xuICAgIH1cblxuICAgIC8vIEdpdmVuIGFuIHggdmFsdWUsIGZpbmQgYSBwYXJhbWV0cmljIHZhbHVlIGl0IGNhbWUgZnJvbS5cbiAgICBmdW5jdGlvbiBzb2x2ZUN1cnZlWCh4KSB7XG4gICAgICAgIHZhciB0MiA9IHg7XG4gICAgICAgIHZhciBkZXJpdmF0aXZlO1xuICAgICAgICB2YXIgeDI7XG5cbiAgICAgICAgLy8gaHR0cHM6Ly90cmFjLndlYmtpdC5vcmcvYnJvd3Nlci90cnVuay9Tb3VyY2UvV2ViQ29yZS9wbGF0Zm9ybS9hbmltYXRpb25cbiAgICAgICAgLy8gRmlyc3QgdHJ5IGEgZmV3IGl0ZXJhdGlvbnMgb2YgTmV3dG9uJ3MgbWV0aG9kIC0tIG5vcm1hbGx5IHZlcnkgZmFzdC5cbiAgICAgICAgLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9OZXd0b24nc19tZXRob2RcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCA4OyBpKyspIHtcbiAgICAgICAgICAgIC8vIGYodCkteD0wXG4gICAgICAgICAgICB4MiA9IHNhbXBsZUN1cnZlWCh0MikgLSB4O1xuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHgyKSA8IFpFUk9fTElNSVQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdDI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZXJpdmF0aXZlID0gc2FtcGxlQ3VydmVEZXJpdmF0aXZlWCh0Mik7XG4gICAgICAgICAgICAvLyA9PSAwLCBmYWlsdXJlXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgICAgICAgIGlmIChNYXRoLmFicyhkZXJpdmF0aXZlKSA8IFpFUk9fTElNSVQpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHQyIC09IHgyIC8gZGVyaXZhdGl2ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGwgYmFjayB0byB0aGUgYmlzZWN0aW9uIG1ldGhvZCBmb3IgcmVsaWFiaWxpdHkuXG4gICAgICAgIC8vIGJpc2VjdGlvblxuICAgICAgICAvLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Jpc2VjdGlvbl9tZXRob2RcbiAgICAgICAgdmFyIHQxID0gMTtcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICAgICAgdmFyIHQwID0gMDtcblxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgICAgICB0MiA9IHg7XG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICAgIHdoaWxlICh0MSA+IHQwKSB7XG4gICAgICAgICAgICB4MiA9IHNhbXBsZUN1cnZlWCh0MikgLSB4O1xuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHgyKSA8IFpFUk9fTElNSVQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdDI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoeDIgPiAwKSB7XG4gICAgICAgICAgICAgICAgdDEgPSB0MjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdDAgPSB0MjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHQyID0gKHQxICsgdDApIC8gMjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhaWx1cmVcbiAgICAgICAgcmV0dXJuIHQyO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNvbHZlKHgpIHtcbiAgICAgICAgcmV0dXJuIHNhbXBsZUN1cnZlWShzb2x2ZUN1cnZlWCh4KSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNvbHZlO1xufVxuXG52YXIgbGluZWFyID0gZXhwb3J0cy5saW5lYXIgPSBnZW5lcmF0ZSgwLCAwLCAxLCAxKTtcbnZhciBlYXNlID0gZXhwb3J0cy5lYXNlID0gZ2VuZXJhdGUoLjI1LCAuMSwgLjI1LCAxKTtcbnZhciBlYXNlSW4gPSBleHBvcnRzLmVhc2VJbiA9IGdlbmVyYXRlKC40MiwgMCwgMSwgMSk7XG52YXIgZWFzZU91dCA9IGV4cG9ydHMuZWFzZU91dCA9IGdlbmVyYXRlKDAsIDAsIC41OCwgMSk7XG52YXIgZWFzZUluT3V0ID0gZXhwb3J0cy5lYXNlSW5PdXQgPSBnZW5lcmF0ZSguNDIsIDAsIC41OCwgMSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQge0Jlemllcn0gZnJvbSAnYW1mZS1jdWJpY2Jlemllcic7XG5cbmNvbnN0IEZQUyA9IDYwO1xudmFyIElOVEVSVkFMID0gMTAwMCAvIEZQUztcblxuZnVuY3Rpb24gc2V0VGltZW91dEZyYW1lKGNiKSB7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoY2IsIElOVEVSVkFMKTtcbn1cblxuZnVuY3Rpb24gY2xlYXJUaW1lb3V0RnJhbWUodGljaykge1xuICAgIGNsZWFyVGltZW91dCh0aWNrKTtcbn1cblxudmFyIHJlcXVlc3RBbmltYXRpb25GcmFtZSA9XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIHdpbmRvdy5tc1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgc2V0VGltZW91dEZyYW1lO1xuXG5cbnZhciBjYW5jZWxBbmltYXRpb25GcmFtZSA9XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgd2luZG93Lm1zQ2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcbiAgICB3aW5kb3cud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcbiAgICB3aW5kb3cubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcbiAgICBjbGVhclRpbWVvdXRGcmFtZTtcblxuaWYgKHJlcXVlc3RBbmltYXRpb25GcmFtZSA9PT0gc2V0VGltZW91dEZyYW1lIHx8IGNhbmNlbEFuaW1hdGlvbkZyYW1lID09PSBjbGVhclRpbWVvdXRGcmFtZSkge1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHNldFRpbWVvdXRGcmFtZTtcbiAgICBjYW5jZWxBbmltYXRpb25GcmFtZSA9IGNsZWFyVGltZW91dEZyYW1lO1xufVxuXG5mdW5jdGlvbiBQcm9taXNlRGVmZXIoKSB7XG4gICAgdmFyIGRlZmVycmVkID0ge307XG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QgPSByZWplY3Q7XG4gICAgfSk7XG4gICAgZGVmZXJyZWQucHJvbWlzZSA9IHByb21pc2U7XG4gICAgcmV0dXJuIGRlZmVycmVkO1xufVxuXG5mdW5jdGlvbiBQcm9taXNlTWl4aW4ocHJvbWlzZSwgY29udGV4dCkge1xuICAgIHZhciBfcHJvbWlzZSA9IHByb21pc2U7XG4gICAgWyd0aGVuJywgJ2NhdGNoJ10uZm9yRWFjaCgobWV0aG9kKSA9PiB7XG4gICAgICAgIGNvbnRleHRbbWV0aG9kXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHByb21pc2VbbWV0aG9kXS5hcHBseShfcHJvbWlzZSwgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICB9KTtcbiAgICByZXR1cm4gY29udGV4dDtcbn1cblxuXG5mdW5jdGlvbiBnZXRGcmFtZVF1ZXVlKGR1cmF0aW9uLCBmcmFtZXMpIHtcbiAgICBpZiAodHlwZW9mIGZyYW1lcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBmcmFtZXMgPSB7XG4gICAgICAgICAgICAnMCc6IGZyYW1lc1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHZhciBmcmFtZUNvdW50ID0gZHVyYXRpb24gLyBJTlRFUlZBTDtcbiAgICB2YXIgZnJhbWVQZXJjZW50ID0gMSAvIGZyYW1lQ291bnQ7XG4gICAgdmFyIGZyYW1lUXVldWUgPSBbXTtcbiAgICB2YXIgZnJhbWVLZXlzID0gT2JqZWN0LmtleXMoZnJhbWVzKS5tYXAoaSA9PiBwYXJzZUludChpKSk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZyYW1lQ291bnQ7IGkrKykge1xuICAgICAgICB2YXIga2V5ID0gZnJhbWVLZXlzWzBdO1xuICAgICAgICB2YXIgcGVyY2VudCA9IGZyYW1lUGVyY2VudCAqIGk7XG4gICAgICAgIGlmIChrZXkgIT09IG51bGwgJiYga2V5IDw9IHBlcmNlbnQgKiAxMDApIHtcbiAgICAgICAgICAgIHZhciBmcmFtZSA9IGZyYW1lc1trZXkudG9TdHJpbmcoKV07XG4gICAgICAgICAgICBpZiAoIShmcmFtZSBpbnN0YW5jZW9mIEZyYW1lKSkge1xuICAgICAgICAgICAgICAgIGZyYW1lID0gbmV3IEZyYW1lKGZyYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZyYW1lUXVldWUucHVzaChmcmFtZSk7XG4gICAgICAgICAgICBmcmFtZUtleXMuc2hpZnQoKTtcbiAgICAgICAgfSBlbHNlIGlmIChmcmFtZVF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgZnJhbWVRdWV1ZS5wdXNoKGZyYW1lUXVldWVbZnJhbWVRdWV1ZS5sZW5ndGggLSAxXS5jbG9uZSgpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmcmFtZVF1ZXVlO1xufVxuXG5mdW5jdGlvbiBnZXRCZXppZXIodGltaW5nRnVuY3Rpb24pIHtcbiAgICB2YXIgYmV6aWVyO1xuICAgIGlmICh0eXBlb2YgdGltaW5nRnVuY3Rpb24gPT09ICdzdHJpbmcnIHx8IHRpbWluZ0Z1bmN0aW9uIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgaWYgKEJlemllcikge1xuICAgICAgICAgICAgLy9jb25zb2xlLmVycm9yKCdyZXF1aXJlIGFtZmUtY3ViaWNiZXppZXInKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGltaW5nRnVuY3Rpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgaWYgKEJlemllclt0aW1pbmdGdW5jdGlvbl0pIHtcbiAgICAgICAgICAgICAgICAgICAgYmV6aWVyID0gQmV6aWVyW3RpbWluZ0Z1bmN0aW9uXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRpbWluZ0Z1bmN0aW9uIGluc3RhbmNlb2YgQXJyYXkgJiYgdGltaW5nRnVuY3Rpb24ubGVuZ3RoID09PSA0KXtcbiAgICAgICAgICAgICAgICBiZXppZXIgPSBCZXppZXIuYXBwbHkoQmV6aWVyLCB0aW1pbmdGdW5jdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aW1pbmdGdW5jdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBiZXppZXIgPSB0aW1pbmdGdW5jdGlvbjtcbiAgICB9XG5cbiAgICByZXR1cm4gYmV6aWVyO1xufVxuXG4vKipcbiAqIOaehOmAoOS4gOS4quW4p+WvueixoVxuICogQGNsYXNzIGxpYi5hbmltYXRpb25+RnJhbWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1biDlvZPliY3luKfmiafooYznmoTlh73mlbBcbiAqL1xuZnVuY3Rpb24gRnJhbWUoZnVuKSB7XG4gICAgdmFyIGRlZmVyO1xuICAgIHZhciB0aWNrO1xuICAgIHZhciBpc0NhbmNlbCA9ZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiDmiafooYzluKdcbiAgICAgKiBAbWV0aG9kIHJlcXVlc3RcbiAgICAgKiBAaW5zdGFuY2VcbiAgICAgKiBAbWVtYmVyT2YgbGliLmFuaW1hdGlvbn5GcmFtZVxuICAgICAqIEByZXR1cm4ge2xpYi5hbmltYXRpb25+RnJhbWV9IOW9k+WJjeWunuS+i1xuICAgICAqL1xuICAgIHRoaXMucmVxdWVzdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpc0NhbmNlbCA9IGZhbHNlO1xuICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcblxuICAgICAgICBkZWZlciA9IFByb21pc2VEZWZlcigpO1xuICAgICAgICBQcm9taXNlTWl4aW4oZGVmZXIucHJvbWlzZSwgdGhpcyk7XG5cbiAgICAgICAgdGljayA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNDYW5jZWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZlciAmJiBkZWZlci5yZXNvbHZlKGZ1bi5hcHBseSh3aW5kb3csIGFyZ3MpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIOWPlua2iOaJp+ihjFxuICAgICAqIEBtZXRob2QgY2FuY2VsXG4gICAgICogQGluc3RhbmNlXG4gICAgICogQG1lbWJlck9mIGxpYi5hbmltYXRpb25+RnJhbWVcbiAgICAgKiBAcmV0dXJuIHtsaWIuYW5pbWF0aW9ufkZyYW1lfSDlvZPliY3lrp7kvotcbiAgICAgKi9cbiAgICB0aGlzLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGljaykge1xuICAgICAgICAgICAgaXNDYW5jZWwgPSB0cnVlO1xuICAgICAgICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUodGljayk7XG4gICAgICAgICAgICBkZWZlciAmJiBkZWZlci5yZWplY3QoJ0NBTkNFTCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIOWkjeWItuS4gOS4quW4p+WunuS+i1xuICAgICAqIEBtZXRob2QgY2xvbmVcbiAgICAgKiBAaW5zdGFuY2VcbiAgICAgKiBAbWVtYmVyT2YgbGliLmFuaW1hdGlvbn5GcmFtZVxuICAgICAqIEByZXR1cm4ge2xpYi5hbmltYXRpb25+RnJhbWV9IOaWsOWunuS+i1xuICAgICAqL1xuICAgIHRoaXMuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFtZShmdW4pO1xuICAgIH07XG59XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgYW5pbWF0aW9uIHtcblxuICAgIC8qKlxuICAgICAqIOWIneWni+WMluS4gOS4quWKqOeUu+WunuS+i1xuICAgICAqIEBtZXRob2QgYW5pbWF0aW9uXG4gICAgICogQG1lbWJlck9mIGxpYlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBkdXJhdGlvbiAgICAgICDliqjnlLvml7bpl7TvvIzljZXkvY3mr6vnp5JcbiAgICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheXxGdW5jdGlvbn0gdGltaW5nRnVuY3Rpb24g5pe26Ze05Ye95pWw77yM5pSv5oyB5qCH5YeG55qE5pe26Ze05Ye95pWw5ZCN44CB6LSd5aGe5bCU5puy57q/5pWw57uE77yI6ZyA6KaBbGliLmN1YmljYmV6aWVy5bqT5pSv5oyB77yJ5Lul5Y+K6Ieq5a6a5LmJ5Ye95pWwXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnJhbWVzICAgICAgIOavj+S4gOW4p+aJp+ihjOeahOWHveaVsFxuICAgICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGZyYW1lIOWIneWni+WMluS4gOS4quW4p+WunuS+i1xuICAgICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHJlcXVlc3RGcmFtZSDnq4vljbPor7fmsYLluKdcbiAgICAgKiBAcmV0dXJuIHtsaWIuYW5pbWF0aW9ufkFuaW1hdGlvbn0gICAgICAgICAgICBBbmltYXRpb27lrp7kvotcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihkdXJhdGlvbiwgdGltaW5nRnVuY3Rpb24sIGZyYW1lcykge1xuICAgICAgICB2YXIgZGVmZXI7XG4gICAgICAgIHZhciBmcmFtZVF1ZXVlID0gZ2V0RnJhbWVRdWV1ZShkdXJhdGlvbiwgZnJhbWVzKTtcbiAgICAgICAgdmFyIGZyYW1lUGVyY2VudCA9IDEgLyAoZHVyYXRpb24gLyBJTlRFUlZBTCk7XG4gICAgICAgIHZhciBmcmFtZUluZGV4ID0gMDtcbiAgICAgICAgdmFyIGJlemllciA9IGdldEJlemllcih0aW1pbmdGdW5jdGlvbik7XG5cbiAgICAgICAgaWYgKCFiZXppZXIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndW5leGNlcHQgdGltaW5nIGZ1bmN0aW9uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaXNQbGF5aW5nID0gZmFsc2U7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiDmkq3mlL7liqjnlLtcbiAgICAgICAgICogQG1ldGhvZCBwbGF5XG4gICAgICAgICAqIEByZXR1cm4ge2xpYi5hbmltYXRpb25+QW5pbWF0aW9ufSB0aGlzIOW9k+WJjeWunuS+i1xuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICogQG1lbWJlck9mIGxpYi5hbmltYXRpb25+QW5pbWF0aW9uXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnBsYXkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChpc1BsYXlpbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpc1BsYXlpbmcgPSB0cnVlO1xuXG4gICAgICAgICAgICBpZiAoIWRlZmVyKSB7XG4gICAgICAgICAgICAgICAgZGVmZXIgPSBQcm9taXNlRGVmZXIoKTtcbiAgICAgICAgICAgICAgICBQcm9taXNlTWl4aW4oZGVmZXIucHJvbWlzZSwgdGhpcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlcXVlc3QoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBlcmNlbnQgPSBmcmFtZVBlcmNlbnQgKiAoZnJhbWVJbmRleCArIDEpLnRvRml4ZWQoMTApO1xuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50RnJhbWUgPSBmcmFtZVF1ZXVlW2ZyYW1lSW5kZXhdO1xuXG4gICAgICAgICAgICAgICAgY3VycmVudEZyYW1lXG4gICAgICAgICAgICAgICAgICAgIC5yZXF1ZXN0KHBlcmNlbnQudG9GaXhlZCgxMCksIHRpbWluZ0Z1bmN0aW9uKHBlcmNlbnQpLnRvRml4ZWQoMTApKVxuICAgICAgICAgICAgICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzUGxheWluZyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZnJhbWVJbmRleCA9PT0gZnJhbWVRdWV1ZS5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNQbGF5aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXIgJiYgZGVmZXIucmVzb2x2ZSgnRklOSVNIJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXIgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDQU5DRUxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlcXVlc3QoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiDmmoLlgZzliqjnlLtcbiAgICAgICAgICogQG1ldGhvZCBzdG9wXG4gICAgICAgICAqIEByZXR1cm4ge2xpYi5hbmltYXRpb25+QW5pbWF0aW9ufSB0aGlzIOW9k+WJjeWunuS+i1xuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICogQG1lbWJlck9mIGxpYi5hbmltYXRpb25+QW5pbWF0aW9uXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICghaXNQbGF5aW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaXNQbGF5aW5nID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmIChmcmFtZVF1ZXVlW2ZyYW1lSW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgZnJhbWVRdWV1ZVtmcmFtZUluZGV4XS5jYW5jZWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiDmnoTpgKDkuIDkuKrluKflr7nosaFcbiAgICAgKiBAY2xhc3MgbGliLmFuaW1hdGlvbn5GcmFtZVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1biDlvZPliY3luKfmiafooYznmoTlh73mlbBcbiAgICAgKi9cbiAgICBmcmFtZSAoZnVuKXtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFtZShmdW4pO1xuICAgIH1cblxuICAgIHJlcXVlc3RGcmFtZSAoZnVuKSB7XG4gICAgICAgIHZhciBmcmFtZSA9IG5ldyBGcmFtZShmdW4pO1xuICAgICAgICByZXR1cm4gZnJhbWUucmVxdWVzdCgpO1xuICAgIH1cbn0iXX0=
