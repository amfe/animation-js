# The API

```javascript
import Animation from 'animation-js';
```

## Constrcutor

### new Animation(duration, timingFunction, frames)

create animation object

```jsdoc
初始化一个动画实例
@param {Number} duration       动画时间，单位毫秒
@param {String|Array|Function} timingFunction 时间函数，支持标准的时间函数名、贝塞尔曲线数组（需要lib.cubicbezier库支持）以及自定义函数
@param {Function} frames       每一帧执行的函数
```

## Methods

## frame()

return a frame

```jsdoc
@return {Function} a frame
```

## requestFrame()

return a requestFrame

```jsdoc
@return {Function} a requestFrame
```

