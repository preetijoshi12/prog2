/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "triangles.json"; // points to local triangles file
const INPUT_SPHERES_URL = "spheres.json"; // spheres file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object
var vertexBuffer; // contains vertex coordinates in triples
var colorBuffer; // contains vertex colors in triples (RGB)
var triangleBuffer; // contains indices into vertexBuffer in triples
var triBufferSize = 0; // number of indices in the triangle buffer
var vertexPositionAttrib; // vertex shader position location
var vertexColorAttrib; // vertex shader color location

/* assignment 5 globals */
var defaultTrianglesData = null;
var showingCustomScene = false;


// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest();
            httpReq.open("GET",url,false);
            httpReq.send(null);
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            }
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        }
    }    
    catch(e) {
        console.log(e);
        return(String.null);
    }
}

// Helper function to build 2-triangle rectangular sets easily
function makeRectSet(x1, y1, x2, y2, z, rgbColor) {
    return {
        material: { diffuse: rgbColor },
        vertices: [[x1, y1, z], [x1, y2, z], [x2, y2, z], [x2, y1, z]],
        triangles: [[0, 1, 2], [0, 2, 3]]
    };
}

// Generate geometry data for multiple cacti and desert ground
function generateCactusSceneData() {
    var sceneSets = [];

    // 1. Desert Sand / Ground (Warm Sand Color)
    sceneSets.push(makeRectSet(-1.0, -1.0, 1.0, -0.4, 0.9, [0.85, 0.65, 0.35]));

    // 2. Desert Sun (Yellow-Orange Octagon/Triangle Fan)
    sceneSets.push({
        material: { diffuse: [0.98, 0.75, 0.18] },
        vertices: [
            [0.65, 0.65, 0.95],
            [0.50, 0.65, 0.95], [0.55, 0.80, 0.95], [0.65, 0.85, 0.95], [0.75, 0.80, 0.95],
            [0.80, 0.65, 0.95], [0.75, 0.50, 0.95], [0.65, 0.45, 0.95], [0.55, 0.50, 0.95]
        ],
        triangles: [
            [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5],
            [0, 5, 6], [0, 6, 7], [0, 7, 8], [0, 8, 1]
        ]
    });

    // 3. CACTUS 1: Large Center-Left Cactus with Pot (Classic Saguaro Green)
    var c1Green = [0.15, 0.55, 0.22];
    sceneSets.push(makeRectSet(-0.55, -0.55, -0.35, -0.40, 0.7, [0.75, 0.32, 0.18])); // Terracotta Pot
    sceneSets.push(makeRectSet(-0.48, -0.40, -0.42,  0.30, 0.6, c1Green));           // Main Trunk
    sceneSets.push(makeRectSet(-0.62, -0.10, -0.48, -0.02, 0.6, c1Green));           // Left Arm Base
    sceneSets.push(makeRectSet(-0.62, -0.02, -0.56,  0.15, 0.6, c1Green));           // Left Arm Top
    sceneSets.push(makeRectSet(-0.42,  0.02, -0.28,  0.10, 0.6, c1Green));           // Right Arm Base
    sceneSets.push(makeRectSet(-0.34,  0.10, -0.28,  0.22, 0.6, c1Green));           // Right Arm Top

    // 4. CACTUS 2: Smaller Right Cactus (Lighter Lime-Green)
    var c2Green = [0.25, 0.68, 0.30];
    sceneSets.push(makeRectSet( 0.25, -0.50,  0.33,  0.10, 0.6, c2Green));           // Main Trunk
    sceneSets.push(makeRectSet( 0.15, -0.22,  0.25, -0.15, 0.6, c2Green));           // Left Arm Base
    sceneSets.push(makeRectSet( 0.15, -0.15,  0.20,  0.00, 0.6, c2Green));           // Left Arm Top
    sceneSets.push(makeRectSet( 0.33, -0.10,  0.43, -0.03, 0.6, c2Green));           // Right Arm Base
    sceneSets.push(makeRectSet( 0.38, -0.03,  0.43,  0.08, 0.6, c2Green));           // Right Arm Top

    // 5. CACTUS 3: Distance Background Cactus (Darker Olive Green)
    var c3Green = [0.12, 0.42, 0.20];
    sceneSets.push(makeRectSet(-0.05, -0.45, -0.01, -0.10, 0.8, c3Green));           // Main Trunk
    sceneSets.push(makeRectSet(-0.10, -0.32, -0.05, -0.27, 0.8, c3Green));           // Left Arm
    sceneSets.push(makeRectSet(-0.10, -0.27, -0.07, -0.18, 0.8, c3Green));
    sceneSets.push(makeRectSet(-0.01, -0.25,  0.04, -0.20, 0.8, c3Green));           // Right Arm
    sceneSets.push(makeRectSet( 0.02, -0.20,  0.04, -0.13, 0.8, c3Green));

    return sceneSets;
}

