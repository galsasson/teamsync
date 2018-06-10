// grapher.js

class Grapher
{
	constructor(width, height, historySec) {		// history in sec
		this.width = width;
		this.height = height;
		this.color = {
			r:255,
			b:255,
			g:255
		};

		this.data = [];
		this.min = -45;
		this.max = 45;
		this.lastMMCooldownMS = 100;
		this.smoothness = 0.15;			// lower is smoother

		this.history = historySec;
		this.maxima = [];
		this.minima = [];
		this.smoothData = [];
		this.lastMMTime = 0;
	}

	drawGraph() {
		var t = float(millis())/1000;

		this.drawGraphImpl(this.data, t, 90);
		this.drawGraphImpl(this.smoothData, t, 255);

		this.drawMinimaMaxima();
	}

	drawGraphImpl(graph, t, alpha) {
		if (t === undefined) {
			t = float(millis())/1000;
		}
		if (alpha===undefined) {
			alpha = 255;
		}

		// draw graph line
		noFill();
		stroke(this.color.r, this.color.g, this.color.b, alpha);
		beginShape();
		for (var i=graph.length-1; i>=0; i--) {
			var y = this.valToY(graph[i].v);
			var x = this.dtToX(t-graph[i].t);
			vertex(x, y);
			// ellipse(x,y,3,3)			// draw points
		}
		endShape();
	}

	drawMinimaMaxima() {
		var t = float(millis())/1000;

		stroke(1.3*this.color.r, 0.7*this.color.g, 0.7*this.color.b, 200);

		for (var i=0; i<this.maxima.length; i++) {
			var x = this.dtToX(t-this.maxima[i].t);
			var y = this.valToY(this.maxima[i].v);
			line(x, 0, x, y);
			line(x-3, y+3, x+3, y-3);
			line(x-3, y-3, x+3, y+3);
		}

		stroke(0.7*this.color.r, 0.7*this.color.g, 1.3*this.color.b, 200);
		for (var i=0; i<this.minima.length; i++) {
			var x = this.dtToX(t-this.minima[i].t);
			var y = this.valToY(this.minima[i].v);
			line(x, this.height, x, y);
			line(x-3, y+3, x+3, y-3);
			line(x-3, y-3, x+3, y+3);
		}
	}

	drawAxis()
	{
		// y axis
		var nSteps = 8;
		var step = (this.max-this.min)/nSteps;
		for (var v=this.min; v<this.max; v+=step) {
			var y = map(v, this.min, this.max, this.height, 0);
			stroke(255, 20);
			line(0, y, this.width, y);
			fill(255, 128);
			noStroke();
			text(v, 2, y-2);
		}

		// x axis
		nSteps = 8;
		step = (this.width/nSteps);
		var hstep = this.history/this.width;
		for (var v=this.width; v>0; v-=step) {
			stroke(255, 20);
			line(v, 0, v, this.height);
			noStroke();
			fill(255, 128);
			var t = -this.xToDT(v);
			text(parseFloat(t).toFixed(1) + " sec", v+2, this.height-6);
		}

	}

	addPoint(p) {
		var dp = {
			t: float(millis())/1000,
			v: p
		};

		// add point to graph 
		this.data.push(dp);
		if (this.data.length > this.history*60+1) {
			this.data.shift();
		}

		// add smooth graph point
		if (this.smoothData.length==0) {
			this.smoothData.push({t:0,v:0});
		}
		var lastSmooth = this.smoothData[this.smoothData.length-1];
		var smooth = {
			t: dp.t,
			v: lastSmooth.v+(dp.v-lastSmooth.v)*this.smoothness
		};
		this.smoothData.push(smooth);
		if (this.smoothData.length > this.history*60+1) {
			this.smoothData.shift();
		}

		this.findLocalMinimaMaxima();
		this.freq = this.getFreq();
		this.phase = this.getPhase();
	}

	findLocalMinimaMaxima() {
		var d = this.smoothData;
		// var d = this.data;

		if (d.length<19) {
			return;
		}

		var i = d.length-10;
		var v = d[i].v;
		var e = (v-d[i-9].v)*1 + (v-d[i-6].v)*1 + (v-d[i-3].v)*1 + (v-d[i-1].v) +
					(v-d[i+9].v)*1 + (v-d[i+6].v)*1 + (v-d[i+3].v)*1 + (v-d[i+1].v);
		// console.log(e);

		if (d[i].v>d[i-5].v&&
			d[i].v>d[i-3].v&&
			d[i].v>d[i-1].v &&
			d[i].v>d[i+1].v &&
			d[i].v>d[i+3].v &&
			d[i].v>d[i+5].v) {
			if (abs(e)>3 && millis()-this.lastMMTime>this.lastMMCooldownMS) {
				this.maxima.push(d[i]);
				this.lastMMTime = millis();
			}
		}
		else if (d[i].v<d[i-5].v&&
			d[i].v<d[i-3].v&&
			d[i].v<d[i-1].v &&
			d[i].v<d[i+1].v &&
			d[i].v<d[i+3].v &&
			d[i].v<d[i+5].v) {
			if (abs(e)>3 && millis()-this.lastMMTime>this.lastMMCooldownMS) {
				this.minima.push(d[i]);
				this.lastMMTime = millis();
			}
		}

		if (this.maxima.length > this.history*30) { 
			this.maxima.shift();
		}
		if (this.minima.length > this.history*30) {
			this.minima.shift();
		}
	}

	getFreq() {
		if (this.maxima.length<3) {
			return 0;
		}

		var sum=0;
		for (var i=this.maxima.length-2; i<this.maxima.length; i++) {
			sum += this.maxima[i].t-this.maxima[i-1].t;
		}
		return sum/2;
	}

	getPhase() {
		if (this.maxima.length<4 || this.smoothData.length<11) {
			return 0;
		}

		return (this.smoothData[this.smoothData.length-10].t-this.maxima[this.maxima.length-1].t)/this.freq;
	}

	valToY(v) {
		return map(v, this.min, this.max, this.height, 0);
	}

	dtToX(t) {
		return this.width-this.width*(t/this.history);
	}

	xToDT(x) {
		return ((this.width-x)/this.width)*this.history;
	}

	setColor(r,g,b) {
		this.color.r = r;
		this.color.g = g;
		this.color.b = b;
	}
}


