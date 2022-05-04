const VSHADER_SOURCE = 
`attribute vec4 a_Position;
attribute vec2 a_TexCoord;
uniform mat4 u_MvpMatrix;
varying vec2 v_TexCoord;
void main() {
  gl_Position = u_MvpMatrix * a_Position;
  v_TexCoord = a_TexCoord;
}`;
const FSHADER_SOURCE =
`precision mediump float;
uniform sampler2D u_Sampler; 
varying vec2 v_TexCoord;
void main() {
  gl_FragColor = texture2D(u_Sampler, v_TexCoord);
}`;

let g_modelMatrix = new Matrix4();
let g_mvpMatrix = new Matrix4();
// 离屏绘制的尺寸
var OFFSCREEN_WIDTH = 256;
var OFFSCREEN_HEIGHT = 256;

const webgl_demo = function() {
    var canvas = <HTMLCanvasElement> document.getElementById("webgl");
    let gl = <WebGLRenderingContext> getWebGLContext(canvas, true);
    if (!gl) {
        console.log("获取WebGL上下文失败");
        return;
    }
    // // 创建多个着色器程序
    let program = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    // 获取着色器变量的地址
    program.a_Position = gl.getAttribLocation(program, "a_Position");
    program.a_TexCoord = gl.getAttribLocation(program, "a_TexCoord");
    program.u_Sampler = gl.getUniformLocation(program, "u_Sampler");
    program.u_MvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
    if (program.a_Position < 0 || program.a_TexCoord < 0 || !program.u_MvpMatrix) {
      console.log('Failed to get the storage location of a_Position, a_TexCoord, u_MvpMatrix');
      return;
    }
    gl.useProgram(program);

    // 设置顶点信息
    let cube = initVertexBuffersForCube(gl, program);
    let plane = initVertexBuffersForPlane(gl, program);
    let texture = initTextures(gl, program);
    
    if (!cube || !plane || !texture) {
      console.log("create cube、plane、texture failed.");
      return;
    }

    // 初始化帧缓冲区
    var fbo = initFrameBufferOBject(gl);

    gl.enable(gl.DEPTH_TEST);

    let viewProjMatrix = new Matrix4();
    viewProjMatrix.setPerspective(30.0, canvas.width / canvas.height, 1.0, 100.0);
    viewProjMatrix.lookAt(0.0, 0.0, 7.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
    
    let viewProjMatrixFBO = new Matrix4();
    viewProjMatrixFBO.setPerspective(30.0, OFFSCREEN_WIDTH/OFFSCREEN_HEIGHT, 1.0, 100.0);
    viewProjMatrixFBO.lookAt(0.0, 2.0, 7.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

    var currentAngle = 0.0;
    var tick = function() {
      currentAngle = animate(currentAngle);
      // 绘制矩形
      draw(gl, program, canvas, fbo, plane, cube, currentAngle, texture, viewProjMatrix, viewProjMatrixFBO);
      // 绘制带贴图立方体
      requestAnimationFrame(tick);
    };
    tick();
};

function draw(gl : WebGLRenderingContext, program, canvas, fbo, plane, cube, angle, texture, viewProjMatrix, viewProjMatrixFBO) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.viewport(0, 0, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT); // 为帧缓冲区准备
  gl.clearColor(0.2, 0.2, 0.4, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // 绘制立方体
  drawTexCube(gl, program, cube, angle, texture, viewProjMatrixFBO);
  // 切换绘制目标为颜色缓冲区
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // 将视窗设置回canvas尺寸
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // 绘制矩形平面
  drawTexPlane(gl, program, plane, angle, fbo.texture, viewProjMatrix);
}

function initFrameBufferOBject(gl: WebGLRenderingContext) {
  // 01-创建帧缓冲区
  var framebuffer : any = gl.createFramebuffer();
  // 02-创建纹理对象并设置其尺寸和参数
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  framebuffer.texture =  texture;  // 保存纹理对象
  // 03-创建渲染缓冲区对象并设置其尺寸和参数
  var depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);
  // 04-将纹理和渲染区对象关联到帧缓冲区对象上
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
  // 05-检查帧缓冲区是否被正确设置
  var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (e !== gl.FRAMEBUFFER_COMPLETE) {
    console.log("FrameBuffer object is incomplete: " + e.toString());
    return console.error();
  }

  // // Unbind the buffer object
  // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // gl.bindTexture(gl.TEXTURE_2D, null);
  // gl.bindRenderbuffer(gl.RENDERBUFFER, null);

  return framebuffer;
}

function drawTexPlane(gl, program, o, angle, texture, viewProjMatrix) {
  // 缓冲区数据传送到激活的着色器程序
  initAttributeVariable(gl, program.a_Position, o.vertexBuffer);
  initAttributeVariable(gl, program.a_TexCoord, o.texCoordBuffer);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // 计算模型变换矩阵
  g_modelMatrix.setTranslate(0.0, 0.0, 1.0);
  g_modelMatrix.rotate(20, 1.0, 0.0, 0.0); // 绕x轴旋转20°
  g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0); // 绕y轴旋转angle角度

  // 计算视图投影矩阵
  g_mvpMatrix.set(viewProjMatrix);
  g_mvpMatrix.multiply(g_modelMatrix);

  gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);
  gl.drawElements(gl.TRIANGLES, o.numIndices, gl.UNSIGNED_BYTE, 0);
}

