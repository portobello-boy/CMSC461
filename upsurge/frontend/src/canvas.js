import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import Minimap from 'react-minimap';
//import Draggable, {DraggableCore} from 'react-draggable'; // Both at the same time

// Get CSS
import 'react-minimap/dist/react-minimap.css';
import './canvas.css'
import Draggable, { DraggableCore } from 'react-draggable'; // Both at the same time

// Get Images
import AND from './images/AND.svg';
import OR from './images/OR.svg';
import NOT from './images/NOT.svg';
import XOR from './images/XOR.svg';
import NOR from './images/NOR.svg';
import NAND from './images/NAND.svg';
import XNOR from './images/XNOR.svg';
import UNDO from './images/UNDO.png';
import REDO from './images/REDO.png';
import RESET from './images/RESET.png';

let typeMap = {
    'and': '&',
    'or': '|',
    'xor': '^',
    'not': '!',
    'nand': '!&',
    'nor': '!|',
    'xnor': '!^'
};

const io = require('./io')

class Canvas extends Component {
    constructor(props) {
        super(props);
        this.state = {
            // circuit: {}
            circuit: {
            //     "component": {
            //         "inputs": [
            //             {
            //                 "name": "x",
            //                 "type": "static",
            //                 "value": true
            //             },
            //             {
            //                 "name": "y",
            //                 "type": "placeholder"
            //             },
            //             {
            //                 "name": "z",
            //                 "type": "placeholder"
            //             }
            //         ],
            //         "gates": [
            //             {
            //                 "name": "and1",
            //                 "type": "and",
            //                 "inputs": ["x", "y"],
			// },
            //             {
            //                 "name": "or1",
            //                 "type": "or",
            //                 "inputs": ["and1", "z"],
			// }
            //         ],
            //         "outputs": [
            //             {
            //                 "name": "o1",
            //                 "type": "static",
            //                 "inputs": ["or1"]
            //             },
            //             {
            //                 "name": "o2",
            //                 "type": "static",
            //                 "inputs": ["and1"]
            //             }
            //         ]
            //     }
            }
        };

        // Bind functions to this
        this.draw = this.draw.bind(this);
        this.openDrawer = this.openDrawer.bind(this);

        // Define variables
        this.zoom = 50;
        this.offset = {
            x: 0,
            y: 0
        };
        this.mouse = {
            grid: { // Position on grid
                x: 0,
                y: 0
            },
            gridLiteral: {
                x: 0,
                y: 0
            },
            screen: { // Position on screen
                x: 0,
                y: 0
            }
        };
        this.settings = { // Various flags
            scrollAnimation: true,
            zoomAnimation: true
        };
        this.scrollAnimation = {
            v: 0, // Velocity
            r: 0, // Rate
            animate: false // Animation flag
        };
        this.zoomAnimation = this.zoom;

        // Helpers
        this.wheel = null; // Mouse wheel usage (not functioning)
        this.selecting = null;
        this.dragging = null;
        this.connecting = null;
        this.animFrameID = null;
        this.selectedGate = null;
        this.selectedNode = null;
        this.count = 0;

        // List of Items on Canvas
        this.items = [
            // {
            //     label: "AND#01",
            //     type: "gate",
            //     val: "and",
            //     location: {
            //         x: 10,
            //         y: -5
            //     },
            //     dimension: {
            //         width: 2,
            //         height: 2
            //     },
            //     inputs: [null, null]
            // },
            // {
            //     label: "NOT#01",
            //     type: "gate",
            //     val: "not",
            //     location: {
            //         x: 15,
            //         y: -10
            //     },
            //     dimension: {
            //         width: 1,
            //         height: 1
            //     },
            //     inputs: [null]
            // },
            // {
            //     label: "INPUT#01",
            //     type: "input",
            //     val: "0",
            //     location: {
            //         x: 10,
            //         y: -10
            //     },
            //     dimension: {
            //         width: 1,
            //         height: 1
            //     }
            // },
            // {
            //     label: "OUTPUT#01",
            //     type: "output",
            //     val: "-",
            //     location: {
            //         x: 18,
            //         y: -10
            //     },
            //     dimension: {
            //         width: 1,
            //         height: 1
            //     },
            //     inputs: [null]
            // }
        ];

        // List of wires
        this.wires = [];

        // Undo Stack
        this.undoStack = [];
    };

