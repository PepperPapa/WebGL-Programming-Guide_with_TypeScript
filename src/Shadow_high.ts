const SHADOW_VSHADER_SOURCE = 
`attribute vec4 a_Position;
uniform mat4 u_MvpMatrix;
void main() {
  gl_Position = u_MvpMatrix * a_Position;
}`;
const SHADOW_FSHADER_SOURCE = 
`precision mediump float;
void main() {
  const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
  const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
  vec4 rgbaDepth = fract(gl_FragCoord.z * bitShift);
  rgbaDepth -= rgbaDepth.gbaa * bitMask;
  gl_FragColor = rgbaDepth;
}`;
const VSHADER_SOURCE = 
`attribute vec4 a_Position;
attribute vec4 a_Color;
uniform mat4 u_MvpMatrix;
uniform mat4 u_MvpMatrixFromLight;
varying vec4 v_PositionFromLight;
varying vec4 v_Color;
void main() {
  gl_Position = u_MvpMatrix * a_Position;
  v_PositionFromLight = u_MvpMatrixFromLight * a_Position;
  v_Color = a_Color;
}`;
const FSHADER_SOURCE =
`precision mediump float;
uniform sampler2D u_ShadowMap; 
varying vec4 v_PositionFromLight;
varying vec4 v_Color;
float unpackDepth(const in vec4 rgbaDepth) {
  const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0 * 256.0), 1.0/(256.0 * 256.0 * 256.0));
  float depth = dot(rgbaDepth, bitShift);
  return depth;
}
void main() {
  // 计算以光源为视点的物体x、y、z坐标
  vec3 shadowCoord = (v_PositionFromLight.xyz/v_PositionFromLight.w)/2.0 + 0.5;
  // 从阴影贴图获取片元的深度
  vec4 rgbaDepth = texture2D(u_ShadowMap, shadowCoord.xy);
  // z值存储在rgba的r分量中
  float depth = unpackDepth(rgbaDepth);
  // 和阴影贴图的深度比较决定是否需要绘制阴影
  float visibility = (shadowCoord.z > depth + 0.0015) ? 0.7 : 1.0;
  // 为片元上色
  gl_FragColor = vec4(v_Color.rgb * visibility, v_Color.a);
}`;

var OFFSCREEN_WIDTH = 2048;
var OFFSCREEN_HEIGHT = 2048;
var LIGHT_X = 0, LIGHT_Y = 40, LIGHT_Z = 2;

let g_modelMatrix = new Matrix4();
let g_mvpMatrix = new Matrix4();


const webgl_demo = function() {
    var canvas = <HTMLCanvasElement> document.getElementById("webgl");
    let gl = <WebGLRenderingContext> getWebGLContext(canvas, true);
    if (!gl) {
        console.log("获取WebGL上下文失败");
        return;
    }
    // 创建阴影贴图着色器程序
    var shadow_program = createProgram(gl, SHADOW_VSHADER_SOURCE, SHADOW_FSHADER_SOURCE);
    shadow_program.a_Position = gl.getAttribLocation(shadow_program, "a_Position");
    shadow_program.u_MvpMatrix = gl.getUniformLocation(shadow_program, "u_MvpMatrix");

    // 创建正常化绘制着色器程序
    let program = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    // 获取着色器变量的地址
    program.a_Position = gl.getAttribLocation(program, "a_Position");
    program.a_Color = gl.getAttribLocation(program, "a_Color");
    program.u_MvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
    program.u_MvpMatrixFromLight = gl.getUniformLocation(program, "u_MvpMatrixFromLight");
    program.u_ShadowMap = gl.getUniformLocation(program, "u_ShadowMap");

    // 设置顶点信息
    let triangle = initVertexBuffersForTriangle(gl);
    let plane = initVertexBuffersForPlane(gl);
    
    // 初始化帧缓冲区
    var fbo = initFrameBufferOBject(gl);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fbo.texture);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    var viewProjMatrixFromLight = new Matrix4();
    viewProjMatrixFromLight.setPerspective(70.0, OFFSCREEN_WIDTH/OFFSCREEN_HEIGHT, 1.0, 100.0);
    viewProjMatrixFromLight.lookAt(LIGHT_X, LIGHT_Y, LIGHT_Z, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
    
    let viewProjMatrix = new Matrix4();
    viewProjMatrix.setPerspective(45.0, canvas.width / canvas.height, 1.0, 100.0);
    viewProjMatrix.lookAt(0.0, 7.0, 9.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
    
    var currentAngle = 0.0;
    var mvpMatrixFromLight_t = new Matrix4(); // 三角形
    var mvpMatrixFromLight_p = new Matrix4(); // 矩形平面
    var tick = function() {
      currentAngle = animate(currentAngle);
      // 利用帧缓冲区获取阴影纹理贴图
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(shadow_program);
      drawTriangle(gl, shadow_program, triangle, currentAngle, viewProjMatrixFromLight);
      mvpMatrixFromLight_t.set(g_mvpMatrix);
      drawPlane(gl, shadow_program, plane, viewProjMatrixFromLight);
      mvpMatrixFromLight_p.set(g_mvpMatrix);
      // 恢复为颜色缓冲区，进行正常绘制
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform1i(program.u_ShadowMap, 0); //传递gl.TEXTURE0
      gl.uniformMatrix4fv(program.u_MvpMatrixFromLight, false, mvpMatrixFromLight_t.elements);
      drawTriangle(gl, program, triangle, currentAngle, viewProjMatrix);
      gl.uniformMatrix4fv(program.u_MvpMatrixFromLight, false, mvpMatrixFromLight_p.elements);
      drawPlane(gl, program, plane, viewProjMatrix);
      requestAnimationFrame(tick);
    };
    tick();
};

function drawTriangle(gl, program, triangle, currentAngle, viewProjMatrix) {
  // 计算模型变换矩阵
  g_modelMatrix.setRotate(currentAngle, 0.0, 1.0, 0.0); // 绕y轴旋转angle角度
  draw(gl, program, triangle, viewProjMatrix);
}

function drawPlane(gl, program, plane, viewProjMatrix) {
  // 计算模型变换矩阵
  g_modelMatrix.setRotate(-45, 0.0, 1.0, 1.0); // 绕y轴旋转angle角度
  draw(gl, program, plane, viewProjMatrix);
}

function draw(gl, program, o, viewProjMatrix) {
  // 缓冲区数据传送到激活的着色器程序
  initAttributeVariable(gl, program.a_Position, o.vertexBuffer);
  // 这条监测语句是必须的，因为用来生成阴影贴图的着色器是没有a_Color属性变量的
  // 如果在激活生成阴影贴图着色器的情况下，也执行下面传入a_Color的操作绘制矩形监测全部是阴影的错误结果
  if (program.a_Color != undefined)
    initAttributeVariable(gl, program.a_Color, o.colorBuffer);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer);

  // 计算视图投影矩阵
  g_mvpMatrix.set(viewProjMatrix);
  g_mvpMatrix.multiply(g_modelMatrix);

  gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);
  gl.drawElements(gl.TRIANGLES, o.numIndices, gl.UNSIGNED_BYTE, 0);
}

