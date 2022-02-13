// 顶点着色器
const VSHADER_SOURCE = 
`attribute vec4 a_Position;
attribute vec4 a_Color;
uniform mat4 u_ViewMatrix;
varying vec4 v_Color;
void main() {
  gl_Position = u_ViewMatrix * a_Position;
  v_Color = a_Color;
}`;
// 片元着色器
const FSHADER_SOURCE =
`precision mediump float;
varying vec4 v_Color;
void main() {
  gl_FragColor = v_Color;
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

    let viewMatrix = new Matrix4();
    viewMatrix.setLookAt(0.20, 0.25, 0.25, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

    let u_ViewMatrix = gl.getUniformLocation(program, 'u_ViewMatrix');
    if (!u_ViewMatrix) {
        console.log("获取uniform变量u_ViewMatrix存储位置失败");
        return;
    }
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

    // 指定canvas的背景颜色
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // 使用指定背景色清空canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    // 绘制点
    gl.drawArrays(gl.TRIANGLES, 0, n);
};

function initVertexBuffers(gl: WebGLRenderingContext, program): number {
    // 顶点坐标，RGBA
    let verticesColors = new Float32Array([
    // 蓝
       0.0, 0.5, -0.4, 0.4, 1.0, 0.4,
       -0.5, -0.5, -0.4, 0.4, 1.0, 0.4,
       0.5, -0.5, -0.4, 1.0, 0.4, 0.4,
    // 黄
       0.5, 0.4, -0.2, 1.0, 0.4, 0.4,
       -0.5, 0.4, -0.2, 1.0, 1.0, 0.4,
       0.0, -0.6, -0.2, 1.0, 1.0, 0.4,
    // 绿
       0.0, 0.5, 0.0, 0.4, 0.4, 1.0,
       -0.5, -0.5, 0.0, 0.4, 0.4, 1.0,
       0.5, -0.5, 0.0, 1.0, 0.4, 0.4,
    ]);
    let n = 9;

    // 创建缓冲区对象
    var vertexColorBuffer = gl.createBuffer();
    if (!vertexColorBuffer) {
        console.log("创建缓冲器对象失败");
        return -1;
    }

    // 将缓冲区对象绑定到目标ARRAY_BUFFER
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);

    // 向缓冲区对象写入数据
    gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

    // 获取attribute变量的存储位置
    let a_Position = gl.getAttribLocation(program, 'a_Position');
    if (a_Position < 0) {
        console.log("获取a_Position变量存储位置失败");
        return -1;
    }

    let FSIZE = verticesColors.BYTES_PER_ELEMENT;
    // 将缓冲区对象分配给a_Positioin变量
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE*6, 0);
    // 连接a_Position变量与分配给它的缓冲区对象
    gl.enableVertexAttribArray(a_Position);

    let a_Color = gl.getAttribLocation(program, 'a_Color');
    if (a_Color < 0) {
        console.log("获取a_Color变量存储位置失败");
        return -1;
    }
    // 将缓冲区对象分配给a_Positioin变量
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE*6, FSIZE*3);
    // 连接a_Position变量与分配给它的缓冲区对象
    gl.enableVertexAttribArray(a_Color);

    return n;
}

webgl_demo();

export {};