    gridToPixel(x, y) {     //Takes in a position on the grid and returns the pixel for it.
        return {
            x: (x - this.offset.x) * this.zoom,
            y: (-y + this.offset.y) * this.zoom
        }
    }

    dist(x1, y1, x2, y2) {
        return Math.sqrt((x1-x2)**2 + (y1-y2)**2);
    }

    updateMouse(e) {
        this.mouse.grid.x = Math.floor(e.x / this.zoom + this.offset.x);
        this.mouse.grid.y = Math.ceil(-e.y / this.zoom + this.offset.y);
        this.mouse.gridLiteral.x = e.x / this.zoom + this.offset.x;
        this.mouse.gridLiteral.y = -e.y / this.zoom + this.offset.y;
        this.mouse.screen.x = e.x;
        this.mouse.screen.y = e.y;
    }

    drawBackground(canvas, ctx) {
        // Initialize context data
        ctx.imageSmoothingEnabled = true;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw dots
        // Initialize context fill style
        ctx.fillStyle = "rgba(200,200,200," + Math.min(1, this.zoom / 100) + ")";

        if (this.zoom > 24) {
            // Draw small dots (boxes) or lines at intervals based on the zoom level
            for (let i = (-this.offset.x * this.zoom) % this.zoom; i < canvas.width; i += this.zoom) {
                for (let j = (this.offset.y * this.zoom) % this.zoom; j < canvas.height; j += this.zoom) {
                    ctx.fillRect(i - this.zoom / 24, j - this.zoom / 24, this.zoom / 12, this.zoom / 12);
                }
            }
        }
    }

    drawWires(ctx) {
        for (let i = 0; i < this.wires.length; ++i) {
            let wire = this.wires[i];

            ctx.beginPath();
            ctx.strokeStyle = "rgba(100,0,0,0.5)";
            ctx.lineWidth = "5";

            let initLoc = this.gridToPixel(wire[0].x, wire[0].y);
            ctx.moveTo(initLoc.x, initLoc.y);

            for (let j = 1; j < wire.length; ++j) {
                let nextLoc = this.gridToPixel(wire[j].x, wire[j].y);
                ctx.lineTo(nextLoc.x, nextLoc.y);
            }

            ctx.stroke();
        }
    }

