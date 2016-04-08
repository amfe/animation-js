# Getting Started

## Install

```shell
tnpm install animation-js --save
```

## Usage

```javascript
import Animation from 'animation-js'
import * as cubicbezier from 'amfe-cubicbezier';
```

## Samples

Initializing:

```javascript
var animation = Animation(
        1000,                   // duration(ms)
        cubicbezier.ease,   // timingFunction
        function(i1, i2) {      // frame
            console.log(i1, i2);
        }
    );
animation.play().then(function() {
   console.log('end');
});
```