function initFrameBufferOBject(gl: WebGLRenderingContext) {
  // 01-创建帧缓冲区
  var framebuffer : any = gl.createFramebuffer();
  // 02-创建纹理对象并设置其尺寸和参数
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
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

  framebuffer.texture =  texture;  // 保存纹理对象

  // Unbind the buffer object
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);

  return framebuffer;
}

function initAttributeVariable(gl, a_attribute, buffer) {
  // 缓冲区重新绑定
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // 将缓冲区分配给着色器
  gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
  // 启动缓冲区和着色器的连接
  gl.enableVertexAttribArray(a_attribute);
}

function initVertexBuffersForTriangle(gl: WebGLRenderingContext): any {
    // Create a triangle
    //       v2
    //      / | 
    //     /  |
    //    /   |
    //  v0----v1

    // Vertex coordinates
    var vertices = new Float32Array([-0.8, 3.5, 0.0,  0.8, 3.5, 0.0,  0.0, 3.5, 1.8]);
    // Colors
    var colors = new Float32Array([1.0, 0.5, 0.0,  1.0, 0.5, 0.0,  1.0, 0.0, 0.0]);    

    var indices = new Uint8Array([        // Indices of the vertices
      0, 1, 2  // v0-v1-v2
    ]);

    var o : any = new Object();
    o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    o.colorBuffer = initArrayBufferForLaterUse(gl, colors, 3, gl.FLOAT);
    o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);

    o.numIndices = indices.length;

    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    
    return o;
}

function initVertexBuffersForPlane(gl: WebGLRenderingContext) : any {
    // Create face
    //  v1------v0
    //  |        | 
    //  |        |
    //  |        |
    //  v2------v3
    var vertices = new Float32Array([   // Vertex coordinates
      3.0, -1.7, 2.5,  -3.0, -1.7, 2.5,  -3.0, -1.7, -2.5,   3.0, -1.7, -2.5    // v0-v1-v2-v3
    ]);

    var colors = new Float32Array([   // Texture coordinates
      1.0, 1.0, 1.0,    1.0, 1.0, 1.0,  1.0, 1.0, 1.0,   1.0, 1.0, 1.0
    ]);

    var indices = new Uint8Array([        // Indices of the vertices
      0, 1, 2,   0, 2, 3,   // v0-v1-v2 v0-v2-v3
    ]);

    var o : any = new Object();
    o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    o.colorBuffer = initArrayBufferForLaterUse(gl, colors, 3, gl.FLOAT);
    o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);

    o.numIndices = indices.length;

    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    
    return o;
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