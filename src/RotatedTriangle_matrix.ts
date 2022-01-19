// 顶点着色器
const VSHADER_SOURCE = 
`attribute vec4 a_Position;
uniform mat4 u_xformMatrix;
void main() {
  gl_Position = u_xformMatrix * a_Position;
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

    // 旋转角度
    let angle = 10.0;
    let arc_angle = Math.PI * (angle / 180.0);
    let cosB = Math.cos(arc_angle);
    let sinB = Math.sin(arc_angle);
    // 列主序
    // let xformMatrix = new Float32Array([
    //     cosB, sinB, 0, 0,
    //     -sinB, cosB, 0, 0,
    //     0, 0, 1, 0,
    //     0, 0, 0, 1
    // ]);
    let xformMatrix = new Float32Array([
        3, 0, 0, 0,
        0, 3, 0, 0,
        0, 0, 3, 0,
        0, 0, 0, 1
    ]);

    let u_xformMatrix = gl.getUniformLocation(program, 'u_xformMatrix');
    if (!u_xformMatrix) {
        console.log("获取uniform变量u_xformMatrix存储位置失败");
        return;
    }
    gl.uniformMatrix4fv(u_xformMatrix, false, xformMatrix);

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