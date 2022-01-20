let canvasSize;

let colorBase = [
    [   // blue
        [186, 39, 15],
        [186, 23, 35],
        [5, 78, 85],
        [90, 3, 85]
    ],
    [   // pink
        [338, 33, 45],
        [344, 33, 75],
        [208, 25, 85],
        [349, 22, 97]
    ],
    [   // green
        [67, 98, 15],
        [62, 85, 25],
        [22, 70, 75],
        [62, 83, 85]
    ],
    [   // black
        [0, 0, 90],
        [0, 0, 65],
        [0, 0, 5],
        [0, 0, 10]
    ]
];

let colorSet = colorBase[ Math.floor(Math.random() * colorBase.length) ];
let C_DARK = 0, C_LIGHT = 1, C_CAN = 2, C_RAIN = 3;
let cam;
let bg;

let circleRes = 24;
let circlePoints = [];

let ground;
let groundSize;

let canRes = 80;
let canMinCnt = 3;
let canMaxCnt = 9;
let cans = [];

let drawReflection = true;
let canReflectionLineCnt = 12;
let canReflectionLineRes = 6;

let angleLightY = Math.random() * 40 + 20;
let angleLightX = Math.random() * 35 + 30;

let rainCnt = 1000;
let rainStartY;

let thunder;
let lightingLen = 150;
let lightingThunderGap = 500;
let thunderSoundLen = 6000;
let minThunderGap = 8000 + thunderSoundLen;
let maxThunderGap = 20000 + thunderSoundLen;

let splashRes = 5;
let splashTime = 500;

let rains = [];

let pdWrapper;

class PDWrapper {
    constructor() {}

    setRainVolume = (volume) => {
        Pd.send('rainVolume', [volume]);
    }

    setCanFreq = (canID, freq) => {
        Pd.send('canFreq_'.concat(canID.toString()), [freq]);
    }

    hitCan = (canID) => {
        Pd.send('can_'.concat(canID.toString()), ['bang']);
    }

    thunder = () => {
        Pd.send('thunder', ['bang']);
    }
}

class Ground {
    constructor() {
        this.graphics = createGraphics(groundSize, groundSize);
        this.graphics.colorMode(HSB, 360, 100, 100);
        this.init();
    }

