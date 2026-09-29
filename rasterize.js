/* GLOBAL CONSTANTS AND VARIABLES */
const WIN_Z = 0;
const WIN_LEFT = 0; const WIN_RIGHT = 1;
const WIN_BOTTOM = 0; const WIN_TOP = 1;
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json";
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/spheres.json";
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0);

/* webgl globals */
var gl = null;
var vertexBuffer;
var colorBuffer;
var triangleBuffer;
var triBufferSize = 0;
var vertexPositionAttrib;
var vertexColorAttrib;

// Helper function to fetch JSON
function getJSONFile(url, descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest();
            httpReq.open("GET", url, false);
            httpReq.send(null);
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now() - startTime) > 3000) break;
            }
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open " + descr + " file!";
            else
                return JSON.parse(httpReq.response); 
        }
    } catch(e) {
        console.log(e);
        return null;
    }
}

// Setup WebGL Context
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
    } catch(e) {
      console.log(e);
    }
}

// Load triangles and color data
function loadTriangles() {
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL, "triangles");
    if (inputTriangles != null) { 
        var coordArray = [];
        var colorArray = [];
        var indexArray = [];
        var vertexOffset = 0;

        for (var whichSet = 0; whichSet < inputTriangles.length; whichSet++) {
            var currSet = inputTriangles[whichSet];
            var diffuse = currSet.material.diffuse;

            // 1. Append coordinates and diffuse color per vertex
            for (var whichSetVert = 0; whichSetVert < currSet.vertices.length; whichSetVert++) {
                coordArray = coordArray.concat(currSet.vertices[whichSetVert]);
                colorArray = colorArray.concat(diffuse);
            }

            // 2. Append triangle indices with offset
            for (var whichSetTri = 0; whichSetTri < currSet.triangles.length; whichSetTri++) {
                var tri = currSet.triangles[whichSetTri];
                indexArray.push(tri[0] + vertexOffset, tri[1] + vertexOffset, tri[2] + vertexOffset);
            }

            vertexOffset += currSet.vertices.length;
        }

        triBufferSize = indexArray.length;

        // Position Buffer
        vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coordArray), gl.STATIC_DRAW);

        // Color Buffer
        colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorArray), gl.STATIC_DRAW);

        // Index Buffer
        triangleBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexArray), gl.STATIC_DRAW);
    }
}

// Setup Shaders
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
        gl.shaderSource(fShader, fShaderCode);
        gl.compileShader(fShader);

        var vShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vShader, vShaderCode);
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
    } catch(e) {
        console.log(e);
    }
}

// Render Triangles
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Position Attribute Binding
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0);

    // Color Attribute Binding
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(vertexColorAttrib, 3, gl.FLOAT, false, 0, 0);

    // Index Buffer Binding
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);

    // Draw Triangles
    gl.drawElements(gl.TRIANGLES, triBufferSize, gl.UNSIGNED_SHORT, 0);
}

function main() {
    setupWebGL();
    loadTriangles();
    setupShaders();
    renderTriangles();
}
