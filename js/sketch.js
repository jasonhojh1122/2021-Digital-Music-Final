let canvasSize;

let colorBase = [
    [
        [186, 39, 15],
        [186, 23, 35],
        [5, 78, 85],
        [90, 3, 85]
    ]
];

let colorSet = colorBase[0];
let cam;
let bg;

let circleRes = 24;
let circlePoints = [];


let ground;
let groundSize;

let cans = [];

let rainCnt = 1000;
let rainStartY;
let splashTime = 500;

let rains = [];

class Ground {
    constructor() {
        this.graphics = createGraphics(groundSize, groundSize);
        this.graphics.colorMode(HSB, 360, 100, 100);
        this.init();
    }

    init = () => {
        this.graphics.background(colorSet[0]);
        this.graphics.fill(colorSet[1]);
        this.graphics.noStroke();
        for (let i = 0; i < 15000; i++) {
            let s1 = random(groundSize/100, groundSize/25);
            let s2 = random(groundSize/100, groundSize/25);
            let x = random(-groundSize, groundSize);
            let z = random(-groundSize, groundSize);
            this.graphics.rect(x, z, s1, s2);
        }
        this.graphics.noFill();
        this.graphics.stroke(colorSet[0]);
        this.graphics.strokeWeight(0.6);
        for (let i = 0; i < 5000; i++) {
            let s = random(groundSize/50, groundSize/5);
            let x = random(-groundSize, groundSize);
            let z = random(-groundSize, groundSize);
            this.graphics.circle(x, z, s);
        }
        for (let i = 0; i < 6000; i++) {
            let s1 = random(groundSize/20, groundSize/10);
            let s2 = random(groundSize/20, groundSize/10);
            let x = random(-groundSize, groundSize);
            let z = random(-groundSize, groundSize);
            this.graphics.rect(x, z, s1, s2);
        }
    }

    draw = () => {
        push();
        rotateX(HALF_PI);
        texture(this.graphics);
        noStroke();
        plane(groundSize);
        pop();
    }

    pointCollided = (x1, y1, z1) => {
        return y1 >= 0;
    }
}

class Can {
    constructor(x, z, w, h, pointSkip=1) {
        this.x = x;
        this.z = z;
        this.w = w;
        this.h = h;
        this.wSquare = w*w;
        this.pointSkip = pointSkip;
        this.strokes = [];
        this.init();
    }

    init = () => {
        for (let i = 0; i < 100; i++) {
            let sp = Math.floor(random(0, circleRes));
            let ep = Math.floor(random(0, circleRes));
            this.strokes.push({
                "sh": random(0, -this.h),
                "eh": random(0, -this.h),
                "sp": sp,
                "ep": ep,
                "cnt": (ep-sp+circleRes+1) % circleRes
            })
        }
    }

    draw = () => {
        stroke(colorSet[2]);
        noFill();
        for (let i = 0; i < this.strokes.length; i++) {
            beginShape();
            for (let j = 0; j < this.strokes[i].cnt; j += this.pointSkip) {
                let h = lerp(this.strokes[i].sh, this.strokes[i].eh, j / this.strokes[i].cnt);
                let id = (this.strokes[i].sp + j) % circleRes;
                vertex(circlePoints[id][0] * this.w + this.x, h, circlePoints[id][1] * this.w + this.z);
            }
            endShape(CLOSE);
        }
    }

    pointCollided = (x1, y1, z1) => {
        return (y1 < 0 && y1 > -this.h) && (Math.pow(x1-this.x, 2) + Math.pow(z1-this.z, 2) <= this.wSquare);
    }

    canCollided = (x1, z1, w) => {
        return Math.sqrt(Math.pow(x1-this.x, 2) + Math.pow(z1-this.z, 2)) <= (this.w + w);
    }
}

class Rain {
    waterWave; splash;
    startT;
    raining; splashing;
    x; y; z; speed; len;
    constructor(startT) {
        this.startT = startT;
        this.splashing = false;
        this.init();
        this.waterWave = new WaterWave();
        this.splash = new Splash(this.onSplashEndCallback);
    }

    draw = () => {
        if (this.raining) {
            stroke(colorSet[3]);
            line(this.x, this.y, this.z, this.x, this.y - this.len, this.z);
            this.y += (millis() - this.lastT) * this.speed / 1000;
            this.lastT = millis();
            this.checkCollision();
        }
        else if (this.splashing) {
            this.splash.draw();
        }
        else {
            this.init();
        }
    }

    init = () => {
        this.x = random(-groundSize/2, groundSize/2);
        this.y = rainStartY;
        this.z = random(-groundSize/2, groundSize/2);
        this.speed = random(groundSize * 0.7, groundSize);
        this.len = random(groundSize / 15, groundSize / 5);
        this.lastT = millis();
        this.raining = true;
        this.splashing = false;
    }

