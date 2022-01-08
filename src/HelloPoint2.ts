// 顶点着色器
const VSHADER_SOURCE = 
`attribute vec4 a_Position;
void main() {
  gl_Position = a_Position;
  gl_PointSize = 10.0;
}`;
// 片元着色器
const FSHADER_SOURCE =
`void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}`;

const HelloPoint2 = function() {
    let canvas = <HTMLCanvasElement> document.getElementById("webgl");
    let gl = <WebGLRenderingContext> getWebGLContext(canvas, true);
    if (!gl) {
        console.log("获取WebGL上下文失败");
        return;
    }
    // 初始化着色器
    // 改造了initShaders方法的返回值
    let program = initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)
    if (!program) {
        console.log("初始化着色器失败");
        return;
    }
    
    // 获取attribute变量的存储位置
    let a_Position = gl.getAttribLocation(program, 'a_Position');
    if (a_Position < 0) {
      console.log("获取a_Position变量存储位置失败");
      return;
    }
    // 将顶点坐标传递给attribute变量
    gl.vertexAttrib3f(a_Position, 0.0, 0.5, 0.0);
    
    // 指定canvas的背景颜色
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // 使用指定背景色清空canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    // 绘制点
    gl.drawArrays(gl.POINTS, 0, 1);
};

HelloPoint2();

export {};