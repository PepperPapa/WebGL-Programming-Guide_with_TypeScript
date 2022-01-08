// 顶点着色器
const VSHADER_SOURCE = 
`attribute vec4 a_Position;
attribute float a_PointSize;
void main() {
  gl_Position = a_Position;
  gl_PointSize = a_PointSize;
}`;
// 片元着色器
const FSHADER_SOURCE =
`precision mediump float;
uniform vec4 u_FragColor;
void main() {
  gl_FragColor = u_FragColor;
}`;

const g_points: Array<Array<number>> = [];
const g_colors: Array<Array<number>> = [];
function click(event, gl: WebGLRenderingContext, canvas: HTMLCanvasElement, 
                a_Position: number, u_FragColor) {
    let x = event.clientX;
    let y = event.clientY;
    let rect = event.target.getBoundingClientRect();
    let new_x = (x - (rect.left + rect.width/2)) / (rect.width/2);
    let new_y = -(y - (rect.top + rect.height/2)) / (rect.height/2);
    g_points.push([new_x, new_y]);

    if (new_x >= 0.0 && new_y >= 0.0) {
        // 第一象限
        g_colors.push([1.0, 0.0, 0.0, 1.0]);
    } else if (new_x < 0.0 && new_y < 0.0) {
        // 第三象限
        g_colors.push([0.0, 1.0, 0.0, 1.0]);
    } else {
        g_colors.push([1.0, 1.0, 1.0, 1.0]);
    }

    // 使用指定背景色清空canvas
    gl.clear(gl.COLOR_BUFFER_BIT);

    for (let i = 0; i < g_points.length; i++) {
        // 顶点坐标设置
        let point = g_points[i];
        gl.vertexAttrib3f(a_Position, point[0], point[1], 0.0);    
        // 颜色设置
        let color = g_colors[i];
        gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

        // 绘制点
        gl.drawArrays(gl.POINTS, 0, 1);
    }    
}

const ClickedPoints = function() {
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
    
    // 获取attribute变量的存储位置
    let a_Position = gl.getAttribLocation(program, 'a_Position');
    if (a_Position < 0) {
      console.log("获取a_Position变量存储位置失败");
      return;
    }
    let a_PointSize = gl.getAttribLocation(program, 'a_PointSize');
    if (a_PointSize < 0) {
      console.log("获取a_PointSize变量存储位置失败");
      return;
    }
    gl.vertexAttrib1f(a_PointSize, 10.0);
    let u_FragColor = gl.getUniformLocation(program, 'u_FragColor');
    if (!u_FragColor) {
        console.log("获取u_FragColor变量存储位置失败");
        return;
    }

    // 注册鼠标点击事件
    canvas.onmousedown = function(ev) {
        click(ev, gl, canvas, a_Position, u_FragColor);
    }

    // 指定canvas的背景颜色
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // 使用指定背景色清空canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    // 绘制点
    gl.drawArrays(gl.POINTS, 0, 1);
};

ClickedPoints();

export {};