    // Code Reusability - Copied code for placed items and selected gate
    drawItems(ctx) {
        // Iterate through all elements in the "items" list
        for (let i = 0; i < this.items.length; ++i) {
            // Get screen location for item
            let comp = this.items[i];
            let location = this.gridToPixel(comp.location.x, comp.location.y);

            // Initialize drawing styles
            ctx.strokeStyle = "rgba(50,50,50,100)";
            ctx.lineWidth = this.zoom / 10;
            ctx.fillStyle = "rgba(150,150,150,255)";

            // Draw and fill bounding box
            ctx.fillRect(
                location.x + this.zoom / 2,
                location.y + this.zoom / 2,
                (comp.dimension.width * this.zoom),
                (comp.dimension.height * this.zoom)
            );
            ctx.strokeRect(
                location.x + this.zoom / 2,
                location.y + this.zoom / 2,
                (comp.dimension.width * this.zoom),
                (comp.dimension.height * this.zoom)
            );

            if (comp.type != "output") {
                // Draw output node
                ctx.beginPath();
                ctx.moveTo(
                    location.x + this.zoom / 2 + (comp.dimension.width) * this.zoom,
                    location.y + this.zoom / 2 + (1 / 2) * this.zoom
                );
                ctx.lineTo(
                    location.x + this.zoom / 2 + (comp.dimension.width) * this.zoom + this.zoom / 2,
                    location.y + this.zoom / 2 + (1 / 2) * this.zoom
                );
                ctx.stroke();

                // Draw output node part 2
                ctx.lineWidth = this.zoom / 20;
                ctx.fillStyle = "rgba(50,50,50,255)";
                ctx.beginPath();
                ctx.arc(
                    location.x + this.zoom / 2 + (comp.dimension.width) * this.zoom + this.zoom / 2,
                    location.y + this.zoom / 2 + (1 / 2) * this.zoom,
                    this.zoom / 10,
                    0,
                    2 * Math.PI
                );
                ctx.fill();
                ctx.stroke();
            }

            // Draw input nodes
            if (comp.hasOwnProperty('inputs')) {
                for (let j = 0; j < comp.inputs.length; ++j) {
                    ctx.beginPath();
                    ctx.strokeStyle = "rgba(50,50,50,100)";
                    ctx.lineWidth = this.zoom / 10;
                    ctx.fillStyle = "rgba(150,150,150,255)";
                    ctx.moveTo(
                        location.x + this.zoom / 2,
                        location.y + (this.zoom * (j + 1))
                    );
                    ctx.lineTo(
                        location.x,
                        location.y + (this.zoom * (j + 1))
                    );
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.fillStyle = "rgba(150,150,150,255)";
                    ctx.lineWidth = this.zoom / 20;
                    ctx.arc(
                        location.x,
                        location.y + (this.zoom * (j + 1)),
                        this.zoom / 10,
                        0,
                        2 * Math.PI
                    );
                    ctx.fill();
                    ctx.stroke();
                }
            }

            // Draw node type
            ctx.textAlign = "center";
            ctx.fillStyle = "rgba(50,50,50,255)";
            ctx.lineWidth = 5;
            ctx.font = "900 " + 2 * this.zoom / 3 + "px Arial";
            ctx.fillText(
                (typeMap[comp.val] ? typeMap[comp.val] : comp.val),
                location.x + ((1 + comp.dimension.width) / 2.0) * this.zoom,
                location.y + ((4 + 3 * comp.dimension.height) / 6.0) * this.zoom
            );

            // Draw node label
            ctx.textAlign = "start";
            ctx.fillStyle = "rgba(200,200,200,255)";
            ctx.lineWidth = 1;
            ctx.font = "100 " + this.zoom / 6 + "px Arial";
            ctx.fillText(this.items[i].label, location.x + (6 * this.zoom / 10), location.y + (4 * this.zoom) / 10 + (comp.dimension.height * this.zoom));
        }

        if (this.selectedGate != null) {
            // Get screen location for item
            let comp = this.selectedGate;
            let location = this.gridToPixel(comp.location.x, comp.location.y);

            // Initialize drawing styles
            ctx.strokeStyle = "rgba(50,50,50,0.7)";
            ctx.lineWidth = this.zoom / 10;
            ctx.fillStyle = "rgba(150,150,150,0.7)";

            // Draw and fill bounding box
            ctx.fillRect(
                location.x + this.zoom / 2,
                location.y + this.zoom / 2,
                (comp.dimension.width * this.zoom),
                (comp.dimension.height * this.zoom)
            );
            ctx.strokeRect(
                location.x + this.zoom / 2,
                location.y + this.zoom / 2,
                (comp.dimension.width * this.zoom),
                (comp.dimension.height * this.zoom)
            );

            if (comp.type != "output") {
                // Draw output node
                ctx.beginPath();
                ctx.moveTo(
                    location.x + this.zoom / 2 + (comp.dimension.width) * this.zoom,
                    location.y + this.zoom / 2 + (1 / 2) * this.zoom
                );
                ctx.lineTo(
                    location.x + this.zoom / 2 + (comp.dimension.width) * this.zoom + this.zoom / 2,
                    location.y + this.zoom / 2 + (1 / 2) * this.zoom
                );
                ctx.stroke();

                // Draw output node part 2
                ctx.lineWidth = this.zoom / 20;
                ctx.fillStyle = "rgba(50,50,50,0.7)";
                ctx.beginPath();
                ctx.arc(
                    location.x + this.zoom / 2 + (comp.dimension.width) * this.zoom + this.zoom / 2,
                    location.y + this.zoom / 2 + (1 / 2) * this.zoom,
                    this.zoom / 10,
                    0,
                    2 * Math.PI
                );
                ctx.fill();
                ctx.stroke();
            }

            // Draw input nodes
            if (comp.hasOwnProperty('inputs')) {
                for (let j = 0; j < comp.inputs.length; ++j) {
                    ctx.beginPath();
                    ctx.strokeStyle = "rgba(50,50,50,0.7)";
                    ctx.lineWidth = this.zoom / 10;
                    ctx.fillStyle = "rgba(150,150,150,0.7)";
                    ctx.moveTo(
                        location.x + this.zoom / 2,
                        location.y + (this.zoom * (j + 1))
                    );
                    ctx.lineTo(
                        location.x,
                        location.y + (this.zoom * (j + 1))
                    );
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.fillStyle = "rgba(150,150,150,0.7)";
                    ctx.lineWidth = this.zoom / 20;
                    ctx.arc(
                        location.x,
                        location.y + (this.zoom * (j + 1)),
                        this.zoom / 10,
                        0,
                        2 * Math.PI
                    );
                    ctx.fill();
                    ctx.stroke();
                }
            }

            // Draw node type
            ctx.textAlign = "center";
            ctx.fillStyle = "rgba(50,50,50,0.7)";
            ctx.lineWidth = 5;
            ctx.font = "900 " + 2 * this.zoom / 3 + "px Arial";
            ctx.fillText(
                (typeMap[comp.val] ? typeMap[comp.val] : comp.val),
                location.x + ((1 + comp.dimension.width) / 2.0) * this.zoom,
                location.y + ((4 + 3 * comp.dimension.height) / 6.0) * this.zoom
            );

            // Draw node label
            ctx.textAlign = "start";
            ctx.fillStyle = "rgba(200,200,200,0.7)";
            ctx.lineWidth = 1;
            ctx.font = "100 " + this.zoom / 6 + "px Arial";
            ctx.fillText(this.selectedGate.label, location.x + (6 * this.zoom / 10), location.y + (4 * this.zoom) / 10 + (comp.dimension.height * this.zoom));
        }
    }

