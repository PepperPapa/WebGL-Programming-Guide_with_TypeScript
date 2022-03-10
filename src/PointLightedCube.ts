// 顶点着色器
const VSHADER_SOURCE = 
`attribute vec4 a_Position;
attribute vec4 a_Color;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjMatrix;
uniform mat4 u_ModelMatrix;
// 用来变换法向量的矩阵，为模型矩阵的逆转置矩阵
uniform mat4 u_NormalMatrix;
//法向量
attribute vec4 a_Normal;
// 光线颜色
uniform vec3 u_LightColor;
// 光线方向
uniform vec3 u_LightPosition;
// 环境光颜色
uniform vec3 u_AmbientLight;
varying vec4 v_Color;
void main() {
  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  // 对法向量进行归一化
  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));
  // 计算光线方向
  vec3 lightDirection = normalize(u_LightPosition - vec3(u_ModelMatrix * a_Position));
  //计算光线方向和法向量的点积，也就是cos(入射角)
  float nDotL = max(dot(lightDirection, normal), 0.0);
  // 计算漫反射光的颜色
  vec3 diffuse = u_LightColor * vec3(a_Color) * nDotL;
  // 计算环境光的颜色
  vec3 ambient = u_AmbientLight * vec3(a_Color);
  v_Color = vec4(diffuse + ambient, a_Color.a);
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

    let u_NormalMatrix = gl.getUniformLocation(program, 'u_NormalMatrix');
    if (!u_NormalMatrix) {
        console.log("获取uniform变量u_NormalMatrix存储位置失败");
        return;
    }

    let u_LightColor = gl.getUniformLocation(program, 'u_LightColor');
    if (!u_LightColor) {
        console.log("获取u_LightColor存储位置失败");
        return -1;
    }

    let u_LightPosition = gl.getUniformLocation(program, 'u_LightPosition');
    if (!u_LightPosition) {
        console.log("获取u_LightPosition存储位置失败");
        return -1;
    }

    let u_AmbientLight = gl.getUniformLocation(program, 'u_AmbientLight');
    if (!u_AmbientLight) {
        console.log("获取u_AmbientLight存储位置失败");
        return -1;
    }

    // 设置光线颜色
    gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
    // 设置光线方向
    let lightDirection = new Vector3([0.0, 3.0, 4.0]);
    gl.uniform3fv(u_LightPosition, lightDirection.elements);
    // 设置环境光颜色
    gl.uniform3f(u_AmbientLight, 0.2, 0.2, 0.2);
    
    document.onkeydown = function(ev) {
        keydown(ev, gl, program, n, u_ViewMatrix, viewMatrix, u_ModelMatrix, modelMatrix);
    }
    
    modelMatrix.setRotate(90, 0, 0, 1);  // 沿z轴旋转90度
    // 用来变换法向量的矩阵
    let normalMatrix = new Matrix4();
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
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
    // 立方体顶点坐标
    let vertices = new Float32Array([
       1.0, 1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0,
       1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0,
       1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 
       -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0,
       1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, 1.0, -1.0, -1.0,
       1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0,
    ]);

    // 立方体顶点坐标对应的颜色,所有面的颜色均相同
    let colors = new Float32Array([
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,        
    ]);
    
    // 立方体6个面三角形顶点索引
    let indices = new Uint8Array([
        0, 1, 2, 0, 2, 3, //前
        4, 5, 6, 4, 6, 7, //右
        8, 9, 10, 8, 10, 11, //上
        12, 13, 14, 12, 14, 15, //左
        16, 17, 18, 16, 18, 19, //下
        20, 21, 22, 20, 22, 23, //后
    ]);

    // 法向量
    var normals = new Float32Array([
       0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,  //前
       1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,   //右
       0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,   //上
       -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, //左
       0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,//下
       0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, //后
    ]);

    // 将顶点坐标写入缓冲区对象
    if (!initArrayBuffer(gl, program, vertices, 3, gl.FLOAT, 'a_Position')) {
        return -1;
    }
    // 将顶点颜色写入缓冲区对象
    if (!initArrayBuffer(gl, program, colors, 3, gl.FLOAT, 'a_Color')) {
        return -1;
    }
    // 将法向量写入缓冲区对象
    if (!initArrayBuffer(gl, program, normals, 3, gl.FLOAT, 'a_Normal')) {
        return -1;
    }
    let indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        console.log("创建缓冲区失败！");
        return -1;
    }
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
        return -1;
    }
    // 将缓冲区对象绑定到目标ARRAY_BUFFER
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // 向缓冲区对象写入数据
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    // 获取attribute变量的存储位置
    let a_attribute = gl.getAttribLocation(program, attribute);
    if (a_attribute < 0) {
        console.log("获取变量存储位置失败");
        return -1;
    }

    let FSIZE = data.BYTES_PER_ELEMENT;
    // 将缓冲区对象分配给a_Positioin变量
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    // 连接a_attribute变量与分配给它的缓冲区对象
    gl.enableVertexAttribArray(a_attribute);
    return true;    
}

webgl_demo();

export {};