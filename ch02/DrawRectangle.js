function main() {
    var canvas = document.getElementById("example");
    if (!canvas) {
        console.log("获取canvas元素失败");
        return;
    }
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = 'rgba(0, 0, 255, 1.0)';
    ctx.fillRect(0, 0, 400, 150);
}