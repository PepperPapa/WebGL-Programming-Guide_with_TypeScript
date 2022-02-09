// 顶点着色器
const VSHADER_SOURCE = 
`attribute vec4 a_Position;
attribute vec2 a_TexCoord;
varying vec2 v_TexCoord;
void main() {
  gl_Position = a_Position;
  v_TexCoord = a_TexCoord;
}`;
// 片元着色器
const FSHADER_SOURCE =
`precision mediump float;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
varying vec2 v_TexCoord;
void main() {
  vec4 v_Color1 = texture2D(u_Sampler1, v_TexCoord);
  vec4 v_Color2 = texture2D(u_Sampler2, v_TexCoord);
  gl_FragColor = v_Color1 * v_Color2;
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

    // 设置顶点信息
    let n = initVertexBuffers(gl, program);
    if (n < 0) {
        console.log("设置顶点坐标位置失败");
        return;
    }

    // 指定canvas的背景颜色
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // 配置纹理
    if (!initTextures(gl, n, program)) {
        console.log("配置纹理失败");
    }
};

function initVertexBuffers(gl: WebGLRenderingContext, program): number {
    let verticesCoords = new Float32Array([
       -0.5, 0.5, 0.0, 1.0,
       -0.5, -0.5, 0.0, 0.0,
       0.5, 0.5, 1.0, 1.0,
       0.5, -0.5, 1.0, 0.0
    ]);
    let n = 4;

    // 创建缓冲区对象
    var vertexCoordBuffer = gl.createBuffer();
    if (!vertexCoordBuffer) {
        console.log("创建缓冲器对象失败");
        return -1;
    }

    // 将缓冲区对象绑定到目标ARRAY_BUFFER
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexCoordBuffer);

    // 向缓冲区对象写入数据
    gl.bufferData(gl.ARRAY_BUFFER, verticesCoords, gl.STATIC_DRAW);

    let FSIZE = verticesCoords.BYTES_PER_ELEMENT;
    // 获取attribute变量的存储位置
    let a_Position = gl.getAttribLocation(program, 'a_Position');
    if (a_Position < 0) {
        console.log("获取a_Position变量存储位置失败");
        return -1;
    }
    // 将缓冲区对象分配给a_Positioin变量
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 4, 0);
    // 连接a_Position变量与分配给它的缓冲区对象
    gl.enableVertexAttribArray(a_Position);

    let a_TexCoord = gl.getAttribLocation(program, 'a_TexCoord');
    if (a_TexCoord < 0) {
        console.log("获取a_TexCoord变量存储位置失败");
        return -1;
    }
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
    gl.enableVertexAttribArray(a_TexCoord);

    return n;
}

function initTextures(gl: WebGLRenderingContext, n: number, program): boolean {
    // 纹理贴图1
    let texture1 = gl.createTexture();
    let u_Sampler1 = gl.getUniformLocation(program, "u_Sampler1");
    if (u_Sampler1 < 0) {
        console.log("获取u_Sampler1变量存储位置失败");
        return false;
    }
    let image1 = new Image();
    image1.onload = function() {
        loadTexture(gl, n, texture1, 0, u_Sampler1, image1);
    };
    // 浏览器开始加载图像
    image1.src = "../resources/redflower.jpg";

    // 纹理贴图2
    let texture2 = gl.createTexture();
    let u_Sampler2 = gl.getUniformLocation(program, "u_Sampler2");
    if (u_Sampler2 < 0) {
        console.log("获取u_Sampler2变量存储位置失败");
        return false;
    }
    let image2 = new Image();
    image2.onload = function() {
        loadTexture(gl, n, texture2, 1, u_Sampler2, image2);
    };
    // 浏览器开始加载图像
    image2.src = "../resources/circle.gif";

    return true;
}

let g_texUnit0: boolean = false;
let g_texUnit1: boolean = false;
function loadTexture(gl: WebGLRenderingContext, n: number, texture, texture_unit, u_Sampler, image) {
    // 对纹理图像进行y轴翻转
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    // 开启0/1号纹理单元
    if (texture_unit == 0) {
        gl.activeTexture(gl.TEXTURE0);
        g_texUnit0 = true;
    } else {
        gl.activeTexture(gl.TEXTURE1);
        g_texUnit1 = true;
    }
    // 向target绑定纹理对象
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // 配置纹理参数
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    // 配置纹理图像
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    // 将0/1号纹理传递给着色器
    gl.uniform1i(u_Sampler, texture_unit);
    // 使用指定背景色清空canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    // 绘制矩形
    if (g_texUnit0 && g_texUnit1) {
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
    }
}

webgl_demo();

export {};