    handleMotion() {
        // Handle scrolling animation
        if (this.settings.scrollAnimation) {
            if (this.scrollAnimation.animate && this.settings.scrollAnimation) { // If animation flags are up
                this.offset.x -= Math.sin(this.scrollAnimation.r) * this.scrollAnimation.v; // Modify x offset by function of rate and velocity
                this.offset.y += Math.cos(this.scrollAnimation.r) * this.scrollAnimation.v; // Modify y offset by function of rate and velocity

                this.scrollAnimation.v -= this.scrollAnimation.v / 16; // Reduce velocity by 1/16
                if (this.scrollAnimation.v <= 0.001) { // If velocity falls below a threshold
                    this.scrollAnimation.animate = false; // Deactivate flag
                }
            }
        }

        // Handle zooming animation
        if (this.settings.zoomAnimation) { // If animation flag is up
            this.offset.x += this.mouse.screen.x * (1 / this.zoom - 8 / (this.zoomAnimation + 7 * this.zoom)); // Modify x offset wrt mouse position and zoom/zoomAnimation levels
            this.offset.y -= this.mouse.screen.y * (1 / this.zoom - 8 / (this.zoomAnimation + 7 * this.zoom)); // Modify y offset wrt mouse position and zoom/zoomAnimation levels
            this.zoom = this.zoom - (this.zoom - this.zoomAnimation) / 8; // Modify zoom level
        } else {
            this.offset.x = (this.offset.x + this.mouse.screen.x * (1 / this.zoom - 1 / (this.zoomAnimation))); // See above
            this.offset.y = (this.offset.y + this.mouse.screen.y * (1 / this.zoom - 1 / (this.zoomAnimation))); // See above
            this.zoom = this.zoomAnimation;
        }
    }

    debugDraw(canvas, ctx) {
        // Draw Box at Mouse grid location
        let mousePos = this.gridToPixel(this.mouse.grid.x, this.mouse.grid.y);
        ctx.strokeStyle = "rgba(50,50,50,100)";
        ctx.strokeRect(
            mousePos.x,
            mousePos.y,
            (1 * this.zoom),
            (1 * this.zoom)
        );

        if (this.selectedNode) {
            let nodePos = this.gridToPixel(this.selectedNode.location.x, this.selectedNode.location.y)
            ctx.fillStyle = "rgba(100,100,200,0.6)";
            ctx.arc(
                nodePos.x,
                nodePos.y,
                this.zoom / 6,
                0,
                2 * Math.PI
            );
            ctx.fill();
        }
    }