function  drawTexCube(gl, program, o, angle, texture, viewProjMatrix) {
  // 缓冲区数据传送到激活的着色器程序
  initAttributeVariable(gl, program.a_Position, o.vertexBuffer);
  initAttributeVariable(gl, program.a_TexCoord, o.texCoordBuffer);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  drawCube(gl, program, o, angle, viewProjMatrix);
}

function drawCube(gl, program, o, angle, viewProjMatrix) {
  // 计算模型变换矩阵
  g_modelMatrix.setRotate(20, 1.0, 0.0, 0.0); // 绕x轴旋转20°
  g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0); // 绕y轴旋转angle角度

  // 计算视图投影矩阵
  g_mvpMatrix.set(viewProjMatrix);
  g_mvpMatrix.multiply(g_modelMatrix);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);
  // 按照索引绘制立方体
  gl.drawElements(gl.TRIANGLES, o.numIndices, gl.UNSIGNED_BYTE, 0);
}

function initAttributeVariable(gl, a_attribute, buffer) {
  // 缓冲区重新绑定
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // 将缓冲区分配给着色器
  gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
  // 启动缓冲区和着色器的连接
  gl.enableVertexAttribArray(a_attribute);
}

function initVertexBuffersForPlane(gl: WebGLRenderingContext, program) : any {
    // Create face
    //  v1------v0
    //  |        | 
    //  |        |
    //  |        |
    //  v2------v3
    var vertices = new Float32Array([   // Vertex coordinates
      1.0, 1.0, 0.0,   -1.0, 1.0, 0.0,   -1.0, -1.0, 0.0,   1.0, -1.0, 0.0,
    ]);

    var texCoords = new Float32Array([   // Texture coordinates
      1.0, 1.0,   0.0, 1.0,   0.0, 0.0,   1.0, 0.0,    // v0-v1-v2-v3 front
    ]);

    var indices = new Uint8Array([        // Indices of the vertices
      0, 1, 2,   0, 2, 3,   // v0-v1-v2 v0-v2-v3
    ]);

    var o : any = new Object();
    o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    o.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
    o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);

    o.numIndices = indices.length;

    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    
    return o;
}
function initVertexBuffersForCube(gl: WebGLRenderingContext, program) : any {
    // Create a cube
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-|v4
    //  |/      |/
    //  v2------v3

    var vertices = new Float32Array([   // Vertex coordinates
    1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0,    // v0-v1-v2-v3 front
    1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0,    // v0-v3-v4-v5 right
    1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0,    // v0-v5-v6-v1 up
    -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0,    // v1-v6-v7-v2 left
    -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0,    // v7-v4-v3-v2 down
    1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0     // v4-v7-v6-v5 back
    ]);

    var normals = new Float32Array([   // Normal
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,     // v0-v1-v2-v3 front
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,     // v0-v3-v4-v5 right
    0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,     // v0-v5-v6-v1 up
    -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,     // v1-v6-v7-v2 left
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,     // v7-v4-v3-v2 down
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0      // v4-v7-v6-v5 back
    ]);

    var texCoords = new Float32Array([   // Texture coordinates
    1.0, 1.0,   0.0, 1.0,   0.0, 0.0,   1.0, 0.0,    // v0-v1-v2-v3 front
    0.0, 1.0,   0.0, 0.0,   1.0, 0.0,   1.0, 1.0,    // v0-v3-v4-v5 right
    1.0, 0.0,   1.0, 1.0,   0.0, 1.0,   0.0, 0.0,    // v0-v5-v6-v1 up
    1.0, 1.0,   0.0, 1.0,   0.0, 0.0,   1.0, 0.0,    // v1-v6-v7-v2 left
    0.0, 0.0,   1.0, 0.0,   1.0, 1.0,   0.0, 1.0,    // v7-v4-v3-v2 down
    0.0, 0.0,   1.0, 0.0,   1.0, 1.0,   0.0, 1.0     // v4-v7-v6-v5 back
    ]);

    var indices = new Uint8Array([        // Indices of the vertices
    0, 1, 2,   0, 2, 3,    // front
    4, 5, 6,   4, 6, 7,    // right
    8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
    ]);

    var o : any = new Object();
    o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    o.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
    o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);

    o.numIndices = indices.length;
    
    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return o;
}

function initTextures(gl, program) {
  // 创建纹理贴图对象
  var texture = gl.createTexture();
  if (!texture) {
    console.log("failed to create texture object.")
    return -1;
  }

  var image = new Image();
  if (!image) {
    console.log('Failed to create the image object');
    return null;
  }
  
  image.onload = function() {
    // 将图片像素写入纹理贴图对象
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // image y轴翻转
    // gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // 将纹理贴图传给着色器u_Sampler变量
    gl.uniform1i(program.u_Sampler, 0);

    // 解除绑定
    gl.bindTexture(gl.TEXTURE_2D, null);
  };  
  image.src = "../resources/sky.jpg";
  return texture;
}

function initArrayBufferForLaterUse(gl, data, num, type) {
  // 创建缓冲区
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log("Failed init buffer object!")
    return -1;
  }
  // 绑定缓冲区
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // 向缓冲区传入数据
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  buffer.num = num;
  buffer.type = type;
  return buffer;
}

function initElementArrayBufferForLaterUse(gl, data, type) {
  // 创建缓冲区
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log("Failed init buffer object!")
    return -1;
  }
  // 绑定缓冲区
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  // 向缓冲区传入数据
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
  buffer.type = type;
  return buffer;
}

var ANGLE_STEP = 30;
var last = Date.now();
function animate(angle) {
  var now = Date.now();
  var elapsed = now - last; 
  last = now;
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle % 360;
}
webgl_demo();

export {};