// 顶点着色器
const VSHADER_SOURCE = 
`attribute vec4 a_Position;
attribute vec4 a_Normal;
attribute vec4 a_Color;
uniform mat4 u_MvpMatrix;
uniform mat4 u_NormalMatrix;
uniform vec3 u_LightColor;
uniform vec3 u_LightDirection;
uniform vec3 u_AmbientLight;
varying vec4 v_Color;
void main() {
  gl_Position = u_MvpMatrix * a_Position;
  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));
  float nDotL = max(dot(u_LightDirection, normal), 0.0);
  vec3 ambient = u_AmbientLight * a_Color.rgb;
  v_Color = vec4(u_LightColor * a_Color.rgb * nDotL + ambient, a_Color.a);
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
    // 指定canvas的背景颜色
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let viewProjMatrix = new Matrix4();
    viewProjMatrix.setPerspective(50.0, canvas.width / canvas.height, 1.0, 100.0);
    viewProjMatrix.lookAt(20.0, 10.0, 30.0, 0, 0, 0, 0, 1, 0);
    

    let u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix');
    if (!u_MvpMatrix) {
        console.log("获取uniform变量u_MvpMatrix存储位置失败");
        return;
    }
    
    let u_LightColor = gl.getUniformLocation(program, 'u_LightColor');
    let u_LightDirection = gl.getUniformLocation(program, 'u_LightDirection');
    gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
    let lightDirection = new Vector3([5, 5, 15]);
    lightDirection.normalize();
    gl.uniform3fv(u_LightDirection, lightDirection.elements);
    
    let u_NormalMatrix = gl.getUniformLocation(program, 'u_NormalMatrix');
    if (!u_NormalMatrix) {
        console.log("获取uniform变量u_NormalMatrix存储位置失败");
        return;
    }

    let u_AmbientLight = gl.getUniformLocation(program, 'u_AmbientLight');
    if (!u_AmbientLight) {
        console.log("获取u_AmbientLight存储位置失败");
        return -1;
    }
    gl.uniform3f(u_AmbientLight, 0.2, 0.2, 0.2);

    let a_Position = gl.getAttribLocation(program, "a_Position");
    if (a_Position < 0) {
        console.log("获取变量存储位置失败");
        return -1;
    }

    document.onkeydown = function(ev) {
        keydown(ev, gl, program, n, a_Position, u_MvpMatrix, viewProjMatrix, u_NormalMatrix);
    }
    
    draw(gl, program, n, a_Position, u_MvpMatrix, viewProjMatrix, u_NormalMatrix);
};

// 每次按键转动的角度
let ANGLE_STEP = 3.0;
// arm1当前的角度
let g_arm1Angle = 90.0;
// arm2当前的角度
let g_joint1Angle = 45.0;
// palm的角度
let g_joint2Angle = 0.0;
// 手指的角度
let g_joint3Angle = 0.0;
let g_ModelMatrix = new Matrix4();
let g_MvpMatrix = new Matrix4();
let g_NormalMatrix = new Matrix4();

function keydown(ev, gl, program, n, a_Position, u_MvpMatrix, viewProjMatrix, u_NormalMatrix) {
    if (ev.keyCode == 37) {
        // 按下左键
        g_arm1Angle = (g_arm1Angle - ANGLE_STEP) % 360;
    } else if (ev.keyCode == 39) {
        // 按下右键
        g_arm1Angle = (g_arm1Angle + ANGLE_STEP) % 360;
    }
    else if (ev.keyCode == 38) {
        // 按下上键
        if (g_joint1Angle > 0.0) {
            g_joint1Angle -= ANGLE_STEP;
        }
    } else if (ev.keyCode == 40) {
        // 按下下键
        if (g_joint1Angle < 135.0) {
            g_joint1Angle += ANGLE_STEP;
        }
    } else if (ev.keyCode == 90) {
        // 按下Z键
        g_joint2Angle = (g_joint2Angle + ANGLE_STEP) % 360;
    } else if (ev.keyCode == 88) {
        // 按下X键
        g_joint2Angle = (g_joint2Angle - ANGLE_STEP) % 360;
    } else if (ev.keyCode == 86) {
        // 按下V键
        if (g_joint3Angle < 60.0) {
            g_joint3Angle = (g_joint3Angle + ANGLE_STEP) % 360;
        }
    } else if (ev.keyCode == 67) {
        // 按下C键
        if (g_joint3Angle > -60.0) {
            g_joint3Angle = (g_joint3Angle - ANGLE_STEP) % 360;
        }
    } else {
        return;
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    draw(gl, program, n, a_Position, u_MvpMatrix, viewProjMatrix, u_NormalMatrix);
}

let g_baseBuffer = null;
let g_arm1Buffer = null;
let g_arm2Buffer = null;
let g_palmBuffer = null;
let g_fingerBuffer = null;

// 存储矩阵的栈，用来保存将要改变的矩阵的初始值
let g_matrixStack = [];
function pushMatrix(m) {
    let m2 = new Matrix4(m);
    g_matrixStack.push(m2);
}
function popMatrix() {
    return g_matrixStack.pop();
}

function draw(gl, program, n, a_Position, u_MvpMatrix, viewProjMatrix: Matrix4, u_NormalMatrix) {
    // 清空颜色缓冲区和深度缓冲区的背景色
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // 绘制基座
    var baseHeight = 2.0;
    g_ModelMatrix.setTranslate(0.0, -12.0, 0.0);
    drawSegment(gl, program, n, g_baseBuffer, a_Position, u_MvpMatrix, viewProjMatrix, u_NormalMatrix);

    // 绘制arm1 大臂
    let armLength = 10.0;
    g_ModelMatrix.translate(0.0, baseHeight, 0.0);
    g_ModelMatrix.rotate(g_arm1Angle, 0.0, 1.0, 0.0);
    drawSegment(gl, program, n, g_arm1Buffer, a_Position, u_MvpMatrix, viewProjMatrix, u_NormalMatrix);

    // 绘制arm2 小臂
    g_ModelMatrix.translate(0.0, armLength, 0.0);
    g_ModelMatrix.rotate(g_joint1Angle, 0, 0, 1.0);
    drawSegment(gl, program, n, g_arm2Buffer, a_Position, u_MvpMatrix, viewProjMatrix, u_NormalMatrix);

    // 绘制Palm 手掌
    let palmLength = 2.0;
    g_ModelMatrix.translate(0.0, armLength, 0.0);
    g_ModelMatrix.rotate(g_joint2Angle, 0, 1.0, 0.0);
    drawSegment(gl, program, n, g_palmBuffer, a_Position, u_MvpMatrix, viewProjMatrix, u_NormalMatrix);

    // 绘制finger1
    g_ModelMatrix.translate(0.0, palmLength, 0.0);
    pushMatrix(g_ModelMatrix);
    g_ModelMatrix.translate(0.0, 0.0, 2.0);
    g_ModelMatrix.rotate(g_joint3Angle, 1.0, 0.0, 0.0);
    drawSegment(gl, program, n, g_fingerBuffer, a_Position, u_MvpMatrix, viewProjMatrix, u_NormalMatrix);
    g_ModelMatrix = popMatrix();

    // 绘制finger2
    g_ModelMatrix.translate(0.0, 0.0, -2.0);
    g_ModelMatrix.rotate(-g_joint3Angle, 1.0, 0.0, 0.0);
    drawSegment(gl, program, n, g_fingerBuffer, a_Position, u_MvpMatrix, viewProjMatrix, u_NormalMatrix);
}

function initVertexBuffers(gl: WebGLRenderingContext, program): number {
    // base顶点坐标  20x2x10
    let vertices_base = new Float32Array([
        5.0, 2.0, 5.0, -5.0, 2.0, 5.0, -5.0, 0.0, 5.0,  5.0, 0.0, 5.0, // v0-v1-v2-v3 front
        5.0, 2.0, 5.0,  5.0, 0.0, 5.0,  5.0, 0.0,-5.0,  5.0, 2.0,-5.0, // v0-v3-v4-v5 right
        5.0, 2.0, 5.0,  5.0, 2.0,-5.0, -5.0, 2.0,-5.0, -5.0, 2.0, 5.0, // v0-v5-v6-v1 up
       -5.0, 2.0, 5.0, -5.0, 2.0,-5.0, -5.0, 0.0,-5.0, -5.0, 0.0, 5.0, // v1-v6-v7-v2 left
       -5.0, 0.0,-5.0,  5.0, 0.0,-5.0,  5.0, 0.0, 5.0, -5.0, 0.0, 5.0, // v7-v4-v3-v2 down
        5.0, 0.0,-5.0, -5.0, 0.0,-5.0, -5.0, 2.0,-5.0,  5.0, 2.0,-5.0  // v4-v7-v6-v5 back
     ]);

     // arm1顶点坐标  3x10x3
    let vertices_arm1 = new Float32Array([
        1.5, 10.0, 1.5, -1.5, 10.0, 1.5, -1.5,  0.0, 1.5,  1.5,  0.0, 1.5, // v0-v1-v2-v3 front
        1.5, 10.0, 1.5,  1.5,  0.0, 1.5,  1.5,  0.0,-1.5,  1.5, 10.0,-1.5, // v0-v3-v4-v5 right
        1.5, 10.0, 1.5,  1.5, 10.0,-1.5, -1.5, 10.0,-1.5, -1.5, 10.0, 1.5, // v0-v5-v6-v1 up
        -1.5, 10.0, 1.5, -1.5, 10.0,-1.5, -1.5,  0.0,-1.5, -1.5,  0.0, 1.5, // v1-v6-v7-v2 left
        -1.5,  0.0,-1.5,  1.5,  0.0,-1.5,  1.5,  0.0, 1.5, -1.5,  0.0, 1.5, // v7-v4-v3-v2 down
        1.5,  0.0,-1.5, -1.5,  0.0,-1.5, -1.5, 10.0,-1.5,  1.5, 10.0,-1.5  // v4-v7-v6-v5 back
    ]);

    var vertices_arm2 = new Float32Array([  // Arm2(4x10x4)
        2.0, 10.0, 2.0, -2.0, 10.0, 2.0, -2.0,  0.0, 2.0,  2.0,  0.0, 2.0, // v0-v1-v2-v3 front
        2.0, 10.0, 2.0,  2.0,  0.0, 2.0,  2.0,  0.0,-2.0,  2.0, 10.0,-2.0, // v0-v3-v4-v5 right
        2.0, 10.0, 2.0,  2.0, 10.0,-2.0, -2.0, 10.0,-2.0, -2.0, 10.0, 2.0, // v0-v5-v6-v1 up
        -2.0, 10.0, 2.0, -2.0, 10.0,-2.0, -2.0,  0.0,-2.0, -2.0,  0.0, 2.0, // v1-v6-v7-v2 left
        -2.0,  0.0,-2.0,  2.0,  0.0,-2.0,  2.0,  0.0, 2.0, -2.0,  0.0, 2.0, // v7-v4-v3-v2 down
        2.0,  0.0,-2.0, -2.0,  0.0,-2.0, -2.0, 10.0,-2.0,  2.0, 10.0,-2.0  // v4-v7-v6-v5 back
    ]);

    var vertices_palm = new Float32Array([  // Palm(2x2x6)
        1.0, 2.0, 3.0, -1.0, 2.0, 3.0, -1.0, 0.0, 3.0,  1.0, 0.0, 3.0, // v0-v1-v2-v3 front
        1.0, 2.0, 3.0,  1.0, 0.0, 3.0,  1.0, 0.0,-3.0,  1.0, 2.0,-3.0, // v0-v3-v4-v5 right
        1.0, 2.0, 3.0,  1.0, 2.0,-3.0, -1.0, 2.0,-3.0, -1.0, 2.0, 3.0, // v0-v5-v6-v1 up
        -1.0, 2.0, 3.0, -1.0, 2.0,-3.0, -1.0, 0.0,-3.0, -1.0, 0.0, 3.0, // v1-v6-v7-v2 left
        -1.0, 0.0,-3.0,  1.0, 0.0,-3.0,  1.0, 0.0, 3.0, -1.0, 0.0, 3.0, // v7-v4-v3-v2 down
        1.0, 0.0,-3.0, -1.0, 0.0,-3.0, -1.0, 2.0,-3.0,  1.0, 2.0,-3.0  // v4-v7-v6-v5 back
    ]);

    var vertices_finger = new Float32Array([  // Fingers(1x2x1)
        0.5, 2.0, 0.5, -0.5, 2.0, 0.5, -0.5, 0.0, 0.5,  0.5, 0.0, 0.5, // v0-v1-v2-v3 front
        0.5, 2.0, 0.5,  0.5, 0.0, 0.5,  0.5, 0.0,-0.5,  0.5, 2.0,-0.5, // v0-v3-v4-v5 right
        0.5, 2.0, 0.5,  0.5, 2.0,-0.5, -0.5, 2.0,-0.5, -0.5, 2.0, 0.5, // v0-v5-v6-v1 up
        -0.5, 2.0, 0.5, -0.5, 2.0,-0.5, -0.5, 0.0,-0.5, -0.5, 0.0, 0.5, // v1-v6-v7-v2 left
        -0.5, 0.0,-0.5,  0.5, 0.0,-0.5,  0.5, 0.0, 0.5, -0.5, 0.0, 0.5, // v7-v4-v3-v2 down
        0.5, 0.0,-0.5, -0.5, 0.0,-0.5, -0.5, 2.0,-0.5,  0.5, 2.0,-0.5  // v4-v7-v6-v5 back
    ]);

    // 立方体顶点坐标对应的颜色,所有面的颜色均相同
    let colors = new Float32Array([
        1.0, 0.6, 0.2, 1.0, 0.6, 0.2, 1.0, 0.6, 0.2, 1.0, 0.6, 0.2,
        1.0, 0.6, 0.2, 1.0, 0.6, 0.2, 1.0, 0.6, 0.2, 1.0, 0.6, 0.2,
        1.0, 0.6, 0.2, 1.0, 0.6, 0.2, 1.0, 0.6, 0.2, 1.0, 0.6, 0.2,
        1.0, 0.6, 0.2, 1.0, 0.6, 0.2, 1.0, 0.6, 0.2, 1.0, 0.6, 0.2,
        1.0, 0.6, 0.2, 1.0, 0.6, 0.2, 1.0, 0.6, 0.2, 1.0, 0.6, 0.2,
        1.0, 0.6, 0.2, 1.0, 0.6, 0.2, 1.0, 0.6, 0.2, 1.0, 0.6, 0.2,        
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
    
    g_baseBuffer = initArrayBufferForLaterUse(gl, program, vertices_base, 3, gl.FLOAT);
    g_arm1Buffer = initArrayBufferForLaterUse(gl, program, vertices_arm1, 3, gl.FLOAT);
    g_arm2Buffer = initArrayBufferForLaterUse(gl, program, vertices_arm2, 3, gl.FLOAT);
    g_palmBuffer = initArrayBufferForLaterUse(gl, program, vertices_palm, 3, gl.FLOAT);
    g_fingerBuffer = initArrayBufferForLaterUse(gl, program, vertices_finger, 3, gl.FLOAT);
    if (!g_baseBuffer || !g_arm1Buffer || !g_arm2Buffer || !g_palmBuffer || !g_fingerBuffer) {
        console.log("创建缓冲区失败!");
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

    // 将缓冲区对象分配给a_attribute变量
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    // 连接a_attribute变量与分配给它的缓冲区对象
    gl.enableVertexAttribArray(a_attribute);
    return true;    
}

function initArrayBufferForLaterUse(gl, program, data, num, type) {
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
    buffer.num = num;
    buffer.type = type;
    return buffer;    
}


function drawSegment(gl, program, n, buffer, a_Position, 
                    u_MvpMatrix, viewProjMatrix: Matrix4, u_NormalMatrix) {
    // 将顶点坐标写入缓冲区对象
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // 将缓冲区对象分配给a_attribute变量
    gl.vertexAttribPointer(a_Position, buffer.num, buffer.type, false, 0, 0);
    // 连接a_attribute变量与分配给它的缓冲区对象
    gl.enableVertexAttribArray(a_Position);

    // 法向量变换矩阵
    g_NormalMatrix.setInverseOf(g_ModelMatrix);
    g_NormalMatrix.transpose();

    // 观察矩阵x模型变换
    gl.uniformMatrix4fv(u_NormalMatrix, false, g_NormalMatrix.elements);
    g_MvpMatrix.set(viewProjMatrix);
    g_MvpMatrix.multiply(g_ModelMatrix);
    gl.uniformMatrix4fv(u_MvpMatrix, false, g_MvpMatrix.elements);
    // 绘制
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}

webgl_demo();

export {};