    // Draw the Canvas and Elements on it
    draw() {
        const canvas = this.refs.background // Grab the actual canvas element by reference
        const ctx = canvas.getContext("2d") // Create drawing object (context)

        // Define line styles based on zoom level (For Later)
        if (this.zoom > 50) {
            ctx.lineJoin = "round";
        } else {
            ctx.lineJoin = "miter";
        }

        this.drawBackground(canvas, ctx);
        this.debugDraw(canvas, ctx);

        this.drawWires(ctx);
        this.drawItems(ctx);
        this.handleMotion();

        // Request redraw to canvas
        this.animFrameID = window.requestAnimationFrame(this.draw);
    }

    // Scroll method for recentering with keys/buttons (To be implemented later)
    // scroll(deltaX, deltaY) {
    //     if (this.settings.scrollAnimation) {
    //         this.scrollAnimation.v = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2)) / 16;
    //         this.scrollAnimation.r = Math.atan2(-deltaX, deltaY);
    //         this.scrollAnimation.animate = true;
    //     } else {
    //         this.offset.x += deltaX;
    //         this.offset.y += deltaY;
    //     }

    //     this.mouse.grid.x += deltaX;
    //     this.mouse.grid.y += deltaY;
    // }

    // Zoom method for zoomingn with keys/buttons (To be implemented later)
    // changeZoom(delta) {
    //     this.zoomAnimation = Math.min(
    //         Math.max(
    //             this.zoomAnimation + delta,
    //             2),
    //         300
    //     );
    // }

    findNode(loc) {
        for (let i = 0; i < this.items.length; ++i) {
            let comp = this.items[i];
            if (comp.inputs) {
                for (let i = 0; i < comp.inputs.length; ++i) {
                    let nodeLoc = {
                        x: comp.location.x,
                        y: comp.location.y - (i+1)
                    }
                    if (this.dist(nodeLoc.x, nodeLoc.y, loc.x, loc.y) < 0.2) {
                        console.log("close", comp.label, i)
                        // console.log(this.dist(nodeLoc.x, nodeLoc.y, loc.x, loc.y))
                        return {
                            type: "input",
                            label: comp.label,
                            which: i,
                            location: nodeLoc
                        }
                    }
                }
            }

            let nodeLoc = {
                x: comp.location.x + comp.dimension.width + 1,
                y: comp.location.y - 1
            }

            if (this.dist(nodeLoc.x, nodeLoc.y, loc.x, loc.y) < 0.2) {
                console.log("close", comp.label)
                // console.log(this.dist(nodeLoc.x, nodeLoc.y, loc.x, loc.y))
                return {
                    type: "output",
                    label: comp.label,
                    location: nodeLoc
                }
            }
        }

        return null;
    }

    setIO(inputNode, outputNode) {
        for (let i = 0; i < this.items.length; ++i) {
            let comp = this.items[i];
            if (comp.label == inputNode.label) {
                comp.inputs[inputNode.which] = outputNode.label;
            }
        }

        this.generatePath(inputNode.location, outputNode.location);
        this.generateCircuit();
    }

    generatePath(inLoc, outLoc)
    {
        let wire = [inLoc, outLoc];
        if (this.wires.indexOf(wire) == -1);
            this.wires.push(wire);

        console.log(this.wires)
    }

    generateCircuit()
    {
        let component = {
            "inputs": [],
            "gates": [],
            "outputs": []
        }

        for (let i = 0; i < this.items.length; ++i) {
            let comp = this.items[i];
            let obj = {};

            if (comp.type == "input") {
                obj.name = comp.label;
                obj.type = "static";
                parseInt(comp.val) == 0 ? obj.value = false : obj.value = true;
                component.inputs.push(obj);
            } else if (comp.type == "gate") {
                obj.name = comp.label;
                obj.type = comp.val;
                obj.inputs = [];
                for (let input of comp.inputs) {
                    if (input != null)
                        obj.inputs.push(input);
                }
                component.gates.push(obj);
            } else if (comp.type == "output") {
                obj.name = comp.label;
                obj.type = "static";
                obj.inputs = [];
                for (let input of comp.inputs) {
                    if (input != null)
                        obj.inputs.push(input);
                }
                component.outputs.push(obj);
            }
        }

        this.setState({
            circuit: {
                component
            }
        });

        console.log(this.state)
    }

