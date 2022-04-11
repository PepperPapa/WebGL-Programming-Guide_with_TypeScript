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
uniform bool u_Clicked;
varying vec4 v_Color;
void main() {
  gl_Position = u_MvpMatrix * a_Position;
  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));
  float nDotL = max(dot(u_LightDirection, normal), 0.0);
  vec3 ambient = u_AmbientLight * a_Color.rgb;
  if (u_Clicked) {
    v_Color = vec4(1.0, 0.0, 0.0, 1.0);
  } else {
    v_Color = vec4(u_LightColor * a_Color.rgb * nDotL + ambient, a_Color.a);
  }
}`;
// 片元着色器
const FSHADER_SOURCE =
`precision mediump float;
varying vec4 v_Color;
void main() {
    gl_FragColor = v_Color;
}`;

let g_currentAngle = [0.0, 0.0]; // [绕x轴旋转的角度, 绕y轴旋转的角度]

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
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix');
    if (!u_MvpMatrix) {
        console.log("获取uniform变量u_MvpMatrix存储位置失败");
        return;
    }

    let u_Clicked = gl.getUniformLocation(program, 'u_Clicked');
    if (!u_Clicked) {
        console.log("获取uniform变量u_Clicked存储位置失败");
        return;
    }
    gl.uniform1i(u_Clicked, 0);

    let viewProjMatrix = new Matrix4();
    viewProjMatrix.setPerspective(30.0, canvas.width / canvas.height, 1.0, 100.0);
    viewProjMatrix.lookAt(3.0, 3.0, 7.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
    
    let u_LightColor = gl.getUniformLocation(program, 'u_LightColor');
    let u_LightDirection = gl.getUniformLocation(program, 'u_LightDirection');
    gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
    let lightDirection = new Vector3([2, 2, 4]);
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

    canvas.onmousedown = function(ev: any) {
        let x = ev.clientX;
        let y = ev.clientY;
        let rect = ev.target.getBoundingClientRect();
        // 如果鼠标在canvas范围内
        if (rect.left <= x && x <= rect.right && rect.top <= y && y <= rect.bottom) {
            // 检查是否点击在物体上
            let x_in_canvas = x - rect.left;
            let y_in_canvas = rect.bottom - y;
            let picked : boolean = check(gl, program, n, x_in_canvas, y_in_canvas, u_Clicked, u_MvpMatrix, viewProjMatrix, u_NormalMatrix);
            console.log(picked);
            if (picked) {
                alert("你选中了立方体！");
            }
        }
    }

    var tick = function() {   // Start drawing
        g_currentAngle[0] += 0.6; 
        g_currentAngle[1] += 0.6; 
        draw(gl, program, n, u_MvpMatrix, viewProjMatrix, u_NormalMatrix);
        requestAnimationFrame(tick);
    };
    tick();
};

// 每次按键转动的角度
let g_ModelMatrix = new Matrix4();
let g_MvpMatrix = new Matrix4();
let g_NormalMatrix = new Matrix4();

function check(gl, program, n, x, y, u_Clicked, u_MvpMatrix, viewProjMatrix: Matrix4, u_NormalMatrix): boolean {
    let picked = false;
    // 以红色绘制立方体
    gl.uniform1i(u_Clicked, 1);
    draw(gl, program, n, u_MvpMatrix, viewProjMatrix, u_NormalMatrix);
    // 读取点击坐标的像素值
    let pixels = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    if (pixels[0] == 255) {
        picked = true;
    }
    // 会避免闪烁，立刻绘制恢复正常立方体的绘制
    gl.uniform1i(u_Clicked, 0);
    // 实际测试这里不绘制也不会出现闪烁
    draw(gl, program, n, u_MvpMatrix, viewProjMatrix, u_NormalMatrix);
    return picked;
}

function draw(gl, program, n, u_MvpMatrix, viewProjMatrix: Matrix4, u_NormalMatrix) {
    // 清空颜色缓冲区和深度缓冲区的背景色
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // 绘制基座
    g_ModelMatrix.setTranslate(0.0, 0.0, 0.0);
    g_ModelMatrix.rotate(g_currentAngle[0], 1.0, 0.0, 0.0);
    g_ModelMatrix.rotate(g_currentAngle[1], 0.0, 1.0, 0.0);
    drawBox(gl, n, 2.5, 2.5, 2.5, u_MvpMatrix, viewProjMatrix, u_NormalMatrix);
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
       0.5, 0.5, 0.5,   0.5, -0.5, 0.5,   -0.5, -0.5, 0.5,   -0.5, 0.5, 0.5, // 正面 v0-v3-v2-v1
       0.5, 0.5, 0.5,   0.5, -0.5, 0.5,   0.5, -0.5, -0.5,   0.5, 0.5, -0.5, // 右侧面 v0-v3-v4-v5
       0.5, 0.5, 0.5,   0.5, 0.5, -0.5,  -0.5, 0.5, -0.5,  -0.5, 0.5, 0.5, // 上面 v0-v5-v6-v1
       -0.5, 0.5, 0.5,  -0.5, 0.5, -0.5, -0.5, -0.5, -0.5,  -0.5, -0.5, 0.5, // 左侧面 v1-v6-v7-v2
       0.5, -0.5, 0.5,   -0.5, -0.5, 0.5,  -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  // 底面 v3-v2-v7-v4
       0.5, 0.5, -0.5,  0.5, -0.5, -0.5,  -0.5, -0.5, -0.5,  -0.5, 0.5, -0.5, // 背面 v5-v4-v7-v6
    ]);

    // 立方体顶点坐标对应的颜色,所有面的颜色均相同
    let colors = new Float32Array([
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,        
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

    // 法向量
    var normals = new Float32Array([
       0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,  //前
       1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,   //右
       0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,   //上
       -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, //左
       0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,//下
       0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, //后
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
    // 将法向量写入缓冲区对象
    if (!initArrayBuffer(gl, program, normals, 3, gl.FLOAT, 'a_Normal')) {
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


function drawBox(gl, n, width, height, depth, u_MvpMatrix, viewProjMatrix: Matrix4, u_NormalMatrix) {
    g_ModelMatrix.scale(width, height, depth);
    
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