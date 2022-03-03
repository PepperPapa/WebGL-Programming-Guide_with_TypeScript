// 顶点着色器
const VSHADER_SOURCE = 
`attribute vec4 a_Position;
attribute vec4 a_Color;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjMatrix;
uniform mat4 u_ModelMatrix;
varying vec4 v_Color;
void main() {
  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  v_Color = a_Color;
}`;
// 片元着色器
const FSHADER_SOURCE =
`precision mediump float;
varying vec4 v_Color;
void main() {
  gl_FragColor = v_Color;
}`;

let g_eyeX = 5.0;
let g_eyeY = 5.0;
let g_eyeZ = 5.0;

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
    // 指定canvas的背景颜色
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let viewMatrix = new Matrix4();
    let projMatrix = new Matrix4();
    projMatrix.setPerspective(30.0, canvas.width / canvas.height, 1.0, 100.0);
    let modelMatrix = new Matrix4();

    let u_ViewMatrix = gl.getUniformLocation(program, 'u_ViewMatrix');
    if (!u_ViewMatrix) {
        console.log("获取uniform变量u_ViewMatrix存储位置失败");
        return;
    }
    
    let u_ProjMatrix = gl.getUniformLocation(program, 'u_ProjMatrix');
    if (!u_ProjMatrix) {
        console.log("获取uniform变量u_ProjMatrix存储位置失败");
        return;
    }
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

    let u_ModelMatrix = gl.getUniformLocation(program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
        console.log("获取uniform变量u_ModelMatrix存储位置失败");
        return;
    }
    
    document.onkeydown = function(ev) {
        keydown(ev, gl, program, n, u_ViewMatrix, viewMatrix, u_ModelMatrix, modelMatrix);
    }
    
    modelMatrix.setTranslate(0.0, 0.0, 0.0);
    draw(gl, program, n, u_ViewMatrix, viewMatrix, u_ModelMatrix, modelMatrix);
};


function keydown(ev, gl, program, n, u_ViewMatrix, viewMatrix, u_ModelMatrix, modelMatrix) {
    if (ev.keyCode == 39) {
        // 按下右键
        g_eyeX += 0.1;
    } else if (ev.keyCode == 37) {
        // 按下左键
        g_eyeX -= 0.1;
    } else {
        return;
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    draw(gl, program, n, u_ViewMatrix, viewMatrix, u_ModelMatrix, modelMatrix);
}

function draw(gl, program, n, u_ViewMatrix, viewMatrix, u_ModelMatrix, modelMatrix) {
    viewMatrix.setLookAt(g_eyeX, g_eyeY, g_eyeZ, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    // 绘制
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}

function initVertexBuffers(gl: WebGLRenderingContext, program): number {
    // 立方体顶点坐标和颜色
    let verticesColors = new Float32Array([
       1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
       -1.0, 1.0, 1.0, 1.0, 0.0, 1.0,
       -1.0, -1.0, 1.0, 1.0, 0.0, 0.0,
       1.0, -1.0, 1.0, 1.0, 1.0, 0.0,
       1.0, -1.0, -1.0, 0.0, 1.0, 0.0,
       1.0, 1.0, -1.0, 0.0, 1.0, 1.0,
       -1.0, 1.0, -1.0, 0.0, 0.0, 1.0,
       -1.0, -1.0, -1.0, 0.0, 0.0, 0.0
    ]);
    
    // 立方体6个面三角形顶点索引
    let indices = new Uint8Array([
        0, 1, 2, 0, 2, 3, //前
        0, 3, 4, 0, 4, 5, //右
        0, 5, 6, 0, 6, 1, //上
        1, 6, 7, 1, 7, 2, //左
        7, 4, 3, 7, 3, 2, //下
        4, 7, 6, 4, 6, 5, //后
    ]);

    // 创建缓冲区对象
    let vertexColorBuffer = gl.createBuffer();
    if (!vertexColorBuffer) {
        console.log("创建缓冲器对象失败");
        return -1;
    }
    let indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        console.log("创建缓冲区失败！");
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

    // 将顶点索引数据写入缓冲区对象
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return indices.length;
}

webgl_demo();

export {};