// 顶点着色器
const VSHADER_SOURCE = 
`attribute vec4 a_Position;
uniform vec4 u_Translation;
void main() {
  gl_Position = a_Position + u_Translation;
  gl_PointSize = 5.0;
}`;
// 片元着色器
const FSHADER_SOURCE =
`precision mediump float;
uniform vec4 u_FragColor;
void main() {
  gl_FragColor = u_FragColor;
}`;

const webgl_demo = function() {
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

    let n = initVertexBuffers(gl, program);
    if (n < 0) {
        console.log("设置顶点坐标位置失败");
        return;
    }

    // 平移距离
    let u_Translation = gl.getUniformLocation(program, 'u_Translation');
    if (!u_Translation) {
        console.log("获取u_Translation变量存储位置失败");
        return;
    }
    gl.uniform4f(u_Translation, 0.5, 0.5, 0.0, 0.0);

    let u_FragColor = gl.getUniformLocation(program, 'u_FragColor');
    if (!u_FragColor) {
        console.log("获取u_FragColor变量存储位置失败");
        return;
    }
    gl.uniform4f(u_FragColor, 1.0, 0.0, 0.0, 0.5);


    // 指定canvas的背景颜色
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // 使用指定背景色清空canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    // 绘制点
    gl.drawArrays(gl.TRIANGLE_FAN, 0, n);
};

function initVertexBuffers(gl: WebGLRenderingContext, program): number {
    // v0,v1,v2
    let vertices = new Float32Array([
       -0.5, -0.5, 0.0, 0.5, 0.5, -0.5
    ]);
    let n = 3;

    // 创建缓冲区对象
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log("创建缓冲器对象失败");
        return -1;
    }

    // 将缓冲区对象绑定到目标ARRAY_BUFFER
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // 向缓冲区对象写入数据
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // 获取attribute变量的存储位置
    let a_Position = gl.getAttribLocation(program, 'a_Position');
    if (a_Position < 0) {
        console.log("获取a_Position变量存储位置失败");
        return -1;
    }

    // 将缓冲区对象分配给a_Positioin变量
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // 连接a_Position变量与分配给它的缓冲区对象
    gl.enableVertexAttribArray(a_Position);

    return n;
}

webgl_demo();

export {};