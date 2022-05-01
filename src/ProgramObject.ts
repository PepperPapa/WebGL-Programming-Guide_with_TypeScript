const SOLID_VSHADER_SOURCE = 
`attribute vec4 a_Position;
attribute vec4 a_Normal;
uniform mat4 u_MvpMatrix;
uniform mat4 u_NormalMatrix;
varying vec4 v_Color;
void main() {
  gl_Position = u_MvpMatrix * a_Position;
  vec3 lightDirection = vec3(0.0, 0.0, 1.0);
  vec4 color = vec4(0.0, 1.0, 1.0, 1.0);
  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));
  float nDotL = max(dot(lightDirection, normal), 0.0);
  vec3 diffuse = vec3(color) * nDotL;
  vec3 ambient = vec3(color) * 0.1;
  v_Color = vec4(diffuse + ambient, color.a);
}`;
const SOLID_FSHADER_SOURCE =
`precision mediump float;
varying vec4 v_Color;
void main() {
  gl_FragColor = v_Color;
}`;

const TEXTURE_VSHADER_SOURCE = 
`attribute vec4 a_Position;
attribute vec2 a_TexCoord;
attribute vec4 a_Normal;
uniform mat4 u_MvpMatrix;
uniform mat4 u_NormalMatrix;
varying vec2 v_TexCoord;
varying float v_NDotL;
void main() {
  gl_Position = u_MvpMatrix * a_Position;
  v_TexCoord = a_TexCoord;
  vec3 lightDirection = vec3(0.0, 0.0, 1.0);
  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));
  v_NDotL = max(dot(lightDirection, normal), 0.0);
}`;
const TEXTURE_FSHADER_SOURCE =
`precision mediump float;
uniform sampler2D u_Sampler; 
varying vec2 v_TexCoord;
varying float v_NDotL;
void main() {
  vec4 color = texture2D(u_Sampler, v_TexCoord);
  gl_FragColor = vec4(color.rgb * v_NDotL, color.a);
}`;

var g_normalMatrix = new Matrix4();
let g_modelMatrix = new Matrix4();
let g_mvpMatrix = new Matrix4();

const webgl_demo = function() {
    var canvas = <HTMLCanvasElement> document.getElementById("webgl");
    let gl = <WebGLRenderingContext> getWebGLContext(canvas, true);
    if (!gl) {
        console.log("获取WebGL上下文失败");
        return;
    }
    // // 创建多个着色器程序
    let solidProgram = createProgram(gl, SOLID_VSHADER_SOURCE, SOLID_FSHADER_SOURCE);
    let texProgram = createProgram(gl, TEXTURE_VSHADER_SOURCE, TEXTURE_FSHADER_SOURCE);
    // 获取着色器变量的地址
    solidProgram.a_Position = gl.getAttribLocation(solidProgram, "a_Position");
    solidProgram.a_Normal = gl.getAttribLocation(solidProgram, "a_Normal");
    solidProgram.u_NormalMatrix = gl.getUniformLocation(solidProgram, "u_NormalMatrix");
    solidProgram.u_MvpMatrix = gl.getUniformLocation(solidProgram, "u_MvpMatrix");

    texProgram.a_Position = gl.getAttribLocation(texProgram, "a_Position");
    texProgram.a_Normal = gl.getAttribLocation(texProgram, "a_Normal");
    texProgram.u_NormalMatrix = gl.getUniformLocation(texProgram, "u_NormalMatrix");
    texProgram.a_TexCoord = gl.getAttribLocation(texProgram, "a_TexCoord");
    texProgram.u_Sampler = gl.getUniformLocation(texProgram, "u_Sampler");
    texProgram.u_MvpMatrix = gl.getUniformLocation(texProgram, "u_MvpMatrix");

    // 设置顶点信息
    let cube = initVertexBuffers(gl, solidProgram);
    let texture = initTextures(gl, texProgram);
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    
    let viewProjMatrix = new Matrix4();
    viewProjMatrix.setPerspective(30.0, canvas.width / canvas.height, 1.0, 100.0);
    viewProjMatrix.lookAt(0.0, 0.0, 15.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
    
    var currentAngle = 0.0;
    var tick = function() {
      currentAngle = animate(currentAngle);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      // 绘制单色立方体
      drawSolidCube(gl, solidProgram, cube, -2, currentAngle, viewProjMatrix);
      // 绘制带贴图立方体
      drawTexCube(gl, texProgram, cube, texture, 2, currentAngle, viewProjMatrix)
      requestAnimationFrame(tick);
    };
    tick();
};

function drawSolidCube(gl, program, o, x, angle, viewProjMatrix) {
  // 选择着色器程序
  gl.useProgram(program);

  // 缓冲区数据传送到激活的着色器程序
  initAttributeVariable(gl, program.a_Position, o.vertexBuffer);
  initAttributeVariable(gl, program.a_Normal, o.normalBuffer);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer);
  drawCube(gl, program, o, x, angle, viewProjMatrix);
}

function  drawTexCube(gl, program, o, texture, x, angle, viewProjMatrix) {
  // 选择着色器程序
  gl.useProgram(program);

  // 缓冲区数据传送到激活的着色器程序
  initAttributeVariable(gl, program.a_Position, o.vertexBuffer);
  initAttributeVariable(gl, program.a_Normal, o.normalBuffer);
  initAttributeVariable(gl, program.a_TexCoord, o.texCoordBuffer);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  drawCube(gl, program, o, x, angle, viewProjMatrix);
}

function drawCube(gl, program, o, x, angle, viewProjMatrix) {
  // 计算模型变换矩阵
  g_modelMatrix.setTranslate(x, 0.0, 0.0);
  g_modelMatrix.rotate(20, 1.0, 0.0, 0.0); // 绕x轴旋转20°
  g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0); // 绕y轴旋转angle角度

  // 计算法向量的变换矩阵并传给着色器
  g_normalMatrix.setInverseOf(g_modelMatrix);
  g_normalMatrix.transpose();
  gl.uniformMatrix4fv(program.u_NormalMatrix, false, g_normalMatrix.elements);

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

function initVertexBuffers(gl: WebGLRenderingContext, program) : any {
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
    o.normalBuffer = initArrayBufferForLaterUse(gl, normals, 3, gl.FLOAT);
    o.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
    o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);

    o.numIndices = indices.length;
    
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
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // 将纹理贴图传给着色器u_Sampler变量
    gl.useProgram(program);
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