    /*
    **  Event Listeners
    **  Functions attached to different events and interactions with the canvas
    */
    mouseZoom(e) {
        e.preventDefault();

        // Get mouse info from event data
        this.updateMouse(e);

        // Set the zoomAnimation info (used in draw())
        this.zoomAnimation = Math.min(
            Math.max(
                this.zoomAnimation - this.zoom / 8 * ((e.deltaX || e.deltaY) > 0 ? .5 : -1),
                2),
            300
        );

        // return false;
    }

    mouseDown(e) {
        const canvas = this.refs.background; // Grab canvas from DOM
        canvas.focus(); // Put canvas into focus (not necessary now, maybe later?)

        // Get mouse info from event data
        this.updateMouse(e);

        if (this.selectedGate != null) {
            this.items.push(this.selectedGate);
            this.selectedGate = null;

            this.undoStack.push("gate");
        } else if (this.selectedNode != null) {
            let destNode = this.findNode(this.mouse.gridLiteral);
            if (destNode !== null) {
                console.log(this.selectedNode)
                console.log(destNode)

                if (this.selectedNode.type == destNode.type) {
                    this.selectedNode = null;
                    destNode = null;
                } else if (this.selectedNode.label == destNode.label) {
                    this.selectedNode = null;
                    destNode = null;
                } else {
                    destNode.type == "input" ? this.setIO(destNode, this.selectedNode) : this.setIO(this.selectedNode, destNode)
                    console.log(this.items)
                    console.log(this.wires)

                    this.selectedNode = null;
                    destNode = null;

                    this.undoStack.push("wire");
                }
            }
        } else {
            this.selectedNode = this.findNode(this.mouse.gridLiteral);
        }

        // XXX For whatever reason, without clicking, the event.which default value is 1,
        //     instead of 0. Right now, dragging can only be done by holding ctrl. So, this
        //     listener doesn't do anything at the moment - it does not trigger mouseMove,
        //     which triggers by default when pressing ctrl, so no data is actually passed
        //     from mouseDown.
        if (e.which === 1) { // Left-Click
            if (e.ctrlKey) { // See above. Without this, the canvas will drag on any mouse movement.
                // Grab x and y coordinates from canvas
                // let x = this.mouse.screen.x / this.zoom + this.offset.x;
                // let y = -this.mouse.screen.y / this.zoom + this.offset.y;

                // this.scrollAnimation.animate = false; // Deactivate scrolling flag
            } else {

            }
        }
    }

    mouseMove(e) {
        // Get mouse info from event data
        this.updateMouse(e);

        if (this.selectedGate != null) {
            this.selectedGate.location.x = this.mouse.grid.x;
            this.selectedGate.location.y = this.mouse.grid.y;
        }

        if (e.which === 1) { // Left-Click
            if (e.ctrlKey) {
                e.preventDefault(); // Protect from default event data (no jarring zooms or scrolls)

                this.offset.x -= e.movementX / this.zoom; // Change canvas x offset based on event and zoom
                this.offset.y += e.movementY / this.zoom; // Change canvas y offset based on event and zoom

                this.scrollAnimation.v = Math.sqrt(Math.pow(e.movementX, 2) + Math.pow(e.movementY, 2)) / this.zoom; // Set velocity as function of root of sum of squares, scaled by zoom
                this.scrollAnimation.r = Math.atan2(e.movementX, e.movementY); // Set rate

                return false;
            }
        }
    }

    mouseUp(e) {
        // Get mouse info from event data
        this.updateMouse(e);

        // XXX Like mouseDown, this function doesn't actually do anything after mouseMove due to the
        //     default event.which value being 1, not 0. Will adress this later.
        if (e.which === 1 && e.ctrlKey) {
            this.scrollAnimation.animate = false;
        }
    }

    openDrawer(e) {
        e.srcElement.classList.toggle("active");
        var content = e.srcElement.nextElementSibling;

        if (content.style.maxHeight) {
            content.style.maxHeight = null;
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
        }
    }

    dragStart(e) {
        console.log("dragging");
        console.log(e.clientX);
    }

    dragEnd(e) {
        this.updateMouse(e);

        console.log("drag ended");
        console.log(e.clientX, e.clientY);
        console.log(this.mouse.screen.x, this.mouse.screen.y);
        console.log(this.mouse.grid.x, this.mouse.grid.y);
    }

