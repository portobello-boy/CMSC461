var parser = require('./parse');
var assign = require('./assignment');

// Input: component subcircuit, name of element in component
// Return: JSON object
// Given a string name, return the actual JSON body that name refers to
function getSubComp(component, name)
{
    let obj;
    if (component.inputs.some((input, index) => {
        if (input.name == name) {
            obj = component.inputs[index];
            return true;
        }
    }))
        return obj;
    else if (component.gates.some((gate, index) => {
        if (gate.name == name) {
            obj = component.gates[index];
            return true;
        }
    }))
        return obj;

    return obj;
}

// Input: circuit, component subcircuit, stage of analysis in component
// Output: string
// Recursively generate boolean expression for component subcircuit for particular output
function getSubExpr(circuit, component, stage)
{
    if (!stage.hasOwnProperty('inputs')) // If the current stage has no inputs, it must be an input itself
        return stage.name;

    let arr = [];
    if (stage.type == "component") { // If the current stage refers to a different component
        compExpr = generateComponentExprs(circuit, circuit[stage.name])[0]; // Generage expression for referenced component
        compVars = assign.getVars(compExpr); // Grab the variables

        for (let i = 0; i < stage.inputs.length; ++i) {
            // Replace the inputs for referenced component with completed subexpressions for input in the primary component
            compExpr = compExpr.replace(new RegExp(compVars[i], "g"), getSubExpr(circuit, component, getSubComp(component, stage.inputs[i])));
        }
        arr.push(compExpr);
    } else { // No referenced component
        for (let i = 1; i < stage.inputs.length; ++i) {
            arr.push('('); // Prepend a bunch of parentheses
        }
        arr.push(getSubExpr(circuit, component, getSubComp(component, stage.inputs[0])));

        for (let i = 1; i < stage.inputs.length; ++i) {
            arr.push(stage.type, getSubExpr(circuit, component, getSubComp(component, stage.inputs[i])), ')'); // Push subexressions
        }
    }

    return arr.join(" ");
}

// Input: circuit, component subcircuit
// Output: array of strings
// Generate boolean expressions for all output of a component subcircuit
function generateComponentExprs(circuit, component)
{
    let expression = [];
    for (let i = 0; i < component.outputs.length; ++i) {
        let out = component.outputs[i];
        let subexpr = getSubExpr(circuit, component, getSubComp(component, out.inputs[0]));
        expression.push(subexpr);
    }
    return expression;
}

// Input: circuit
// Output: array
// Generate all boolean expressions for subcircuits of a circuit
function generateCircuitExprs(circuit)
{
    let expressions = [];
    for (let component in circuit) {
        let comp = circuit[component];
        expressions.push(generateComponentExprs(circuit, comp));
    }
    return expressions;
}

// Input: component subcircuit
// Output: object
// Create an assignment object mapping inputs with their truch-value assignments
function getCompAssignment(circuit, component)
{
    let assignment = {};

    for (gate of component.gates) {
        if (gate.type == "component") {
            assignment = {...(getCompAssignment(circuit, circuit[gate.name]))}
        }
    }
    
    for (input of component.inputs) {
        if (input.type == "placeholder") {
            continue;
        }
        assignment[input.name] = input.value;
    }

    return assignment;
}

// Input: curcuit, component subcircuit
// Output: object
// Evaluate a component subcircuit's boolean expression with associated values
function evaluateComponent(circuit, component)
{
    let evals = {};
    let assignment = getCompAssignment(circuit, component);
    console.log(assignment);
    let expressions = generateComponentExprs(circuit, component);
    for (val in assignment) {
        evals[val] = [assignment[val]];
    }
    for (expression of expressions) {
        evals[expression] = assign.evalTree(parser.parse(expression), assignment);
    }
    return evals;
}

function evaluateCircuit(circuit)
{
    let evals = [];
    for (component in circuit) {
        let eval = evaluateComponent(circuit, circuit[component]);
        evals.push(eval);
    }
    return evals;
}

module.exports = {
    getSubComp,
    getSubExpr,
    generateCircuitExprs
}

var json = require('./test/testCircuit6.json');
console.log(generateCircuitExprs(json));
// console.log(evaluateComponent(json, json.component1));

// var input = getComponent(json.component1, 'and1');
// console.log(getSubExpr(json.component1, input));
// exprs = evaluateCircuit(json);
// console.log(exprs);
// console.log(assign.evalExpression(exprs[0]));

// console.log(getCompAssignment(json, json.component1));
// console.log(evaluateComponent(json, json.component1));
console.log(evaluateCircuit(json));
