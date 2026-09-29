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

// Helper function to create a single triangle set
function makeTri(p1, p2, p3, rgb) {
    return {
        material: { diffuse: rgb },
        vertices: [p1, p2, p3],
        triangles: [[0, 1, 2]]
    };
}

// Helper function to create a pointy 3D-faceted cactus column (2 triangular facets)
function addFacetedColumn(sceneSets, xBaseLeft, xBaseRight, yBase, xTip, yTip, z, colorLight, colorDark) {
    var xMid = (xBaseLeft + xBaseRight) / 2;
    // Left facet (illuminated)
    sceneSets.push(makeTri([xBaseLeft, yBase, z], [xMid, yBase, z], [xTip, yTip, z], colorLight));
    // Right facet (shadow)
    sceneSets.push(makeTri([xMid, yBase, z], [xBaseRight, yBase, z], [xTip, yTip, z], colorDark));
}

// Generate geometry data for a low-poly triangular cactus desert
function generateCactusSceneData() {
    var sceneSets = [];

    // --- 1. LOW-POLY SUN & RAYS (Upper Right) ---
    var sunCenter = [0.65, 0.65, 0.95];
    var cLight = [1.0, 0.88, 0.3];
    var cDark  = [0.95, 0.70, 0.15];
    var cRay   = [0.98, 0.55, 0.10];

    // Diamond Sun Core
    sceneSets.push(makeTri(sunCenter, [0.50, 0.65, 0.95], [0.65, 0.82, 0.95], cLight));
    sceneSets.push(makeTri(sunCenter, [0.65, 0.82, 0.95], [0.80, 0.65, 0.95], cLight));
    sceneSets.push(makeTri(sunCenter, [0.80, 0.65, 0.95], [0.65, 0.48, 0.95], cDark));
    sceneSets.push(makeTri(sunCenter, [0.65, 0.48, 0.95], [0.50, 0.65, 0.95], cDark));

    // Sharp Triangular Sun Rays
    sceneSets.push(makeTri([0.65, 0.82, 0.96], [0.60, 0.85, 0.96], [0.65, 0.95, 0.96], cRay));
    sceneSets.push(makeTri([0.80, 0.65, 0.96], [0.83, 0.70, 0.96], [0.94, 0.65, 0.96], cRay));
    sceneSets.push(makeTri([0.65, 0.48, 0.96], [0.70, 0.45, 0.96], [0.65, 0.35, 0.96], cRay));
    sceneSets.push(makeTri([0.50, 0.65, 0.96], [0.47, 0.60, 0.96], [0.36, 0.65, 0.96], cRay));


    // --- 2. LAYERED TRIANGULAR MOUNTAINS & SAND DUNES ---
    // Distant Red Mountain Peaks
    sceneSets.push(makeTri([-1.0, -0.3, 0.92], [-0.5, 0.35, 0.92], [0.1, -0.3, 0.92], [0.55, 0.25, 0.30]));
    sceneSets.push(makeTri([-0.2, -0.3, 0.91], [0.35, 0.42, 0.91], [0.9, -0.3, 0.91], [0.65, 0.32, 0.28]));

    // Midground Sand Dunes (Overlapping Triangles)
    sceneSets.push(makeTri([-1.0, -0.5, 0.85], [-0.3, 0.10, 0.85], [0.4, -0.5, 0.85], [0.82, 0.50, 0.22]));
    sceneSets.push(makeTri([-0.3, -0.5, 0.83], [0.4, 0.02, 0.83], [1.0, -0.5, 0.83], [0.88, 0.60, 0.26]));

    // Foreground Faceted Floor
    sceneSets.push(makeTri([-1.0, -1.0, 0.80], [-1.0, -0.5, 0.80], [0.0, -0.5, 0.80], [0.90, 0.64, 0.32]));
    sceneSets.push(makeTri([-1.0, -1.0, 0.80], [0.0, -0.5, 0.80], [0.2, -1.0, 0.80], [0.84, 0.58, 0.28]));
    sceneSets.push(makeTri([0.2, -1.0, 0.80], [0.0, -0.5, 0.80], [1.0, -0.5, 0.80], [0.92, 0.68, 0.35]));
    sceneSets.push(makeTri([0.2, -1.0, 0.80], [1.0, -0.5, 0.80], [1.0, -1.0, 0.80], [0.86, 0.60, 0.30]));


    // --- 3. POINTY LOW-POLY CACTI ---
    var g1L = [0.22, 0.68, 0.32], g1D = [0.12, 0.48, 0.22]; // Classic Green
    var g2L = [0.32, 0.78, 0.38], g2D = [0.18, 0.58, 0.26]; // Lime Green
    var g3L = [0.18, 0.52, 0.28], g3D = [0.08, 0.35, 0.18]; // Olive Dark

    // CACTUS 1 (Large Left Saguaro)
    // Main Trunk
    addFacetedColumn(sceneSets, -0.56, -0.40, -0.50, -0.48, 0.38, 0.6, g1L, g1D);
    // Left Arm
    addFacetedColumn(sceneSets, -0.50, -0.48, -0.15, -0.68, 0.05, 0.6, g1L, g1D);
    addFacetedColumn(sceneSets, -0.72, -0.64,  0.02, -0.68, 0.22, 0.6, g1L, g1D);
    // Right Arm
    addFacetedColumn(sceneSets, -0.48, -0.46, -0.05, -0.28, 0.08, 0.6, g1L, g1D);
    addFacetedColumn(sceneSets, -0.32, -0.24,  0.05, -0.28, 0.28, 0.6, g1L, g1D);
    // Flower on top
    sceneSets.push(makeTri([-0.52, 0.38, 0.58], [-0.44, 0.38, 0.58], [-0.48, 0.46, 0.58], [0.95, 0.20, 0.52]));

    // CACTUS 2 (Right Tall Cactus)
    // Main Trunk
    addFacetedColumn(sceneSets, 0.25, 0.37, -0.45, 0.31, 0.25, 0.6, g2L, g2D);
    // Left Arm
    addFacetedColumn(sceneSets, 0.29, 0.31, -0.20, 0.12, -0.08, 0.6, g2L, g2D);
    addFacetedColumn(sceneSets, 0.10, 0.16, -0.10, 0.13, 0.08, 0.6, g2L, g2D);
    // Right Arm
    addFacetedColumn(sceneSets, 0.31, 0.33, -0.10, 0.48, 0.02, 0.6, g2L, g2D);
    addFacetedColumn(sceneSets, 0.43, 0.49,  0.00, 0.46, 0.16, 0.6, g2L, g2D);
    // Flower on top
    sceneSets.push(makeTri([0.27, 0.25, 0.58], [0.35, 0.25, 0.58], [0.31, 0.32, 0.58], [0.98, 0.35, 0.65]));

    // CACTUS 3 (Small Center Background Cactus)
    addFacetedColumn(sceneSets, -0.07, -0.01, -0.40, -0.04, -0.08, 0.7, g3L, g3D);
    addFacetedColumn(sceneSets, -0.04, -0.03, -0.28, -0.14, -0.20, 0.7, g3L, g3D);
    addFacetedColumn(sceneSets, -0.16, -0.12, -0.22, -0.14, -0.08, 0.7, g3L, g3D);

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