    onGateClick(e) {
        if (e.target.localName == "img")
            return; // Return if we click on the image (for now)

        //Set some color or something.
        this.selectedGate = e.target;
        console.log("The current type is: ", this.selectedGate);
        let type = this.selectedGate.className;
        let val = this.selectedGate.id;

        if (val == "input") {
            this.selectedGate = {
                label: "g" + String(this.count + 1),
                type: "input",
                val: 0,
                location: {
                    x: this.mouse.grid.x,
                    y: this.mouse.grid.y
                },
                dimension: {
                    width: 1,
                    height: 1
                }
            }
        } else if (val == "output") {
            this.selectedGate = {
                label: "g" + String(this.count + 1),
                type: "output",
                val: "--",
                location: {
                    x: this.mouse.grid.x,
                    y: this.mouse.grid.y
                },
                dimension: {
                    width: 1,
                    height: 1
                },
                inputs: [null]
            }
        } else {
            if (val == "not") {
                this.selectedGate = {
                    label: "g" + String(this.count + 1),
                    type: type,
                    val: val,
                    location: {
                        x: this.mouse.grid.x,
                        y: this.mouse.grid.y
                    },
                    dimension: {
                        width: 1,
                        height: 1
                    },
                    inputs: [null]
                }
            } else {
                this.selectedGate = {
                    label: "g" + String(this.count + 1),
                    type: type,
                    val: val,
                    location: {
                        x: this.mouse.grid.x,
                        y: this.mouse.grid.y
                    },
                    dimension: {
                        width: 2,
                        height: 2
                    },
                    inputs: [null, null]
                }
            }
        }

        ++this.count;
    }

    undo(e) {
        if (this.undoStack.length == 0)
            return
        let tmp = this.undoStack[this.undoStack.length-1];
        this.undoStack.pop()

        if (tmp == "gate")
            this.items.pop()
        else
            this.wires.pop()
    }

    clearCanvas(e) {
        this.wires = [];
        this.items = [];
        this.setState({
            circuit: {}
        });
    }

    /* 
    **  Mount this Component
    **  Initialize listeners and call draw()
    */
    componentDidMount() {
        const canvas = this.refs.background; // Grab the actual canvas element by reference

        // Attach event listeners
        canvas.addEventListener('wheel', (e) => this.mouseZoom(e));       // Mouse wheel zooming
        canvas.addEventListener('mousedown', (e) => this.mouseDown(e));   // Mouse click - interacting with components, dragging screen
        canvas.addEventListener('mousemove', (e) => this.mouseMove(e));   // Mouse movement - dragging components, dragging screen
        canvas.addEventListener('mouseup', (e) => this.mouseUp(e));       // Mouse up - dragging screen

        const collapsibles = document.getElementsByClassName("collapsible");
        for (let i = 0; i < collapsibles.length; ++i) {
            collapsibles[i].addEventListener('click', (e) => this.openDrawer(e));
        }

        const gates = document.getElementsByClassName("gate");
        for (let i = 0; i < gates.length; ++i) {    //dragGate functions for use with moving drawer components onto the canvas. 
            console.log("adding event listener");
            gates[i].addEventListener('click', (e) => this.onGateClick(e));
        }

        const undo = document.getElementById("undo");
        const reset = document.getElementById("reset");
        undo.addEventListener('mousedown', (e) => this.undo(e));
        reset.addEventListener('mousedown', (e) => this.clearCanvas(e));

        // Make call to draw() method
        this.draw();
    }

    componentWillUnmount() {
        // Cancel the animation loop for canvas
        window.cancelAnimationFrame(this.animFrameID);

        // Pass the circuit up to parent
        this.props.getCircuit(this.state.circuit);
    }


