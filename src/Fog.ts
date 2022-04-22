// 顶点着色器
const VSHADER_SOURCE = 
`attribute vec4 a_Position;
attribute vec4 a_Color;
uniform vec4 u_Eye;  // 视点，世界坐标系
uniform mat4 u_MvpMatrix;
uniform mat4 u_ModelMatrix;
varying vec4 v_Color;
varying float v_Dist;
void main() {
  gl_Position = u_MvpMatrix * a_Position;
  v_Color = vec4(a_Color.rgb, a_Color.a);
  // 计算顶点和视点之间的距离
  //   v_Dist = distance(u_ModelMatrix * a_Position, u_Eye);  
  v_Dist = gl_Position.w;
}`;
// 片元着色器
const FSHADER_SOURCE =
`precision mediump float;
uniform vec3 u_FogColor;
uniform vec2 u_FogDist;
varying vec4 v_Color;
varying float v_Dist;
void main() {
    float fogFactor = clamp((u_FogDist.y - v_Dist) / (u_FogDist.y - u_FogDist.x), 0.0, 1.0);
    vec3 color = mix(u_FogColor, vec3(v_Color), fogFactor);
    gl_FragColor = vec4(color, v_Color.a);
    // gl_FragColor = v_Color;
}`;

let g_ModelMatrix = new Matrix4();
let g_MvpMatrix = new Matrix4();

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



    let u_FogColor = gl.getUniformLocation(program, 'u_FogColor');
    let u_Eye = gl.getUniformLocation(program, 'u_Eye');
    let u_FogDist = gl.getUniformLocation(program, 'u_FogDist');

    let fogColor = new Float32Array([0.137, 0.231, 0.423]);
    let fogDist = new Float32Array([55, 80]);
    let eye = new Float32Array([25, 65, 35, 1.0]);

    gl.uniform3fv(u_FogColor, fogColor);
    gl.uniform2fv(u_FogDist, fogDist);
    gl.uniform4fv(u_Eye, eye);

    document.onkeydown = function(ev) {
        keydown(ev, gl, program, n, u_FogDist, fogDist);
    }

    // 指定canvas的背景颜色
    gl.clearColor(fogColor[0], fogColor[1], fogColor[2], 1.0);
    gl.enable(gl.DEPTH_TEST);
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix');
    if (!u_MvpMatrix) {
        console.log("获取uniform变量u_MvpMatrix存储位置失败");
        return;
    }
    let u_ModelMatrix = gl.getUniformLocation(program, 'u_ModelMatrix');

    let viewProjMatrix = new Matrix4();
    viewProjMatrix.setPerspective(30.0, canvas.width / canvas.height, 1.0, 1000.0);
    viewProjMatrix.lookAt(eye[0], eye[1], eye[2], 0.0, 2.0, 0.0, 0.0, 1.0, 0.0);
    
    g_ModelMatrix.setTranslate(0.0, 0.0, 0.0);

    draw(gl, program, n, u_MvpMatrix, viewProjMatrix, u_ModelMatrix);
};

function keydown(ev, gl, program, n, u_FogDist, fogDist) {
    switch (ev.keyCode) {
        case 38:
            // up
            fogDist[1] += 1;
            break;
        case 40:
            // down
            if (fogDist[1] > fogDist[0]) {
                fogDist[1] -= 1;
            }
            break;
        default:
            return;
    }
    gl.uniform2fv(u_FogDist, fogDist);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
    console.log(fogDist);
}


function draw(gl, program, n, u_MvpMatrix, viewProjMatrix: Matrix4, u_ModelMatrix) {
    // 清空颜色缓冲区和深度缓冲区的背景色
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    drawBox(gl, n, 10.0, 10.0, 10.0, u_MvpMatrix, u_ModelMatrix, viewProjMatrix);
}

function initVertexBuffers(gl: WebGLRenderingContext, program): number {
    // 立方体顶点坐标
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-|v4
    //  |/      |/
    //  v2------v3
    let vertices = new Float32Array([
        1, 1, 1,  -1, 1, 1,  -1,-1, 1,   1,-1, 1,    // v0-v1-v2-v3 front
        1, 1, 1,   1,-1, 1,   1,-1,-1,   1, 1,-1,    // v0-v3-v4-v5 right
        1, 1, 1,   1, 1,-1,  -1, 1,-1,  -1, 1, 1,    // v0-v5-v6-v1 up
       -1, 1, 1,  -1, 1,-1,  -1,-1,-1,  -1,-1, 1,    // v1-v6-v7-v2 left
       -1,-1,-1,   1,-1,-1,   1,-1, 1,  -1,-1, 1,    // v7-v4-v3-v2 down
        1,-1,-1,  -1,-1,-1,  -1, 1,-1,   1, 1,-1     // v4-v7-v6-v5 back
    ]);

    // 立方体顶点坐标对应的颜色,所有面的颜色均相同
    let colors = new Float32Array([
        0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  // v0-v1-v2-v3 front
        0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  // v0-v3-v4-v5 right
        1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  // v0-v5-v6-v1 up
        1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  // v1-v6-v7-v2 left
        1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  // v7-v4-v3-v2 down
        0.4, 1.0, 1.0,  0.4, 1.0, 1.0,  0.4, 1.0, 1.0,  0.4, 1.0, 1.0   // v4-v7-v6-v5 back      
    ]);
    
    // 立方体6个面三角形顶点索引
    let indices = new Uint8Array([
        0, 1, 2,      0, 2, 3, //前
        4, 5, 6,      4, 6, 7, //右
        8, 9, 10,     8, 10, 11, //上
        12, 13, 14,   12, 14, 15, //左
        16, 17, 18,   16, 18, 19, //下
        20, 21, 22,   20, 22, 23, //后
    ]);

    let indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        console.log("创建缓冲区失败！");
        return -1;
    }

    // 将顶点坐标写入缓冲区对象
    if (!initArrayBuffer(gl, program, vertices, 3, gl.FLOAT, 'a_Position')) {
        return -1;
    }
    
    // 将顶点颜色写入缓冲区对象
    if (!initArrayBuffer(gl, program, colors, 3, gl.FLOAT, 'a_Color')) {
        return -1;
    }

    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // 将顶点索引数据写入缓冲区对象
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    return indices.length;
}

function initArrayBuffer(gl, program, data, num, type, attribute) {
    // 创建缓冲区对象
    let buffer = gl.createBuffer();
    if (!buffer) {
        console.log("创建缓冲器对象失败");
        return false;
    }
    // 将缓冲区对象绑定到目标ARRAY_BUFFER
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // 向缓冲区对象写入数据
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    // 获取attribute变量的存储位置
    let a_attribute = gl.getAttribLocation(program, attribute);
    if (a_attribute < 0) {
        console.log("获取变量存储位置失败");
        return false;
    }

    // 将缓冲区对象分配给a_Positioin变量
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    // 连接a_attribute变量与分配给它的缓冲区对象
    gl.enableVertexAttribArray(a_attribute);
    return true;    
}


function drawBox(gl, n, width, height, depth, u_MvpMatrix, u_ModelMatrix, viewProjMatrix: Matrix4) {
    g_ModelMatrix.scale(width, height, depth);
    
    // 观察矩阵x模型变换
    g_MvpMatrix.set(viewProjMatrix);
    g_MvpMatrix.multiply(g_ModelMatrix);
    gl.uniformMatrix4fv(u_MvpMatrix, false, g_MvpMatrix.elements);
    gl.uniformMatrix4fv(u_ModelMatrix, false, g_ModelMatrix.elements);
    // 绘制
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}

webgl_demo();

export {};