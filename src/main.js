import 'babel-polyfill';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, doc, setDoc } from 'firebase/firestore/lite';
import starImage from '../static/img/star.png';
import starDisabledImage from '../static/img/star-disabled.png';
import QRCode from 'qrcode';

var firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    databaseUrl: process.env.DATABASE_URL,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID,
};

const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore through Firebase
var db = getFirestore(app);

// Constants
var userIdLength = 40; // We assume 40 bytes are long enough for collision avoidance until 16^20 ~ 1.2e24 users.
var optionCount = 4;
var probCount = 20;

var currentProblem = 0;
var results;
var correctAns;
var probClasses = [];

/// Mix fields of source into target.
/// This can be used like a dirty multiple inheritance.
function mixin(target, source){
	for(var k in source){
		target[k] = source[k];
	}
}

/// Custom inheritance function that prevents the super class's constructor
/// from being called on inehritance.
/// Also assigns constructor property of the subclass properly.
/// @param subclass The constructor of subclass that should be inherit base
/// @param base The constructor of the base class which subclass's prototype should point to.
/// @param methods Optional argument for a table containing methods to define for subclass.
///                The table is mixed-in to subclass, so it won't be a base class of subclass.
function inherit(subclass,base,methods){
	// If the browser or ECMAScript supports Object.create, use it
	// (but don't remember to redirect constructor pointer to subclass)
	if(Object.create){
		subclass.prototype = Object.create(base.prototype);
	}
	else{
		var sub = function(){};
		sub.prototype = base.prototype;
		subclass.prototype = new sub;
	}
	if(methods)
		mixin(subclass.prototype, methods);
	subclass.prototype.constructor = subclass;
}

/// ------------- Complex class --------------------------
function Complex(){
	this.a = [Math.floor(Math.random() * 10) - 5, Math.floor(Math.random() * 10) - 5];
	this.b = [Math.floor(Math.random() * 10) - 5, Math.floor(Math.random() * 10) - 5];
}

/// ------------- ComplexAdd class --------------------------
function ComplexAdd(){
	Complex.call(this);
}
inherit(ComplexAdd, Complex);

ComplexAdd.prototype.solution = function(){
	return formatComplex(complexAdd(this.a, this.b));
}

ComplexAdd.prototype.formatProblem = function(){
	return parenComplex(this.a) + "+" + parenComplex(this.b);
}

/// ------------- ComplexMultiply class --------------------------
function ComplexMultiply(){
	Complex.call(this);
}
inherit(ComplexMultiply, Complex);

ComplexMultiply.prototype.solution = function(){
	return formatComplex(complexMultiply(this.a, this.b));
}

ComplexMultiply.prototype.formatProblem = function(){
	return parenComplex(this.a) + parenComplex(this.b);
}

/// ------------- ComplexDivision class --------------------------
function ComplexDivision(){
	Complex.call(this);
	// Prevent zero division
	while(this.b[0] === 0 && this.b[1] === 0)
		this.b = [Math.floor(Math.random() * 10) - 5, Math.floor(Math.random() * 10) - 5];
}
inherit(ComplexDivision, Complex);

ComplexDivision.prototype.solution = function(){
	var div = complexDivision(this.a, this.b);
	if(div[0][0] === 0 && div[0][1] === 0)
		return "0";
	else if(div[1] === 1)
		return formatComplex(div[0]);
	else
		return "\\frac{" + formatComplex(div[0]) + "}{" + div[1] + "}";
}

ComplexDivision.prototype.formatProblem = function(){
	return "\\frac{" + formatComplex(this.a) + "}{" + formatComplex(this.b) + "}";
}


/// Enclose by parentheses if necessary
function parenComplex(a){
	if(a[0] !== 0 && a[1] !== 0 || a[0] < 0 || a[1] < 0)
		return "(" + formatComplex(a) + ")";
	else
		return formatComplex(a);
}

function formatComplex(a){
	if(a[0] === 0 && a[1] === 0)
		return "0";
	else if(a[0] !== 0 && a[1] === 0)
		return a[0];
	else if(a[0] === 0 && a[1] !== 0)
		return (a[1] === 1 ? "" : a[1] === -1 ? "-" : a[1]) + "i";
	else
		return a[0] + (a[1] < 0 ? "-" : "+") + (Math.abs(a[1]) === 1 ? "" : Math.abs(a[1])) + "i";
}

function complexAdd(a, b){
	return [a[0] + b[0], a[1] + b[1]];
}