    render() {
        return (
            <div>
                {/*Menus sidebar*/}
                <div class="sidenav">
                    <div>
                        <button onClick={io.download} type="button" class="io">Export</button>

                        <button type="button" class="io">Upload</button>

                        <button type="button" class="collapsible">Inputs</button>
                        <div class="content">
                            <div class="tooltip">
                                <div class="gate" id="input">
                                    Input Node
                                    <span class="tooltiptext">
                                        Creates an input node for the logic circuit
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button type="button" class="collapsible">Gates</button>

                        <div class="content">

                            <div class="tooltip">
                                <div class="gate" id="and">
                                    AND Gate
                                <img src={AND} alt="And" height="25" width="40">
                                    </img>
                                    <span class="tooltiptext">
                                        Returns true if both inputs are true, false otherwise
                                    </span>
                                </div>
                            </div>

                            <p>  </p> {/*newline to seperate gates*/}

                            <div class="tooltip">
                                <div class="gate" id="or">
                                    OR Gate
                                 <img src={OR} alt="Or" height="25" width="40">
                                    </img>
                                    <span class="tooltiptext">
                                        Returns true if one input is true, false if neither are true
                                    </span>
                                </div>
                            </div>

                            <p>  </p> {/*newline to seperate gates*/}

                            <div class="tooltip">
                                <div class="gate" id="nor">
                                    NOR Gate
                                <img src={NOR} alt="Nor" height="25" width="40">
                                    </img>
                                    <span class="tooltiptext">
                                        Returns true if both inputs are false, false otherwise
                                    </span>
                                </div>
                            </div>

                            <p>  </p> {/*newline to seperate gates*/}

                            <div class="tooltip">
                                <div class="gate" id="xor">
                                    XOR Gate
                                <img src={XOR} alt="Xor" height="25" width="40">
                                    </img>
                                    <span class="tooltiptext">
                                        Returns true if an odd number ofinputs are true, false otherwise
                                    </span>
                                </div>
                            </div>

                            <p>  </p> {/*newline to seperate gates*/}

                            <div class="tooltip">
                                <div class="gate" id="nand">
                                    NAND Gate
                                <img src={NAND} alt="Nand" height="25" width="40">
                                    </img>
                                    <span class="tooltiptext">
                                        Returns false if both inputs are true, true otherwise
                                    </span>
                                </div>
                            </div>

                            <p>  </p> {/*newline to seperate gates*/}

                            <div class="tooltip">
                                <div class="gate" id="not">
                                    NOT Gate
                                <img src={NOT} alt="Not" height="25" width="40">
                                    </img>
                                    <span class="tooltiptext">
                                        Returns true if input is false and false if input is true
                                    </span>
                                </div>
                            </div>

                            <p>  </p> {/*newline to seperate gates*/}

                            <div class="tooltip">
                                <div class="gate" id="xnor">
                                    XNOR Gate
                                <img src={XNOR} alt="Xnor" height="25" width="40">
                                    </img>
                                    <span class="tooltiptext">
                                        Returns false if one input is true and false otherwise
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button type="button" class="collapsible">Outputs</button>
                        <div class="content">
                            <div class="tooltip">
                                <div class="gate" id="output">
                                    Output Node
                                    <span class="tooltiptext">
                                        Creates an output node for the logic circuit
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button type="button" class="collapsible">Miscellaneous</button>
                        <div class="content">
                            <p>Miscellaneous</p>
                        </div>
                    </div>

                    <div>
                        <Link to={{
                            pathname: './logic',
                            state: {
                                circuit: this.state.circuit
                            }
                        }}>
                            <button type="button" class="sidenav-link">See Logic...</button>
                        </Link>
                    </div>
                </div>

                <div class="undo">
                    <button type="button" id="undo">
                        <img src={UNDO} alt="Undo" height="25" width="30">
                        </img>
                    </button>
                </div>

                <div class="redo">
                    <button type="button">
                        <img src={REDO} alt="Redo" height="25" width="30">
                        </img>
                    </button>
                </div>

                <div class="reset">
                    <button type="button" id="reset">
                        <img src={RESET} alt="Reset" height="25" width="30">
                        </img>
                    </button>
                </div>



                {/*Components tab*/}
                <div class="comptab">
                    <button type="button" class="collapsible">Components</button>
                    <div class="content">
                        <p>Components</p>
                    </div>
                </div>

                {/*Minimap*/}
                <div>
                    <Minimap selector=".area">

                        <canvas
                            class="area"
                            ref="background"
                            width={window.innerWidth} // XXX Cleaner way to fit canvas to screen?
                            height={window.innerHeight}
                            style={{ border: '1px solid #000000' }}
                        ></canvas>
                    </Minimap>
                </div>
            </div>
        )
    }
}

export default Canvas;