// Convert dataset into WebGL buffers
function buildBuffersFromData(trianglesData) {
    if (!trianglesData) return;

    var coordArray = [];
    var colorArray = [];
    var indexArray = [];
    var vertexOffset = 0;

    for (var whichSet = 0; whichSet < trianglesData.length; whichSet++) {
        var currSet = trianglesData[whichSet];

        for (var whichSetVert = 0; whichSetVert < currSet.vertices.length; whichSetVert++) {
            coordArray = coordArray.concat(currSet.vertices[whichSetVert]);
            colorArray = colorArray.concat(currSet.material.diffuse);
        }

        for (var whichSetTri = 0; whichSetTri < currSet.triangles.length; whichSetTri++) {
            var tri = currSet.triangles[whichSetTri];
            indexArray.push(tri[0] + vertexOffset, tri[1] + vertexOffset, tri[2] + vertexOffset);
        }

        vertexOffset += currSet.vertices.length;
    }

    triBufferSize = indexArray.length;

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coordArray), gl.STATIC_DRAW);

    colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorArray), gl.STATIC_DRAW);

    triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexArray), gl.STATIC_DRAW);
}

// set up the webGL environment
function setupWebGL() {
    var canvas = document.getElementById("myWebGLCanvas");
    gl = canvas.getContext("webgl");
    
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
      }
    }
    catch(e) {
      console.log(e);
    }
}

// read triangles in, load default data
function loadTriangles() {
    defaultTrianglesData = getJSONFile(INPUT_TRIANGLES_URL,"triangles");
    if (defaultTrianglesData != String.null) { 
        buildBuffersFromData(defaultTrianglesData);
    }
}

// setup key event listener for spacebar press
function setupKeyboard() {
    document.addEventListener("keydown", function(event) {
        if (event.code === "Space" || event.keyCode === 32) {
            event.preventDefault(); // stop page scrolling
            
            showingCustomScene = !showingCustomScene;
            
            if (showingCustomScene) {
                var cactusData = generateCactusSceneData();
                buildBuffersFromData(cactusData);
            } else {
                buildBuffersFromData(defaultTrianglesData);
            }
            
            renderTriangles();
        }
    });
}

// setup the webGL shaders
function setupShaders() {
    var fShaderCode = `
        precision mediump float;
        varying vec3 vColor;

        void main(void) {
            gl_FragColor = vec4(vColor, 1.0); 
        }
    `;
    
    var vShaderCode = `
        attribute vec3 vertexPosition;
        attribute vec3 vertexColor;
        varying vec3 vColor;

        void main(void) {
            vColor = vertexColor;
            gl_Position = vec4(vertexPosition, 1.0);
        }
    `;
    
    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fShader,fShaderCode);
        gl.compileShader(fShader);

        var vShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vShader,vShaderCode);
        gl.compileShader(vShader);
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
        } else {
            var shaderProgram = gl.createProgram();
            gl.attachShader(shaderProgram, fShader);
            gl.attachShader(shaderProgram, vShader);
            gl.linkProgram(shaderProgram);

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else {
                gl.useProgram(shaderProgram);
                
                vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "vertexPosition"); 
                gl.enableVertexAttribArray(vertexPositionAttrib);

                vertexColorAttrib = gl.getAttribLocation(shaderProgram, "vertexColor");
                gl.enableVertexAttribArray(vertexColorAttrib);
            }
        }
    } 
    catch(e) {
        console.log(e);
    }
}

// render the loaded model
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(vertexColorAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);

    gl.drawElements(gl.TRIANGLES, triBufferSize, gl.UNSIGNED_SHORT, 0);
}

/* MAIN execution */
function main() {
  setupWebGL();
  loadTriangles();
  setupShaders();
  setupKeyboard();
  renderTriangles();
}
