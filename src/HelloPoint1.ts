// 顶点着色器
var VSHADER_SOURCE = 
`void main() {
  gl_Position = vec4(0.0, 0.5, 0.0, 1.0);
  gl_PointSize = 10.0;
}`;
// 片元着色器
var FSHADER_SOURCE =
`void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}`;


const drawPoint = function() {
    let canvas = <HTMLCanvasElement> document.getElementById("webgl");
    let gl = getWebGLContext(canvas, true);
    if (!gl) {
        console.log("获取WebGL上下文失败");
        return;
    }
    // 初始化着色器
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log("初始化着色器失败");
        return;
    }
    
    // 指定canvas的背景颜色
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // 使用指定背景色清空canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    // 绘制点
    gl.drawArrays(gl.POINTS, 0, 1);
};

drawPoint();