    checkCollision = () => {
        if (this.y >= 0) {
            this.onCollision();
            return;
        }
        for (let i = 0; i < cans.length; i++) {
            if (cans[i].pointCollided(this.x, this.y, this.z)) {
                this.onCollision();
                break;
            }
        }
    }

    onCollision = () => {
        this.raining = false;
        this.splashing = true;
        this.splash.init(this.x, this.y, this.z);
    }

    onSplashEndCallback = () => {
        this.startT = millis() + random(0, 3000);
        this.splashing = false;
    }
}

class Splash {
    direction; range;
    x; y; z; h; startT;
    endCallback;
    constructor(endCallback) {
        this.direction = [];
        for (let i = 0; i < 5; i++) {
            this.direction.push([random(-1, 1), random(-1, 1)]);
        }
        this.range = random(groundSize / 100, groundSize / 50);
        this.h = random(groundSize / 100, groundSize / 50);
        this.endCallback = endCallback;
        this.init(0);
    }

    init = (x, y, z) => {
        this.startT = millis();
        this.x = x;
        this.y = y;
        this.z = z;
    }

    draw = () => {
        let p = (millis() - this.startT) / splashTime;
        let r = lerp(0, this.range, p);
        let y = lerp(this.y, this.y-this.h, p);
        for (let i = 0; i < this.direction.length; i++) {
            fill(colorSet[3]);
            noStroke();
            let s = this.direction[i] * r;
            push();
            translate(this.x + this.direction[i][0] * r, y, this.z + this.direction[i][1] * r);
            sphere(canvasSize / 150);
            pop();
        }
        if (p > 1) {
            this.endCallback();
        }
    }
}

class WaterWave {
    constructor() {

    }
}


function setup() {
    canvasSize = min(windowWidth, windowHeight);
    createCanvas(canvasSize, canvasSize, WEBGL);
    colorMode(HSB, 360, 100, 100);
    cam = createCamera();
    cam.move(0, -canvasSize * 1.4, canvasSize/10);
    cam.lookAt(0, 0, 0);
    perspective(PI / 3.0, 1, 0.05, canvasSize*20);

    background(colorSet[0]);

    initPoints();
    initStatic();
    initRain();
    drawStatic();
}

function initPoints() {
    for (let i = 0; i < circleRes; i++) {
        let theta = i/24 * TWO_PI;
        circlePoints.push([Math.cos(theta), Math.sin(theta)]);
    }
}

function initStatic() {
    groundSize = canvasSize * 4;
    ground = new Ground();
    let cnt = random(3, 15);
    for (let i = 0; i < cnt; i++) {
        let x = random(-groundSize/8, groundSize/8);
        let z = random(-groundSize/4, groundSize/6);
        let w = random(canvasSize * 0.05, canvasSize * 0.1);
        let h = random(canvasSize * 0.2, canvasSize * 0.4);
        let pointSkip = Math.floor(random(1, 4))
        while (true) {
            let collided = false;
            for (let j = 0; j < cans.length; j++) {
                if (cans[j].canCollided(x, z, w + groundSize/25)) {
                    collided = true;
                    x = random(-groundSize/8, groundSize/8);
                    z = random(-groundSize/4, groundSize/6);
                    w = random(canvasSize * 0.05, canvasSize * 0.1);
                    break;
                }
            }
            if (!collided) break;
        }
        cans.push(new Can(x, z, w, h, pointSkip))
    }
}

function drawStatic() {
    ground.draw();
    cans.forEach( function(item) {
        item.draw();
    })
}

function initRain() {
    rainStartY = -groundSize;
    for (let i = 0; i < rainCnt; i++) {
        rains.push(new Rain(random(i * 10, Math.min(i * 1000, 10000))));
    }
}

function drawRain() {
    let t = millis();
    rains.forEach(function(item){
        if (item.startT < t)
            item.draw();
    })
}

function draw() {
    drawStatic();
    drawRain();

    rains[0].draw();
}

function xzRectangle(x, y, z, xSize, zSize) {
    beginShape();
    vertex(x-xSize/2, y, z+zSize/2);
    vertex(x+xSize/2, y, z+zSize/2);
    vertex(x+xSize/2, y, z-zSize/2);
    vertex(x-xSize/2, y, z-zSize/2);
    endShape(CLOSE);
}

function xzCircle(x, y, z, radius) {
    beginShape();
    for (let i = 0; i < circleRes; i++) {
        vertex(circlePoints[i][0] * radius + x, y, circlePoints[i][1] * radius + z)
    }
    endShape(CLOSE);
}