    init = () => {
        this.graphics.background(colorSet[C_DARK]);
        this.graphics.fill(colorSet[C_LIGHT]);
        this.graphics.noStroke();
        for (let i = 0; i < 15000; i++) {
            let s1 = random(groundSize/100, groundSize/25);
            let s2 = random(groundSize/100, groundSize/25);
            let x = random(-groundSize, groundSize);
            let z = random(-groundSize, groundSize);
            this.graphics.rect(x, z, s1, s2);
        }
        this.graphics.noFill();
        this.graphics.stroke(colorSet[C_DARK]);
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
    constructor(x, z, w, h) {
        this.x = x;
        this.z = z;
        this.w = w;
        this.h = h;
        this.wSquare = w*w;
        this.strokes = [];
        this.init();
    }

    init = () => {
        for (let i = 0; i < canRes; i++) {
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
        stroke(colorSet[C_CAN]);
        strokeWeight(1);
        noFill();
        for (let i = 0; i < this.strokes.length; i++) {
            beginShape();
            for (let j = 0; j < this.strokes[i].cnt; j++) {
                let h = lerp(this.strokes[i].sh, this.strokes[i].eh, j / this.strokes[i].cnt);
                let id = (this.strokes[i].sp + j) % circleRes;
                vertex(circlePoints[id][0] * this.w + this.x, h, circlePoints[id][1] * this.w + this.z);
            }
            endShape(CLOSE);
        }
    }

    drawReflection = () => {
        let radius = this.h * Math.tan(radians(angleLightY));
        let maxZ = radius * Math.sin(radians(angleLightX));
        let maxXOffset = radius * Math.cos(radians(angleLightX));
        noFill();
        stroke(colorSet[C_RAIN]);
        strokeWeight(1);
        for (let i = 0; i < canReflectionLineCnt; i++) {
            let p = i / canReflectionLineCnt;
            let baseZ = lerp(0, -maxZ, p) + this.z;
            let xOffset = lerp(0, maxXOffset, p);
            beginShape();
            for (let j = 0; j < canReflectionLineRes; j++) {
                let lx = lerp(-this.w, this.w, j/canReflectionLineRes) + xOffset + this.x;
                let lz = baseZ + random(-maxZ/35, maxZ/35);
                vertex(lx, -1, lz);
            }
            endShape();
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
    raining; splashing; waving;
    x; y; z; speed; len;
    constructor(startT) {
        this.startT = startT;
        this.init();
        this.waterWave = new WaterWave(this.onAnimEndCallback);
        this.splash = new Splash(this.onAnimEndCallback);
    }

    draw = () => {
        strokeWeight(1);
        if (this.raining) {
            strokeWeight(1);
            stroke(colorSet[C_RAIN]);
            line(this.x, this.y, this.z, this.x, this.y - this.len, this.z);
            this.y += (millis() - this.lastT) * this.speed / 1000;
            this.lastT = millis();
            this.checkCollision();
        }
        else if (this.splashing) {
            this.splash.draw();
        }
        else if (this.waving) {
            this.waterWave.draw();
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
        this.waving = false;
    }

    checkCollision = () => {
        if (this.y >= 0) {
            this.raining = false;
            this.waving = true;
            this.waterWave.init(this.x, this.z);
            return;
        }
        for (let i = 0; i < cans.length; i++) {
            if (cans[i].pointCollided(this.x, this.y, this.z)) {
                this.raining = false;
                this.splashing = true;
                this.splash.init(this.x, this.y, this.z);
                pdWrapper.hitCan(i);
                break;
            }
        }
    }

    onAnimEndCallback = () => {
        this.startT = millis() + random(0, 3000);
        this.waving = false;
        this.splashing = false;
    }
}

class Splash {
    direction; radius; particleSize;
    x; y; z; h; startT;
    endCallback;
    constructor(endCallback) {
        this.direction = [];
        for (let i = 0; i < splashRes; i++) {
            this.direction.push([random(-1, 1), random(-1, 1)]);
        }
        this.radius = random(groundSize / 100, groundSize / 50);
        this.h = random(groundSize / 100, groundSize / 50);
        this.endCallback = endCallback;
        this.particleSize = canvasSize / 60;
        this.init(0, 0, 0);
    }

    init = (x, y, z) => {
        this.startT = millis();
        this.x = x;
        this.y = y;
        this.z = z;
    }

    draw = () => {
        let p = (millis() - this.startT) / splashTime;
        let r = lerp(0, this.radius, p);
        let y = lerp(this.y, this.y-this.h, p);
        for (let i = 0; i < this.direction.length; i++) {
            fill(colorSet[C_RAIN]);
            noStroke();
            push();
            translate(this.x + this.direction[i][0] * r, y, this.z + this.direction[i][1] * r);
            sphere(this.particleSize, 3, 3);
            pop();
        }
        if (p > 1) {
            this.endCallback();
        }
    }
}

class WaterWave {
    radius;
    x; z;
    startT;
    endCallback;
    constructor(endCallback) {
        this.radius = random(groundSize / 100, groundSize / 30);
        this.endCallback = endCallback;
    }

    init = (x, z) => {
        this.startT = millis();
        this.x = x;
        this.z = z;
    }

    draw = () => {
        let p = (millis() - this.startT) / splashTime;
        let r = lerp(0, this.radius, p);
        stroke(colorSet[C_RAIN]);
        noFill();
        xzCircle(this.x, -10, this.z, r);
        if (p > 1) {
            this.endCallback();
        }
    }
}

class Thunder {
    z; eventT; waitT;
    thundering; lighting;
    constructor() {
        this.z = canvasSize/10;
        this.thundering = false;
        this.lighting = false;
        this.eventT = millis();
        this.waitT = random(minThunderGap, maxThunderGap);
    }

    draw = () => {
        if (this.lighting) {
            fill(colorSet[C_DARK][0], colorSet[C_DARK][1], 90 ,0.6);
            noStroke();
            push();
            translate(0, -40, this.z);
            rotateX(HALF_PI);
            plane(groundSize, groundSize);
            pop();
            if (millis() > this.eventT + lightingLen) {
                this.lighting = false;
                this.thundering = true;
                this.eventT = millis();
            }
        }
        else if (this.thundering && (millis() > this.eventT + lightingThunderGap)) {
            pdWrapper.thunder();
            this.thundering = false;
            this.eventT = millis();
            this.waitT = random(minThunderGap, maxThunderGap);
        }
        else if (millis() > this.eventT + this.waitT) {
            this.lighting = true;
            this.eventT = millis();
        }
    }

}

function setup() {
    canvasSize = min(windowWidth, windowHeight);
    createCanvas(canvasSize, canvasSize, WEBGL);
    colorMode(HSB, 360, 100, 100, 1);
    cam = createCamera();
    cam.move(0, -canvasSize * 1.4, canvasSize/10);
    cam.lookAt(0, 0, 0);
    perspective(PI / 3.0, 1, 0.05, canvasSize*20);

    background(colorSet[C_DARK]);

    pdWrapper = new PDWrapper();
    initPoints();
    initStatic();
    initWeather();
    drawStatic();
}

function initPoints() {
    for (let i = 0; i < circleRes; i++) {
        let theta = i/circleRes * TWO_PI;
        circlePoints.push([Math.cos(theta), Math.sin(theta)]);
    }
}

function initStatic() {
    groundSize = canvasSize * 4;
    ground = new Ground();
    let cnt = random(canMinCnt, canMaxCnt);
    for (let i = 0; i < cnt; i++) {
        let x = random(-groundSize/8, groundSize/8);
        let z = random(-groundSize/4, groundSize/6);
        let w = random(canvasSize * 0.05, canvasSize * 0.1);
        let h = random(canvasSize * 0.2, canvasSize * 0.4);
        let pointSkip = Math.floor(random(1, 4))
        while (true) {
            let collided = false;
            for (let j = 0; j < cans.length; j++) {
                if (cans[j].canCollided(x, z, w + groundSize/30)) {
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
        pdWrapper.setCanFreq(i, lerp(80, 180, (w-canvasSize * 0.05) / (canvasSize * 0.05)));
    }
}

function drawStatic() {
    ground.draw();
    cans.forEach( function(item) {
        item.draw();
        if (drawReflection)
            item.drawReflection();
    })
}

function initWeather() {
    rainStartY = -groundSize;
    for (let i = 0; i < rainCnt; i++) {
        rains.push(new Rain(random(i * 10, Math.min(i * 1000, 10000))));
    }
    thunder = new Thunder();
}

function drawWeather() {
    let t = millis();
    rains.forEach(function(item){
        if (item.startT < t)
            item.draw();
    })
    thunder.draw();
}

function draw() {
    drawStatic();
    drawWeather();
    if (millis() < 4000)
        pdWrapper.setRainVolume( lerp(0, 1, millis() / 4000) );
    else
        pdWrapper.setRainVolume( random(0.8, 1) );
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