function complexMultiply(a, b){
	return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

function complexDivision(a, b){
	var divisor = b[0] * b[0] + b[1] * b[1];
	var r = b[0];
	var i = -b[1];
	var r1 = a[0] * r - a[1] * i;
	var i1 = a[0] * i + a[1] * r;
	var div = gcd3(r1, i1, divisor);
	return [[r1 / div, i1 / div], divisor / div];
}

/// Find the greatest common divisor of 3 values with brute force
function gcd3(a, b, c){
	var m = Math.max(a, Math.max(b, c));
	for(var i = m; 0 < i; i--){
		if((a === 0 || a % i === 0) && (b === 0 || b % i === 0) && c % i === 0)
			return i;
	}
	return 1;
}


/// ------------- Matrix and Vector Products --------------------------
function MatrixVectorProduct(){
	this.a = [Math.floor(Math.random() * 10) - 5, Math.floor(Math.random() * 10) - 5,
	Math.floor(Math.random() * 10) - 5, Math.floor(Math.random() * 10) - 5];
	this.b = [Math.floor(Math.random() * 10) - 5, Math.floor(Math.random() * 10) - 5];
}

MatrixVectorProduct.prototype.solution = function(){
	var result = [this.a[0] * this.b[0] + this.a[1] * this.b[1],
		this.a[2] * this.b[0] + this.a[3] * this.b[1]];
	return "\\begin{pmatrix} " + result[0] + " \\\\ " + result[1] + "\\end{pmatrix}";
}

MatrixVectorProduct.prototype.formatProblem = function(){
	return "\\begin{pmatrix}" + this.a[0] + " & " + this.a[1]
		+ " \\\\ " + this.a[2] + " & " + this.a[3] + "\\end{pmatrix}"
		+ " \\begin{pmatrix}" + this.b[0] + " \\\\ " + this.b[1] + "\\end{pmatrix}";
}

/// ------------- Matrix and Matrix Products --------------------------
function MatrixMatrixProduct(){
	this.a = [Math.floor(Math.random() * 10) - 5, Math.floor(Math.random() * 10) - 5,
	Math.floor(Math.random() * 10) - 5, Math.floor(Math.random() * 10) - 5];
	this.b = [Math.floor(Math.random() * 10) - 5, Math.floor(Math.random() * 10) - 5,
	Math.floor(Math.random() * 10) - 5, Math.floor(Math.random() * 10) - 5];
}

MatrixMatrixProduct.prototype.solution = function(){
	var result = [this.a[0] * this.b[0] + this.a[1] * this.b[2],
		this.a[0] * this.b[1] + this.a[1] * this.b[3],
		this.a[2] * this.b[0] + this.a[3] * this.b[2],
		this.a[2] * this.b[1] + this.a[3] * this.b[3]];
	return "\\begin{pmatrix} " + result[0] + " & " + result[1] + " \\\\ "
		 + result[2] + " & " + result[3] + "\\end{pmatrix}";
}

MatrixMatrixProduct.prototype.formatProblem = function(){
	return "\\begin{pmatrix}" + this.a[0] + " & " + this.a[1]
		+ " \\\\ " + this.a[2] + " & " + this.a[3] + "\\end{pmatrix}"
		+ " \\begin{pmatrix}" + this.b[0] + " & " + this.b[1]
		+ " \\\\ " + this.b[2] + " & " + this.b[3] + "\\end{pmatrix}";
}


/// ------------- Matrix Determinants --------------------------
function MatrixDeterminant(){
	this.a = [Math.floor(Math.random() * 10) - 5, Math.floor(Math.random() * 10) - 5,
	Math.floor(Math.random() * 10) - 5, Math.floor(Math.random() * 10) - 5];
}

function calcDeterminant(a){
	return a[0] * a[3] - a[1] * a[2];
}

MatrixDeterminant.prototype.solution = function(){
	var result = calcDeterminant(this.a);
	return result;
}

MatrixDeterminant.prototype.formatProblem = function(){
	return "\\det\\begin{pmatrix}" + this.a[0] + " & " + this.a[1]
		+ " \\\\ " + this.a[2] + " & " + this.a[3] + "\\end{pmatrix}";
}


/// ------------- Matrix Determinants --------------------------
function MatrixInversion(){
	// Prevent zero division
	do{
		this.a = [Math.floor(Math.random() * 10) - 5, Math.floor(Math.random() * 10) - 5,
		Math.floor(Math.random() * 10) - 5, Math.floor(Math.random() * 10) - 5];
		var det = calcDeterminant(this.a);
	} while(det === 0);
}

MatrixInversion.prototype.solution = function(){
	var det = calcDeterminant(this.a);
	var result = [this.a[3], -this.a[1], -this.a[2], this.a[0]];
	var detstr = "";
	if(det !== 1){
		detstr = det < 0 ? "-\\frac{1}{" + (-det) + "}" : "\\frac{1}{" + det + "}";
	}
	return detstr + "\\begin{pmatrix} " + result[0] + " & " + result[1] + " \\\\ "
		 + result[2] + " & " + result[3] + "\\end{pmatrix}";
}

MatrixInversion.prototype.formatProblem = function(){
	return "\\begin{pmatrix}" + this.a[0] + " & " + this.a[1]
		+ " \\\\ " + this.a[2] + " & " + this.a[3] + "\\end{pmatrix}^{-1}";
}


/// ------------- Derivative class --------------------------
function Derivative(){
	this.d = 1;
}

Derivative.prototype.solution = function(){
	var ret = this.vec;
	for(var i = 0; i < this.d; i++)
		ret = symbolicDerivative(ret, this.d);
	return formatFormula(ret);
}

Derivative.prototype.formatProblem = function(){
	var order = this.d === 1 ? "" : "^{" + this.d + "}";
	return "\\frac{d" + order + "}{dx" + order + "} "
		+ "\\left\\{" + formatFormula(this.vec) + " \\right\\}";
}

/// ------------- Integral class --------------------------
function Integral(){

}

Integral.prototype.solution = function(){
	return formatFormula(symbolicIntegral(this.vec));
}

Integral.prototype.formatProblem = function(){
	return "\\int"
		+ "\\left\\{" + formatFormula(this.vec) + " \\right\\}"
		+ "dx";
}


function formatFormula(vec){
	var sign = vec[0], f = vec[1], pow = vec[2], fun = vec[3], f2 = vec[4], pow2 = vec[5], constant = vec[6];
	if(f === 0)
		return constant ? "C" : "0";
	// Normalize notation
	if(f < 0){
		sign *= -1;
		f *= -1;
	}

	var primary = pow === 0 ? "" : Math.abs(pow) === 1 ? "x" : "x^{" + Math.abs(pow) + "}";
	var factor = ((0 < pow || fun !== "") && f === 1 ? primary === "" && fun === "" ? "1" : "" : f);
	var factor2 = (0 < pow2 && f2 === 1 ? "" : f2);
	var signStr = sign < 0 ? "-" : "";
	var ret = f === 0 ? "0" : pow < 0 ? signStr + "\\frac{" + factor + "}{" + primary + "}" : signStr + factor + primary;
	if(fun !== ""){
		var primary2 = pow2 === 0 ? "" : Math.abs(pow2) === 1 ? "x" : "x^{" + Math.abs(pow2) + "}";
		ret += fun + "\\left(" + (pow2 < 0 ? "\\frac{" + factor2 + "}{" + primary2 + "}" : factor2 + primary2) + "\\right)";
	}
	if(constant)
		ret += "+C";
	return ret;
}

function generatePoly(integral){
	var sign = (Math.floor(Math.random() * 2)) * 2 - 1;
	var f = Math.floor(Math.random() * 10);
	var fun = "";
	var pow = Math.floor(Math.random() * 10) - 5;
	if(integral && pow !== 0)
		f *= pow+1;
	var f2 = 0;
	var pow2 = 0;
	return [sign, f, pow, fun, f2, pow2, false];
}

function DPoly(){
	Derivative.call(this);
	this.vec = generatePoly(false);
}
inherit(DPoly, Derivative);

function HDPoly(){
	DPoly.call(this);
	this.d = (Math.floor(Math.random() * 2)) + 2;
}
inherit(HDPoly, DPoly);

function IPoly(){
	Integral.call(this);
	this.vec = generatePoly(true);
}
inherit(IPoly, Integral);

function generateDElem(funcList){
	var sign = (Math.floor(Math.random() * 2)) * 2 - 1;
	var f = Math.floor(Math.random() * 6) + 1;
	var fun = funcList[Math.floor(Math.random() * funcList.length)];
	var pow = 0;
	var f2 = fun === "\\log" ? 1 : Math.floor(Math.random() * 6) + 1;
	var pow2 = Math.floor(Math.random() * 6) - 3;
	if(0 <= pow2) // Prevent constant argument
		pow2++;
	return [sign, f, pow, fun, f2, pow2, false];
}

function DTri(){
	Derivative.call(this);
	this.vec = generateDElem(["\\sin", "\\cos", "\\tan"]);
}
inherit(DTri, Derivative);

function DExp(){
	Derivative.call(this);
	this.vec = generateDElem(["\\exp"]);
}
inherit(DExp, Derivative);

function DLog(){
	Derivative.call(this);
	this.vec = generateDElem(["\\log"]);
}
inherit(DLog, Derivative);

function generateIElem(funcList){
	var sign = (Math.floor(Math.random() * 2)) * 2 - 1;
	var f = Math.floor(Math.random() * 6) + 1;
	var fun = funcList[Math.floor(Math.random() * funcList.length)];
	var pow = 0;
	var f2 = Math.floor(Math.random() * 6) + 1;
	f *= f2;
	var pow2 = 1;
	// A special case that can be directly integrated
	if(fun === "\\exp" && Math.random() < 0.25){
		pow = ((Math.floor(Math.random() * 2)) * 2 - 1) * (Math.floor(Math.random() * 3) + 1);
		pow2 = pow + 1;
		f *= pow2;
	}
	return [sign, f, pow, fun, f2, pow2, false];
}

function ITri(){
	Integral.call(this);
	this.vec = generateIElem(["\\sin", "\\cos"]);
}
inherit(ITri, Integral);

function IExp(){
	Integral.call(this);
	this.vec = generateIElem(["\\exp"]);
}
inherit(IExp, Integral);

function symbolicDerivative(vec){
	var sign = vec[0], f = vec[1], pow = vec[2], fun = vec[3], f2 = vec[4], pow2 = vec[5];
	var polynomial = fun === "";
	switch(fun){
		case "\\sin":
			fun = "\\cos";
			pow += pow2-1;
			f *= f2 * pow2;
			break;
		case "\\cos":
			fun = "\\sin";
			pow += pow2-1;
			f *= f2 * pow2;
			sign *= -1;
			break;
		case "\\tan":
			fun = "\\cos^{-2}";
			pow += pow2-1;
			f *= f2 * pow2;
			break;
		case "\\exp":
			pow += pow2-1;
			f *= f2 * pow2;
			break;
		case "\\log":
			fun = "";
			pow = -1;
			f *= pow2;
			break;
	}
	if(polynomial)
		return [sign, f * pow, pow-1, fun, f2, pow2];
	else
		return [sign, f, pow, fun, f2, pow2];
}

function symbolicIntegral(vec){
	var sign = vec[0], f = vec[1], pow = vec[2], fun = vec[3], f2 = vec[4], pow2 = vec[5];
	var polynomial = fun === "";
	switch(fun){
		case "\\sin":
			fun = "\\cos";
			f /= f2;
			sign *= -1;
			break;
		case "\\cos":
			fun = "\\sin";
			f /= f2;
			break;
		case "\\exp":
			pow = 0;
			f /= f2 * pow2;
			break;
	}
	if(polynomial){
		if(pow === -1)
			return [sign, f, 0, "\\log", 1, 1, true];
		else
			return [sign, f / (pow+1), pow+1, fun, f2, pow2, true];
	}
	else
		return [sign, f, pow, fun, f2, pow2, true];
}

/// ------------- Partial Derivative class --------------------------
function PartialDerivative(){
	// Randomly select derivative variables
	this.d = {x:0, y:0, z:0};
	this.d["xyz"[Math.floor(Math.random() * 3)]] = 1;
	this.vec = {
		f: 1,
		x: 0,
		y: 0,
		z: 0,
		C: 0,
	};
}

PartialDerivative.prototype.solution = function(){
	return formatPFormula(symbolicPDerivative(this.vec, this.d));
}

PartialDerivative.prototype.formatProblem = function(){
	// Format differenciating variables
	var dstr = "{";
	var order = 0;
	for(var i in "xyz"){
		var v = "xyz"[i];
		if(!this.d[v])
			;
		else if(this.d[v] === 1)
			dstr += "\\partial " + v;
		else
			dstr += "\\partial " + v + "^{" + this.d[v] + "}";
		order += this.d[v];
	}
	dstr += "}";
	return "\\frac{\\partial" + (order === 1 ? "" : "^{" + order + "}") + "}" + dstr + "\\left\\{" + formatPFormula(this.vec) + " \\right\\}";
}

function generatePPoly(integral){
	var sign = (Math.floor(Math.random() * 2)) * 2 - 1;
	var ret = {
		f: sign * Math.floor(Math.random() * 10),
		C: 0,
	};
	for(var i in "xyz"){
		var v = "xyz"[i];
		ret[v] = Math.floor(Math.random() * 10) - 5;
		if(integral && ret[v] !== 0)
			ret.f *= ret[v]+1;
	}
	return ret;
}

function PDPoly(){
	PartialDerivative.call(this);
	this.vec = generatePPoly(false);
}
inherit(PDPoly, PartialDerivative);

function PHDPoly(){
	PDPoly.call(this);
	this.d["xyz"[Math.floor(Math.random() * 3)]]++;
}
inherit(PHDPoly, PDPoly);

function formatPFormula(vec){
	if(vec.f === 0)
		return vec.C ? "C" : "0";

	var primary = "";
	for(var i in "xyz"){
		var v = "xyz"[i];
		if(!vec[v])
			continue;
		primary += vec[v] === 0 ? "" : vec[v] === 1 ? v : v + "^{" + vec[v] + "}";
	}
	var factor = primary === "" ? vec.f : vec.f === 1 ? "" : vec.f;
	var ret = factor + primary;
	if(vec.C)
		ret += "+C";
	return ret;
}

function symbolicPDerivative(vec, d){
	var ret = {f: vec.f, x: vec.x, y: vec.y, z: vec.z, C: vec.C};
	for(var i in "xyz"){
		var v = "xyz"[i];
		if(d[v]){
			for(var j = d[v]; 0 < j; j--){
				if(ret[v] === 0){
					ret.f = ret.x = ret.y = ret.z = 0;
					return ret;
				}
				ret.f *= ret[v]--;
			}
		}
	}
	return ret;
}

/// ------------- Taylor series expansion class --------------------------
function TaylorSeries(){
	// Randomly select derivative variables
	// It's embarassing that there are too few options for problems
	var candidates = [
		"\\frac{1}{1-x}",
		"\\sin",
		"\\cos",
		"\\exp",
		"\\sinh",
		"\\cosh",
		"\\log(1-x)",
	]
	this.src = candidates[Math.floor(Math.random() * candidates.length)];
}

TaylorSeries.prototype.solution = function(){
	switch(this.src){
		case "\\frac{1}{1-x}":
			return "1+x+x^2+x^3+\\cdots";
		case "\\sin":
			return "x-\\frac 16 x^3 + \\frac 1{120}x^5+\\cdots";
		case "\\cos":
			return "1-\\frac 12 x^2 + \\frac 1{24} x^4 - \\frac 1{720}x^6+\\cdots";
		case "\\exp":
			return "1 + x + \\frac 12 x^2 + \\frac 16 x^3 + \\cdots";
		case "\\sinh":
			return "x+\\frac 16 x^3 + \\frac 1{120}x^5+\\cdots";
		case "\\cosh":
			return "1+\\frac 12 x^2 + \\frac 1{24} x^4 + \\frac 1{720}x^6+\\cdots";
		case "\\log(1-x)":
			return "- x - \\frac 12 x^2 - \\frac 13 x^3 - \\cdots";
		default: return "0";
	}
}

TaylorSeries.prototype.formatProblem = function(){
	if(this.src === "\\frac{1}{1-x}" || this.src === "\\log(1-x)")
		return this.src;
	else
		return this.src + "(x)";
}


/// ------------- Euler's formula class --------------------------
function EulerFormula(){
	// Randomly select derivative variables
	// It's embarassing that there are too few options for problems
	var candidates = [
		"e^{i\\theta}",
		"\\sin(\\theta)",
		"\\cos(\\theta)",
		"\\sinh(\\theta)",
		"\\cosh(\\theta)",

		// Inverse problems
		"\\cos(\\theta) + i\\sin(\\theta)",
		"\\frac{e^{i\\theta} - e^{-i\\theta}}{2i}",
		"\\frac{e^{i\\theta} + e^{-i\\theta}}{2}",
		"\\frac{e^{\\theta} - e^{-\\theta}}{2}",
		"\\frac{e^{\\theta} + e^{-\\theta}}{2}",
	]
	this.src = candidates[Math.floor(Math.random() * candidates.length)];
}

EulerFormula.prototype.solution = function(){
	switch(this.src){
		case "e^{i\\theta}":
			return "\\cos(\\theta) + i\\sin(\\theta)";
		case "\\sin(\\theta)":
			return "\\frac{e^{i\\theta} - e^{-i\\theta}}{2i}";
		case "\\cos(\\theta)":
			return "\\frac{e^{i\\theta} + e^{-i\\theta}}{2}";
		case "\\sinh(\\theta)":
			return "\\frac{e^{\\theta} - e^{-\\theta}}{2}";
		case "\\cosh(\\theta)":
			return "\\frac{e^{\\theta} + e^{-\\theta}}{2}";

		// Inverse problems
		case "\\cos(\\theta) + i\\sin(\\theta)":
			return "e^{i\\theta}";
		case "\\frac{e^{i\\theta} - e^{-i\\theta}}{2i}":
			return "\\sin(\\theta)";
		case "\\frac{e^{i\\theta} + e^{-i\\theta}}{2}":
			return "\\cos(\\theta)";
		case "\\frac{e^{\\theta} - e^{-\\theta}}{2}":
			return "\\sinh(\\theta)";
		case "\\frac{e^{\\theta} + e^{-\\theta}}{2}":
			return "\\cosh(\\theta)";
		default: return "0";
	}
}

EulerFormula.prototype.formatProblem = function(){
	return this.src;
}

/// ------------- Differential forms class --------------------------
function DifForm(){
	var nform = Math.floor(Math.random() * 4);
	this.op1 = difForm(nform,
		pickCandidate(), pickCandidate(), pickCandidate());
	this.op2 = difForm(nform,
		pickCandidate(), pickCandidate(), pickCandidate());
}

function DifFormAdd(){
	DifForm.call(this);
}
inherit(DifFormAdd, DifForm);

DifFormAdd.prototype.solution = function(){
	function addForm(op1, op2){
		var ret = {n: op1.n};
		ret.dx = op1.dx + op2.dx;
		ret.dy = op1.dy + op2.dy;
		ret.dz = op1.dz + op2.dz;
		return ret;
	}
	return formatForm(addForm(this.op1, this.op2));
}

DifFormAdd.prototype.formatProblem = function(){
	return "(" + formatForm(this.op1) + ")+(" + formatForm(this.op2) + ")";
}

function DifFormMul(){
	DifForm.call(this);
	this.op1 = difForm(Math.floor(Math.random() * 4),
		pickCandidate(), pickCandidate(), pickCandidate());
	this.op2 = difForm(Math.floor(Math.random() * 4),
		pickCandidate(), pickCandidate(), pickCandidate());
}
inherit(DifFormMul, DifForm);

DifFormMul.prototype.solution = function(){
	function mulForm(op1, op2){
		var ret = {n: op1.n + op2.n};
		if(op1.n === 0){
			ret.dx = op1.dx * op2.dx;
			ret.dy = op1.dx * op2.dy;
			ret.dz = op1.dx * op2.dz;
		}
		else if(op2.n === 0){
			ret.dx = op1.dx * op2.dx;
			ret.dy = op1.dy * op2.dx;
			ret.dz = op1.dz * op2.dx;
		}
		else if(op1.n === 1 && op2.n === 1){
			ret.dx = op1.dy * op2.dz + op1.dz * op2.dy;
			ret.dy = op1.dz * op2.dx + op1.dx * op2.dz;
			ret.dz = op1.dx * op2.dy + op1.dy * op2.dx;
		}
		else if(op1.n + op2.n === 3){
			ret.dx = op1.dx * op2.dx + op1.dy * op2.dy + op1.dz * op2.dz;
		}
		else
			ret.dx = 0;
		return ret;
	}
	return formatForm(mulForm(this.op1, this.op2));
}

DifFormMul.prototype.formatProblem = function(){
	return "(" + formatForm(this.op1) + ")(" + formatForm(this.op2) + ")";
}

function pickCandidate(){
	var candidates = [
		0,1,2,3,4,5,7,
		-1,-2,-3,-4,-5,-7,
	];

	return candidates[Math.floor(Math.random() * candidates.length)];
}

function difForm(n, dx, dy, dz){
	return {
		n: n, dx: dx, dy: n === 1 || n === 2 ? dy : 0, dz: n === 1 || n === 2 ? dz : 0
	};
}

function formatForm(f){
	function appendTerm(s, f, suffix){
		if(s !== "")
			s += f < 0 ? "-" : "+";
		if(f < 0 && s === "")
			s += "-";
		if(Math.abs(f) !== 1)
			s += Math.abs(f);
		return s + suffix;
	}
	var ret = "";
	if(f.n === 0)
		return f.dx;
	else if(f.n === 1){
		if(f.dx !== 0)
			ret = appendTerm(ret, f.dx, "dx");
		if(f.dy !== 0)
			ret = appendTerm(ret, f.dy, "dy");
		if(f.dz !== 0)
			ret = appendTerm(ret, f.dz, "dz");
	}
	else if(f.n === 2){
		if(f.dx !== 0)
			ret = appendTerm(ret, f.dx, "dydz");
		if(f.dy !== 0)
			ret = appendTerm(ret, f.dy, "dzdx");
		if(f.dz !== 0)
			ret = appendTerm(ret, f.dz, "dxdy");
	}
	else if(f.n === 3){
		return f.dx !== 0 ? f.dx + "dxdydz" : "0";
	}
	else // Form 4+ is always zero.
		return "0";
	return ret;
}


/// ------------- Quaternions class --------------------------
function Quat(){
	var q;
	this.op1 = quat(pickCandidate(), pickCandidate(), pickCandidate(), pickCandidate());
	this.op2 = quat(pickCandidate(), pickCandidate(), pickCandidate(), pickCandidate());
}

function QuatAdd(){
	Quat.call(this);
}
inherit(QuatAdd, Quat);

QuatAdd.prototype.solution = function(){
	function addQuat(op1, op2){
		return {w: op1.w + op2.w, i: op1.i + op2.i, j: op1.j + op2.j, k: op1.k + op2.k};
	}
	return formatQuat(addQuat(this.op1, this.op2));
}

QuatAdd.prototype.formatProblem = function(){
	return "(" + formatQuat(this.op1) + ")+(" + formatQuat(this.op2) + ")";
}

function QuatSub(){
	Quat.call(this);
}
inherit(QuatSub, Quat);

QuatSub.prototype.solution = function(){
	function subQuat(op1, op2){
		return {w: op1.w - op2.w, i: op1.i - op2.i, j: op1.j - op2.j, k: op1.k - op2.k};
	}
	return formatQuat(subQuat(this.op1, this.op2));
}

QuatSub.prototype.formatProblem = function(){
	return "(" + formatQuat(this.op1) + ")-(" + formatQuat(this.op2) + ")";
}

function QuatMul(){
	Quat.call(this);
}
inherit(QuatMul, Quat);

QuatMul.prototype.solution = function(){
	function mulQuat(op1, op2){
		return {
			w: op1.w * op2.w - op1.i * op2.i - op1.j * op2.j - op1.k * op2.k,
			i: op1.w * op2.i + op1.i * op2.w + op1.j * op2.k - op1.k * op2.j,
			j: op1.w * op2.j + op1.j * op2.w + op1.k * op2.i - op1.i * op2.k,
			k: op1.w * op2.k + op1.k * op2.w + op1.i * op2.j - op1.j * op2.i
		};
	}
	return formatQuat(mulQuat(this.op1, this.op2));
}

QuatMul.prototype.formatProblem = function(){
	return "(" + formatQuat(this.op1) + ")(" + formatQuat(this.op2) + ")";
}

function quat(w, i, j, k){
	return {
		w: w, i: i, j: j, k: k
	};
}

function formatQuat(q){
	function appendTerm(s, f, suffix){
		if(f === 0)
			return s;
		if(s !== "")
			s += f < 0 ? "-" : "+";
		if(f < 0 && s === "")
			s += "-";
		if(suffix === "" || Math.abs(f) !== 1)
			s += Math.abs(f);
		return s + suffix;
	}
	var ret = "";
	ret = appendTerm(ret, q.w, "");
	ret = appendTerm(ret, q.i, "i");
	ret = appendTerm(ret, q.j, "j");
	ret = appendTerm(ret, q.k, "k");
	return ret;
}


// ------------- Main program ------------------
function start(){
	probClasses = [];
	if(document.getElementById("dpoly").checked)
		probClasses.push([1, DPoly]);
	if(document.getElementById("delem").checked){
		probClasses.push([0.3, DTri]);
		probClasses.push([0.3, DExp]);
		probClasses.push([0.3, DLog]);
	}
	if(document.getElementById("ipoly").checked)
		probClasses.push([1, IPoly]);
	if(document.getElementById("ielem").checked){
		probClasses.push([0.4, ITri]);
		probClasses.push([0.4, IExp]);
	}
	if(document.getElementById("comp").checked){
		probClasses.push([0.5, ComplexAdd]);
		probClasses.push([0.5, ComplexMultiply]);
	}
	if(document.getElementById("compdiv").checked){
		probClasses.push([0.5, ComplexDivision]);
	}
	if(document.getElementById("matvec").checked){
		probClasses.push([0.5, MatrixVectorProduct]);
	}
	if(document.getElementById("matmat").checked){
		probClasses.push([0.5, MatrixMatrixProduct]);
	}
	if(document.getElementById("matdet").checked){
		probClasses.push([0.5, MatrixDeterminant]);
	}
	if(document.getElementById("matinv").checked){
		probClasses.push([0.5, MatrixInversion]);
	}
	if(document.getElementById("pdpoly").checked){
		probClasses.push([1, PDPoly]);
	}
	if(document.getElementById("phdpoly").checked){
		probClasses.push([1, HDPoly]);
		if(document.getElementById("pdpoly").checked)
			probClasses.push([1, PHDPoly]);
	}
	if(document.getElementById("taylor").checked){
		probClasses.push([1, TaylorSeries]);
	}
	if(document.getElementById("euler").checked){
		probClasses.push([1, EulerFormula]);
	}
	if(document.getElementById("difform").checked){
		probClasses.push([0.5, DifFormAdd]);
		probClasses.push([0.5, DifFormMul]);
	}
	if(document.getElementById("quatadd").checked){
		probClasses.push([0.5, QuatAdd]);
		probClasses.push([0.5, QuatSub]);
	}
	if(document.getElementById("quatmul2").checked){
		probClasses.push([1, QuatMul]);
	}
	if(probClasses.length === 0){
		alert("Please check at least one of problem classes");
		return;
	}

	var table = document.getElementById("scoreboard");
	while(table.firstChild)
		table.removeChild(table.firstChild);

	var headerRow = document.createElement("tr");
	for(var i = 0; i < probCount; i++){
		var header = document.createElement("td");
		header.innerHTML = i + 1;
		headerRow.appendChild(header);
	}
	table.appendChild(headerRow);

	var points = document.getElementById("points");
	points.style.display = "none";

	currentProblem = -1;
	results = [];
	next();
}

var lastProbClass = null;

function next(){
	if(probCount <= currentProblem + 1){
		var incorrects = 0;
		for(var i = 0; i < results.length; i++){
			if(results[i])
				incorrects++;
		}
		var points = document.getElementById("points");
		points.innerHTML = "Congraturations!<br>"
			+ "You have answered " + (probCount - incorrects) + "/" + probCount + " problems correctly!";
		points.style.display = "initial";
		return;
	}
	var Problem = (function(){
		var cumulativeWeights = [];
		for(var i = 0; i < probClasses.length; i++){
			cumulativeWeights[i] = probClasses[i][0];
			if(0 < i)
				cumulativeWeights[i] += cumulativeWeights[i-1];
		}
		var picker = Math.random() * cumulativeWeights[probClasses.length-1];
		for(var i = 0; i < probClasses.length; i++){
			if(picker < cumulativeWeights[i])
				return probClasses[i][1];
		}
		// Should never reach here
	})();
	var vec = new Problem();

	var problem = document.getElementById("problem");
	//problem.innerHTML = "$$" + vec.formatProblem() + "$$";
	katex.render("\\displaystyle " + vec.formatProblem(), problem);

	var problemStr = vec.formatProblem();
	var correctAnsStr = vec.solution();

	var options = [];
	for(var i = 0; i < optionCount; i++){
		var str;
		for(var tries = 0; tries < 100; tries++){
			var ivec = new Problem();
			// Generate answers from the same class since they're more realistic
			str = ivec.solution();
			var same = false;
			// Prevent random formulae from being "accidentally" the same as correct answer
			// or other options.
			for(var j = 0; j < i; j++){
				if(options[j] === str){
					same = true;
					break;
				}
			}
			// Try to avoid the same string as the problem, which is obvious
			if(!same && correctAnsStr !== str && problemStr !== str)
				break;
		}
		options[i] = str;
	}

	correctAns = Math.floor(Math.random() * optionCount);
	options[correctAns] = correctAnsStr;

	for(var i = 0; i < optionCount; i++){
		var elem = document.getElementById("ans" + (i + 1));
		//elem.innerHTML = "$ \\displaystyle " + options[i] + "$";
		katex.render("\\displaystyle " + options[i], elem);
		var radio = document.getElementById(i + 1);
		radio.checked = false;
	}

	var messageElem = document.getElementById("message");
	messageElem.innerHTML = "";

	var nextElem = document.getElementById("next");
	nextElem.style.display = "none";

	currentProblem++;
	var scoreboard = document.getElementById("scoreboard");
	if(0 < currentProblem)
		scoreboard.firstChild.children[currentProblem-1].style.border = "";
	scoreboard.firstChild.children[currentProblem].style.border = "3px solid #0000ff";

	lastProbClass = vec;

	//MathJax.Hub.Typeset();
}

function answer(){
	var radio = document.getElementById(correctAns + 1);
	var message;

	var lastClass = (function(){
		if(lastProbClass === null)
			return null;
		for(var k in classes){
			var thisClass = classes[k];
			for(var j = 0; j < thisClass.probs.length; j++){
				if(thisClass.probs[j][1] === lastProbClass.constructor)
					return k;
			}
		}
		return null;
	})();

	var color;
	if(radio.checked){
		message = "Correct";
		color = "#007f00";
		if(lastClass)
			scores[lastClass].corrects++;
	}
	else{
		message = "Incorrect";
		color = "#ff0000";
		if(lastClass)
			scores[lastClass].incorrects++;
	}
	var messageElem = document.getElementById("message");
	messageElem.innerHTML = message;
	messageElem.style.color = color;

	var nextElem = document.getElementById("next");
	nextElem.value = currentProblem < probCount-1 ? "Next Problem" : "Finish";
	nextElem.style.display = radio.checked ? "inline" : "none";

	results[currentProblem] |= !radio.checked;
	var scoreboard = document.getElementById("scoreboard");
	scoreboard.firstChild.children[currentProblem].style.backgroundColor = !results[currentProblem] ? "#00ff00" : "#ff0000";

	// Using 'href' property messes up browser history, so we use scrollIntoView().
	// We used to scroll the window so that the problem is visible after answering,
	// but now that we have score statistics board that is long enough, we don't need to.
//	location.href = "#";
//	location.href = "#problem";
	//window.scrollTo(0,document.body.scrollHeight);
	//scoreboard.scrollIntoView();

	updateHighScores();
	saveHighScores();
}

var maxDifficulty = 3;

// Problem classes database
var classes = {
	"dpoly": {"difficulty": 1, "dispName": "Derivative of Polynomials", probs: [[1, DPoly]]},
	"delem": {"difficulty": 1, "dispName": "Derivative of Elementary functions", probs: [
		[0.3, DTri], [0.3, DExp], [0.3, DLog]]},
	"ipoly": {"difficulty": 1, "dispName": "Integral of Polynomials", probs: [[1, IPoly]]},
	"ielem": {"difficulty": 1, "dispName": "Integral of Elementary functions", probs: [[0.4, ITri], [0.4, IExp]]},
	"comp": {"difficulty": 1, "dispName": "Complex numbers", probs: [[0.5, ComplexAdd], [0.5, ComplexMultiply]]},
	"compdiv": {"difficulty": 2, "dispName": "Complex division", probs: [[0.5, ComplexDivision]]},
	"matvec": {"difficulty": 1, "dispName": "Matrix and Vector product", probs: [[0.5, MatrixVectorProduct]]},
	"matmat": {"difficulty": 1, "dispName": "Matrix and Matrix product", probs: [[0.5, MatrixMatrixProduct]]},
	"matdet": {"difficulty": 1, "dispName": "Matrix determinant", probs: [[0.5, MatrixDeterminant]]},
	"matinv": {"difficulty": 1, "dispName": "Matrix inversion", probs: [[0.5, MatrixInversion]]},
	"pdpoly": {"difficulty": 1, "dispName": "Partial derivative of Polynomials", probs: [[1, PDPoly]]},
	"phdpoly": {"difficulty": 1, "dispName": "Partial higher-order derivative of Polynomials", probs: [[1, HDPoly], [1, PHDPoly]]},
	"taylor": {"difficulty": 2, "dispName": "Taylor series", probs: [[1, TaylorSeries]]},
	"euler": {"difficulty": 2, "dispName": "Euler equation", probs: [[1, EulerFormula]]},
	"difform": {"difficulty": 3, "dispName": "Differential forms", probs: [[0.5, DifFormAdd], [0.5, DifFormMul]]},
	"quatadd": {"difficulty": 1, "dispName": "Quaternion addition", probs: [[0.5, QuatAdd], [0.5, QuatSub]]},
	"quatmul2": {"difficulty": 2, "dispName": "Quaternion multiplication", probs: [[1, QuatMul]]},
};

function onStar(num, checkBox){
	var checked = checkBox.checked;
	for(var k in classes){
		var elem = document.getElementById(k);
		if(!elem || classes[k].difficulty !== num)
			continue;
		elem.checked = checked;
	}
}

function onHighSchool(check){
	document.getElementById("dpoly").checked = check;
	document.getElementById("delem").checked = check;
	document.getElementById("ipoly").checked = check;
	document.getElementById("ielem").checked = check;
	document.getElementById("comp").checked = check;
	document.getElementById("compdiv").checked = check;
	document.getElementById("matvec").checked = check;
	document.getElementById("matmat").checked = check;
	document.getElementById("matdet").checked = check;
	document.getElementById("matinv").checked = check;
}

function onUndergrad(check){
	document.getElementById("pdpoly").checked = check;
	document.getElementById("phdpoly").checked = check;
	document.getElementById("taylor").checked = check;
	document.getElementById("euler").checked = check;
}

function onGrad(check){
	document.getElementById("difform").checked = check;
	document.getElementById("quatadd").checked = check;
	document.getElementById("quatmul2").checked = check;
}

var scores = undefined;

function loadHighScoresFromLocalStorage(){
	var st = localStorage.getItem('MathQuiz');
	var ok = false;
	if(st){
		var json = JSON.parse(st);
		if(json && typeof json === 'object' && json.scores && typeof json.scores === 'object'){
			scores = json.scores;
			ok = true;
		}
	}

	// If the data is not as expected, reset to default
	if(!ok){
		resetStatsInt();
	}
	updateHighScores();
}

var userId = "";

function refreshQRCode(){
    const container = document.getElementById('qrcodeContainer');
	var elem = document.getElementById('qrcode');
	// Only generate QRCode if the div is visible
	if(container.style.display === 'block'){
        QRCode.toCanvas(elem, userId);
	}
}

function saveUserIdFromUI(){
	var elem = document.getElementById("userId")
	// User ID must be userIdLength bytes long
	if(elem && elem.value.length === userIdLength){
		// Only update the internal user id variable when the input is valid.
		userId = elem.value;
		localStorage.setItem('MathQuizUserId', userId);
		return true;
	}
	else{
		alert("User Id must be " + userIdLength.toString() + " characters hexadecimal number.");
		return false;
	}
}

function toggleShowUserId(button){
	var elem = document.getElementById('userIdBar');
	elem.style.display = elem.style.display === 'none' ? 'block' : 'none';
	button.value = elem.style.display === 'none' ? 'Show User Id' : 'Hide User Id';
}

function toggleShowUserIdQRCode(button){
	var elem = document.getElementById('qrcodeContainer');
	elem.style.display = elem.style.display === 'none' ? 'block' : 'none';
	refreshQRCode();
	button.value = elem.style.display === 'none' ? 'Show User Id QRCode' : 'Hide User Id QRCode';
}

function reloadHighScores(){
	if(!saveUserIdFromUI())
		return;
	loadHighScores();
}

function loadHighScores(){

	if(userId === ""){
		alert("Invalid user id");
		return;
	}

	getDoc(doc(collection(db, '/users'), userId))
	.then(function(doc) {
		if (doc.exists()) {
			const data = doc.data();
			if (data) {
				scores = doc.data().scores;

				// Create empty entry for new problem classes
				for(var key in classes){
					if(!(key in scores))
						scores[key] = {corrects: 0, incorrects: 0};
				}
			}
		} else {
			console.log("No user");
			resetStatsInt();
		}
		updateHighScores();
	})
	.catch(function(error) {
		console.log("Error : ", error);
	})
}

var globalScores = null;

function loadGlobalStats(){
	getDocs(collection(db, "users")).then(function(query){
		var buff = [];
		globalScores = {};
		query.forEach(function(doc){
			var data = doc.data();
			for(var key in data.scores){
				var value = data.scores[key];
				if(key in globalScores){
					for(var entry in value){
						if(entry in globalScores[key])
							globalScores[key][entry] += value[entry];
						else
							globalScores[key][entry] = value[entry];
					}
				}
				else{
					globalScores[key] = value;
				}
			}

			// Create empty entry for new problem classes
			for(var key in classes){
				if(!(key in globalScores))
					globalScores[key] = {corrects: 0, incorrects: 0};
			}
		});
		updateHighScores();
	})
	.catch(function(error){
		console.log("Failed to load data");
	});
}

function resetStatsInt(){
	var st = {};
	for(var k in classes){
		var v = {corrects: 0, incorrects: 0};
		st[k] = v;
	}
	scores = st;
	saveHighScores();
}

function resetStats(){
	if(confirm('Are you sure you want to reset the statistics?\nYour long accumulated stats will be lost forever!')){
		resetStatsInt();
		updateHighScores();
	}
}

function updateHighScores(){
	var highScoresElem = document.getElementById('highScores');
	var elem;
	while(elem = highScoresElem.children[0]){
		highScoresElem.removeChild(elem);
	}

	var table = document.createElement('table');

	// Header row
	var el = document.createElement('tr');
	var header = document.createElement('th');
	header.innerHTML = 'Problem class';
	el.appendChild(header);
	var corrects = document.createElement('th');
	corrects.innerHTML = 'Corrects';
	el.appendChild(corrects);
	var incorrects = document.createElement('th');
	incorrects.innerHTML = 'Incorrects';
	el.appendChild(incorrects);
	var ratio = document.createElement('th');
	ratio.innerHTML = 'Ratio';
	el.appendChild(ratio);
	var globalRatio = document.createElement('th');
	globalRatio.innerHTML = 'Global Ratio';
	el.appendChild(globalRatio);
	table.appendChild(el);

	// Content rows
	for(var k in classes){
		var el = document.createElement('tr');
		var v = scores[k];
		if(v === undefined)
			continue;
		var header = document.createElement('th');
		header.innerHTML = (classes[k].dispName || k);
		el.appendChild(header);
		var corrects = document.createElement('td');
		corrects.innerHTML = v.corrects;
		if(v.corrects)
			corrects.classList.add('green');
		el.appendChild(corrects);
		var incorrects = document.createElement('td');
		incorrects.innerHTML = v.incorrects;
		if(v.incorrects)
			incorrects.classList.add('red');
		el.appendChild(incorrects);
		var ratio = document.createElement('td');
		if(v.incorrects + v.corrects === 0){
			ratio.innerHTML = '--';
		}
		else{
			var ratioVal = v.corrects / (v.incorrects + v.corrects);
			ratio.innerHTML = (100 * ratioVal).toFixed(1) + '%';
			ratio.style.backgroundColor = 'rgb(' + (255 * (1 - ratioVal)).toFixed() + ',' + (128 + 127 * ratioVal).toFixed() + ',1)';
		}
		el.appendChild(ratio);
		if(globalScores && k in globalScores){
			var gv = globalScores[k];
			var globalRatio = document.createElement('td');
			if(gv.incorrects + gv.corrects === 0){
				globalRatio.innerHTML = '--';
			}
			else{
				var ratioVal = gv.corrects / (gv.incorrects + gv.corrects);
				globalRatio.innerHTML = (100 * ratioVal).toFixed(1) + '% / ' + (gv.incorrects + gv.corrects).toFixed();
				globalRatio.style.backgroundColor = 'rgb(' + (255 * (1 - ratioVal)).toFixed() + ',' + (128 + 127 * ratioVal).toFixed() + ',1)';
			}
			el.appendChild(globalRatio);
		}
		table.appendChild(el);
	}

	highScoresElem.appendChild(table);
}

function saveHighScores(){
	localStorage.setItem('MathQuiz', JSON.stringify({scores: scores}) );

	if(userId === ""){
		alert("Invalid user id");
		return;
	}

	setDoc(doc(collection(db, "/users"), userId), {scores: scores})
	.then(function() {
		console.log("Document successfully written!");
	})
	.catch(function(error) {
		console.error("Error writing document: ", error);
	});
}

function randomizeUserId(){
	userId = "";
	// This is not cryptographically safe random number, but we'd settle for this
	// because this application is not serious.
	for(var i = 0; i < userIdLength; i++)
		userId += Math.floor(Math.random() * 16).toString(16);
	localStorage.setItem('MathQuizUserId', userId);
	var elem = document.getElementById("userId");
	if(elem)
		elem.value = userId;
	refreshQRCode();
	return userId;
}

function loadUserId(){
	var st = localStorage.getItem('MathQuizUserId');
	var ok = false;
	if(st && typeof st === "string" && st.length === userIdLength){
		ok = true;
		userId = st;
		var elem = document.getElementById("userId");
		if(elem)
			elem.value = st;
		refreshQRCode();
	}
	else{
		// If the data is not as expected, regenerate random id
		st = randomizeUserId();
	}
}

function generateUserId(){
	if(confirm('Are you sure you want to generate a new Id?\n' +
		'Your long accumulated stats can be lost forever!\n' +
		'(You can recall your previous stats by entering old user id)')){
		randomizeUserId();
		resetStatsInt();
		updateHighScores();
	}
}

global.onload = function(){

	// Insert difficulty stars in front of problem classes
	for(var k in classes){
		var elem = document.getElementById(k);
		if(!elem)
			continue;
		for(var i = 0; i < maxDifficulty; i++)
		{
			var star = document.createElement("img");
			var index = elem.parentElement.insertBefore(star, elem.nextSibling);
			// We're inserting in the reversed order of appearance, so i is counted from maxDifficulty.
			star.setAttribute("src", maxDifficulty - i - 1 < classes[k].difficulty ? starImage : starDisabledImage);
			// star.style.backgroundImage = "url(star.png)";
			// star.style.position = "relative";
			// star.style.display = "inline-block";
			// star.style.width = 16 * classes[k] + "px";
			// star.style.height = "16px";
		}
	}

	loadGlobalStats();

	loadUserId();

	loadHighScores();

	start();
}

for(let i = 0; i < 3; i++) {
    const starButton = document.getElementById(`star${i + 1}`);
    const difficulty = i + 1;
    starButton.addEventListener("click", (event) => onStar(difficulty, event.target));
}

const highSchoolButton = document.getElementById("highSchool");
highSchoolButton.addEventListener("click", (event) => onHighSchool(event.target.checked));

const undergradButton = document.getElementById("undergraduate");
undergradButton.addEventListener("click", (event) => onUndergrad(event.target.checked));

const graduateButton = document.getElementById("graduate");
graduateButton.addEventListener("click", (event) => onGrad(event.target.checked));

const startButton = document.getElementById("start");
startButton.addEventListener("click", start);

const nextButton = document.getElementById("next");
nextButton.addEventListener("click", next);

const qrCodeButton = document.getElementById("qrCode");
qrCodeButton.addEventListener("click", toggleShowUserIdQRCode);

const answerButton = document.getElementById("answer");
answerButton.addEventListener("click", answer);

const showUserIdButton = document.getElementById("showUserId");
showUserIdButton.addEventListener("click", toggleShowUserId);

const setUserIdButton = document.getElementById("setUserId");
setUserIdButton.addEventListener("click", reloadHighScores);

const gentUserIdButton = document.getElementById("genUserId");
gentUserIdButton.addEventListener("click", generateUserId);

const resetStatsButton = document.getElementById("resetStats");
resetStatsButton.addEventListener("click", resetStats);
