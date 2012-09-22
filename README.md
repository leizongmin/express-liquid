English user [see here](https://github.com/leizongmin/express-liquid/blob/master/README_en.md)
===============

Express-Liquid
==============

[![Build Status](https://secure.travis-ci.org/leizongmin/express-liquid.png?branch=master)](http://travis-ci.org/leizongmin/express-liquid)



安装
==============

    npm install express-liquid



在Express 3.x中使用Liquid模版
=================

1.设置模板引擎：

```javascript
var options = {
  tags:     {},     // 可选，自定义模板标记（详细用法参考tinyliquid）
  filters:  {},     // 可选，自定义模板内使用的函数（详细用法参考tinyliquid）
  parallel: false   // 可选，是否并行获取数据（详细用法参考tinyliquid）
};
app.set('view engine', 'liquid');
app.engine('liquid', require('express-liquid')(options));
```

模板语法参考这里：https://github.com/leizongmin/tinyliquid

2.设置布局模板（默认不启用）：

```javascript
app.locals.layout = true;           // 启用布局模板，布局模板名为layout
app.locals.layout = 'other_layout'; // 自定义布局模板文件名
```

3.渲染模板

```javascript
res.render('template_name', data);  // 渲染模板
```

4.模板中的包含文件标记：{% include %}
> 所有的文件均从express的views目录查找，与当前文件所在位置无关。如：{% include "abc/efg" %} 为包含views目录下的abc/efg文件

5.一般情况下，你可以省略模板文件的后缀名，此时程序会尝试加上`view engine`中设置的后缀名并查找相应的模板文件。



模板缓存
===============

在生产环境下，当express启用`view cache`时，会对编译过的模板进行缓存，这样可以避免重复编译该模板。但当文件被修改时，可以手动清除模板缓存以达到更新模板的目的。

```javascript
// 初始化
var liquid = require('express-liquid');
app.set('view engine', 'liquid');
app.engine('liquid', liquid);

// ...

// 当文件修改时，清理缓存
for (var filename in liquid.cache) {
  // 删除相应文件的缓存，filename为文件的绝对路径
  delete liquid.cache[filename];
}
```



授权
===============

你可以在遵守**MIT Licence**的前提下随意使用并分发它。

    Copyright (c) 2012 Lei Zongmin <leizongmin@gmail.com>
    http://ucdok.com
    
    The MIT License
    
    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:
    
    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
    LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
    WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
