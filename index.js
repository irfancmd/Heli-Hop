// module aliases
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Body = Matter.Body,
    Events = Matter.Events,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint;

// create an engine
const engine = Engine.create();

// create a renderer
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false
    }
});

// run the renderer
Render.run(render);

// create runner
const runner = Runner.create();


let screenWideDim;

if(window.innerWidth > window.innerHeight) {
    screenWideDim = window.innerWidth;
} else {
    screenWideDim = window.innerHeight;
}

const rectCount = 21;
const rectWidth = screenWideDim * 0.05;
const rectHeight = window.innerHeight * 0.4;
const floatingRectWidth = screenWideDim * 0.03;
const floatingRectHeight = window.innerHeight * 0.15;
const rectX = 0;
const wallDeleteLimitX = -50;
const helicopterVelocityY = 450;
const lowerWallOffsetY = 0.07;
const upperWallOffsetY = 0.05;
const wallVelocityX = 350;
const helicopterDim = screenWideDim * 0.03;
const wallColor = "#772323";

// These are categories arbitrary categories for collision filtering. This is needed for making
// the helicopter not draggable by mouse
const defaultCategory = 0x0001; // This is a dummy category for making objects undraggrable through mouse. So, this category won't be assigned to any object and will be used as a collision filter for mouse contraint
const wallCategory = 0x0002;
const helicopterCategory = 0x0003;
const particleCategory = 0x0004;

// Setting up mouse
const mouse = Mouse.create(render.canvas);

const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    // Mouse will only interact with defaultCategory and ignore helicopterCategory
    collisionFilter: { mask: defaultCategory },
    constraint: {
        render: {
            visible: false
        }
    }
});

// Keep the mouse in sync with rendering
render.mouse = mouse;


let lowerWalls = [];
let upperWalls = [];
let floatingWalls = [];
let helicopter;
// This array will contain helicopter particle objects
let heli_particles = [];

function setUpWorld() {
    // Clear the old bodies from the world
    Composite.clear(engine.world, false);

    lowerWalls = [];
    upperWalls = [];
    floatingWalls = [];
    heli_particles = [];

    for(let i = 0; i < rectCount; i++) {
        // Remember the transformation origin for objects is at their center, not in top-left
        lowerWalls.push(Bodies.rectangle(rectX + (rectWidth * i),
                                        // The random Y position will be 
                                        // viewport's width + random number of pixels from 0 to 15% of viewport height
                                        window.innerHeight - Math.floor(Math.random() * (window.innerHeight * lowerWallOffsetY)), 
                                        rectWidth, 
                                        rectHeight, 
                                        { label: "wall", isStatic: true, collisionFilter: { category: wallCategory }, render: { fillStyle: wallColor, strokeStyle: wallColor, lineWidth: 1 } }));
    }

    for(let i = 0; i < rectCount; i++) {
        upperWalls.push(Bodies.rectangle(rectX + (rectWidth * i),
                                        0 + Math.floor(Math.random() * (window.innerHeight * upperWallOffsetY)), 
                                        rectWidth, 
                                        rectHeight, 
                                        { label: "wall", isStatic: true, collisionFilter: { category: wallCategory }, render: { fillStyle: wallColor, strokeStyle: wallColor, lineWidth: 1 } }));
    }

    helicopter = Bodies.rectangle(window.innerWidth/2, 
                                  window.innerHeight/2, 
                                  helicopterDim, helicopterDim, 
                                  { label: "helicopter", collisionFilter: { category: helicopterCategory, mask: wallCategory } });

    // Add all of the bodies to the world
    Composite.add(engine.world, [...lowerWalls]);
    Composite.add(engine.world, [...upperWalls]);
    Composite.add(engine.world, helicopter);

    // Attach the mouse constraint to the world
    Composite.add(engine.world, mouseConstraint);
}

// Defining mouse events
Events.on(mouseConstraint, "mousedown", function(event) {
    const timeScale = (event.delta || (1000 / 60)) / 1000;

    Body.setVelocity(helicopter, {x: 0, y: -(helicopterVelocityY * timeScale)});
    heli_particles.forEach(particle => {
        Body.setVelocity(particle, {x: 0, y: -(helicopterVelocityY * timeScale)});
    });
});

