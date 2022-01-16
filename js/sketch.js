let canvasSize;

let colorBase = [
    [
        [186, 39, 15],
        [186, 23, 35],
        [5, 78, 85]
    ]
];

let colorSet = colorBase[0];
let camera;

let circleRes = 24;
let circlePoints = [];

function setup() {
    canvasSize = min(windowWidth, windowHeight);
    createCanvas(canvasSize, canvasSize, WEBGL);
    colorMode(HSB, 360, 100, 100);
    camera = createCamera();
    camera.move(0, -canvasSize * 0.2, canvasSize * 0.2);
    camera.lookAt(0, 0, 0);
    perspective(PI / 3.0, 1, 0.05, canvasSize*20);

    background(colorSet[0]);

    initPoints();
    ground();
}

function initPoints() {
    for (let i = 0; i < circleRes; i++) {
        let theta = i/24 * TWO_PI;
        circlePoints.push([Math.cos(theta), Math.sin(theta)]);
    }
}

function draw() {
}

function ground() {
    fill(colorSet[1]);
    beginShape();
    vertex(-canvasSize*2, 0, canvasSize*2);
    vertex(canvasSize*2, 0, canvasSize*2);
    vertex(canvasSize*2, 0, -canvasSize*2);
    vertex(-canvasSize*2, 0, -canvasSize*2);
    endShape(CLOSE);
}