
const clearCanvas = function() {
    // 获取canvas元素
    let canvas = <HTMLCanvasElement> document.getElementById("webgl");
    // 获取webgl的绘图上下文
    let gl = getWebGLContext(canvas, true);
    if (!gl) {
        console.log("获取WebGL上下文失败");
        return;
    }
    // 指定canvas的背景颜色
    gl.clearColor(1.0, 0.0, 1.0, 0.5);
    // 使用指定背景色清空canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
}

clearCanvas();