// This event is invoked before rendering a frame
Events.on(engine, 'beforeUpdate', function(event) {
    const timeScale = (event.delta || (1000 / 60)) / 1000;
    const xWallMovement = wallVelocityX * timeScale;

    let lowerWallsToBeDeleted = [];

    lowerWalls.forEach((wall, index) => {
        if(wall.position.x < wallDeleteLimitX) {
            Composite.remove(engine.world, wall);
            lowerWallsToBeDeleted.push(index);
        } else {
            Body.setPosition(wall, {x: wall.position.x - xWallMovement, y: wall.position.y});
        }
    });

    lowerWallsToBeDeleted.forEach(wallIdx => {
        lowerWalls.splice(wallIdx, 1);
    });

    let upperWallsToBeDeleted = [];

    upperWalls.forEach((wall, index) => {
        if(wall.position.x < wallDeleteLimitX) {
            Composite.remove(engine.world, wall);
            upperWallsToBeDeleted.push(index);
        } else {
            Body.setPosition(wall, {x: wall.position.x - xWallMovement, y: wall.position.y});
        }
    });

    upperWallsToBeDeleted.forEach(wallIdx => {
        upperWalls.splice(wallIdx, 1);
    });

    let floatingWallsToBeDeleted = [];

    floatingWalls.forEach((wall, index) => {
        if(wall.position.x < wallDeleteLimitX) {
            Composite.remove(engine.world, wall);
            floatingWallsToBeDeleted.push(index);
        } else {
            Body.setPosition(wall, {x: wall.position.x - xWallMovement, y: wall.position.y});
        }
    });

    floatingWallsToBeDeleted.forEach(wallIdx => {
        floatingWalls.splice(wallIdx, 1);
    });

    // Add new walls at the end
    while(lowerWalls.length < rectCount) {
        lowerWalls.push(Bodies.rectangle(lowerWalls[lowerWalls.length - 1].position.x + rectWidth,
                                        window.innerHeight - Math.floor(Math.random() * (window.innerHeight * lowerWallOffsetY)), 
                                        rectWidth, 
                                        rectHeight, 
                                        { label: "wall", isStatic: true, collisionFilter: { category: wallCategory }, render: { fillStyle: wallColor, strokeStyle: wallColor, lineWidth: 1 } }));

        Composite.add(engine.world, lowerWalls[lowerWalls.length - 1]);
    }

    while(upperWalls.length < rectCount) {
        upperWalls.push(Bodies.rectangle(upperWalls[upperWalls.length - 1].position.x + rectWidth,
                                        0 + Math.floor(Math.random() * (window.innerHeight * upperWallOffsetY)), 
                                        rectWidth, 
                                        rectHeight, 
                                        { label: "wall", isStatic: true, collisionFilter: { category: wallCategory }, render: { fillStyle: wallColor, strokeStyle: wallColor, lineWidth: 1 } }));

        Composite.add(engine.world, upperWalls[upperWalls.length - 1]);
    }

    if(Math.floor(Math.random() * 70) === 5) {
        // This x position gives good spacing between walls. Determined through trial and error
        floatingWalls.push(Bodies.rectangle(window.innerWidth + (window.innerWidth * 0.1) + (floatingWalls.length * floatingRectWidth), (window.innerHeight / 2) + (Math.random() * (window.innerHeight * 0.02)), floatingRectWidth, floatingRectHeight, { label: "wall", isStatic: true, collisionFilter: { category: wallCategory }, render: { fillStyle: wallColor } }));
        Composite.add(engine.world, floatingWalls[floatingWalls.length - 1]);
    }

    // Render helicopter particles

    // Remove old particle
    if(heli_particles.length > 10) {
        Composite.remove(engine.world, heli_particles[0]);
        heli_particles.splice(0, 1);
    }

    // Add new particle
    heli_particles.push(Bodies.circle(helicopter.position.x - (helicopterDim * 0.5) - 10, helicopter.position.y, helicopterDim * 0.1, { label: "particle", collisionFilter: { category: particleCategory,  mask: particleCategory } }));

    Composite.add(engine.world, heli_particles[heli_particles.length - 1]);
    
    // Update the time panel
    const totalSeconds = Math.round(event.timestamp / 1000);
    const hours = Math.round(totalSeconds / 3600);
    const rem = (totalSeconds % 3600);
    const minutes = Math.round(rem / 60);
    const seconds = rem % 60;

    document.querySelector("#time-panel").innerHTML = `${hours}h:${minutes}m:${seconds}s`;
});

// This event is invoked when any collision has just occured
Events.on(engine, "collisionStart", function(event) {
    if(event.pairs.length > 0) {
        for(let pair of event.pairs) {
            // Note: don't break if this condition doesn't match. Then, next pair objects won't be checked.
            // Collision filters are set up in a way that walls will only interact with helicopter category. So, if any collision involves a wall,
            // the other object has to be a helicopter
            if(pair.bodyA.label === "wall" || pair.bodyB.label === "wall") {
                Runner.stop(runner);

                // Show the game over menu
                document.querySelector("#game-over-menu").style.zIndex = 1;
            }
        }
    }
});


document.addEventListener("DOMContentLoaded", function() {
    // Setting the world up before starting the game gives a nice blurry view
    // of the world in the start menu

    setUpWorld();

    document.querySelector("#button-start").addEventListener("click", function() {
        // Hide the start menu
        document.querySelector("#start-menu").style.display = "none";

        // run the engine
        Runner.run(runner, engine);
    });

    document.querySelector("#button-restart").addEventListener("click", function() {
        // Hide the game over menu
        document.querySelector("#game-over-menu").style.zIndex = -1;

        // Reset the world
        setUpWorld();

        // run the engine
        Runner.run(runner, engine);
    });
});
