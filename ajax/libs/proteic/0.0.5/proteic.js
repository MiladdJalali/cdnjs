(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3')) :
    typeof define === 'function' && define.amd ? define(['exports', 'd3'], factory) :
    (factory((global.proteic = global.proteic || {}),global.d3));
}(this, (function (exports,d3) { 'use strict';

function __extends(d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var SvgContext = (function () {
    function SvgContext(strategy, config) {
        this.strategy = strategy;
        this.strategy.setConfig(config);
        this.strategy.initialize();
    }
    SvgContext.prototype.draw = function (data) {
        this.strategy.draw(data);
    };
    SvgContext.prototype.addLoading = function () {
        this.strategy.addLoading();
    };
    SvgContext.prototype.removeLoading = function () {
        this.strategy.removeLoading();
    };
    return SvgContext;
}());

var Config = (function () {
    function Config() {
        this.properties = {};
    }
    Config.prototype.put = function (key, value) {
        this.properties[key] = value;
        return this;
    };
    Config.prototype.get = function (key) {
        return this.properties[key];
    };
    return Config;
}());

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function isPercentage(n) {
    var split = null;
    var number = null;
    if (!n || typeof n !== 'string') {
        return false;
    }
    split = n.split('%');
    number = (+split[0]);
    return split.length === 2 &&
        (number >= 0) &&
        (number <= 100);
}



function copy(object) {
    return object != null ? JSON.parse(JSON.stringify(object)) : null;
}
function deg2rad(deg) {
    return deg * Math.PI / 180;
}

function calculateWidth(widthConfig, selector) {
    if (widthConfig === 'auto') {
        return d3.select(selector)
            .node()
            .getBoundingClientRect()
            .width;
    }
    else if (isNumeric(widthConfig)) {
        return widthConfig;
    }
    else if (isPercentage(widthConfig)) {
        var containerWidth = void 0, percentage = void 0;
        containerWidth = d3.select(selector)
            .node()
            .getBoundingClientRect()
            .width;
        percentage = widthConfig.split('%')[0];
        return Math.round(percentage * containerWidth / 100);
    }
    else {
        throw Error('Unknow config width value: ' + widthConfig);
    }
}

var Chart = (function () {
    function Chart(strategy, data, userConfig, defaults) {
        this.ds = null;
        this.dispatcher = d3.dispatch('onmessage', 'onopen', 'onerror', 'addLoading', 'removeLoading');
        this.config = this.loadConfigFromUser(userConfig, defaults);
        this.context = new SvgContext(strategy, this.config);
        this.data = data;
    }
    Chart.prototype.draw = function (data) {
        if (data === void 0) { data = this.data; }
        this.context.draw(copy(data));
        this.data = data;
    };
    Chart.prototype.datasource = function (ds) {
        var _this = this;
        this.ds = ds;
        this.ds.configure(this.dispatcher);
        this.dispatcher.on('addLoading', function () { return _this.context.addLoading(); });
        this.dispatcher.on('removeLoading', function () { return _this.context.removeLoading(); });
        this.dispatcher.on('onmessage', function (data) { return _this.keepDrawing(data); });
        this.dispatcher.on('onopen', function (event$$1) {
            console.log('onopen', event$$1);
        });
        this.dispatcher.on('onerror', function (error) {
            console.log('onerror', error);
        });
    };
    Chart.prototype.loadConfigFromUser = function (userData, defaults) {
        var config = new Config();
        for (var v in defaults) {
            config.put(v, (v in userData) ? userData[v] : defaults[v]);
        }
        var width = config.get('width');
        width = calculateWidth(width, config.get('selector')) - config.get('marginLeft') - config.get('marginRight');
        config.put('width', width);
        return config;
    };
    return Chart;
}());

var Component = (function () {
    function Component() {
    }
    Component.prototype.configure = function (config, svg) {
        this.config = config;
        this.svg = svg;
    };
    Component.prototype.clean = function () {
        this.svg.selectAll('.serie').remove();
    };
    return Component;
}());

var XAxis = (function (_super) {
    __extends(XAxis, _super);
    function XAxis() {
        return _super.call(this) || this;
    }
    XAxis.prototype.render = function () {
        var width = this.config.get('width'), height = this.config.get('height'), xAxisFormat = this.config.get('xAxisFormat'), xAxisType = this.config.get('xAxisType'), xAxisLabel = this.config.get('xAxisLabel'), xAxisGrid = this.config.get('xAxisGrid');
        this.initializeXAxis(width, height, xAxisFormat, xAxisType, xAxisGrid);
        this.svg
            .append('g')
            .attr('class', "x axis " + xAxisType)
            .attr('transform', 'translate(0,' + height + ')')
            .call(this._xAxis);
        this.svg
            .append('text')
            .attr('class', 'xaxis-title')
            .attr("text-anchor", "middle")
            .attr('x', width / 2)
            .attr('y', height + 40)
            .text(xAxisLabel)
            .style('font', '0.8em Montserrat, sans-serif');
    };
    XAxis.prototype.update = function (data) {
        var _this = this;
        var propertyX = this.config.get('propertyX');
        var xAxisType = this.config.get('xAxisType');
        if (xAxisType === 'linear') {
            var min$$1 = d3.min(data, function (d) { return d[propertyX]; }), max$$1 = d3.max(data, function (d) { return d[propertyX]; });
            this.updateDomainByMinMax(min$$1, max$$1);
        }
        else if (xAxisType === 'time') {
            var min$$1 = d3.min(data, function (d) { return (d[propertyX] || d[_this.config.get('propertyStart')]); }), max$$1 = d3.max(data, function (d) { return (d[propertyX] || d[_this.config.get('propertyEnd')]); });
            this.updateDomainByMinMax(min$$1, max$$1);
        }
        else {
            var keys = d3.map(data, function (d) { return d[propertyX]; }).keys();
            this.updateDomainByKeys(keys);
        }
        this.transition();
    };
    XAxis.prototype.updateDomainByKeys = function (keys) {
        this._xAxis.scale().domain(keys);
    };
    XAxis.prototype.updateDomainByMinMax = function (min$$1, max$$1) {
        this._xAxis.scale().domain([min$$1, max$$1]);
    };
    XAxis.prototype.transition = function (time) {
        if (time === void 0) { time = 200; }
        this.svg.selectAll('.x.axis').transition().duration(time).call(this._xAxis);
        this.svg.select('.x.axis path').raise();
    };
    XAxis.prototype.initializeXAxis = function (width, height, xAxisFormat, xAxisType, xAxisGrid) {
        switch (xAxisType) {
            case 'time':
                this._xAxis = d3.axisBottom(d3.scaleTime().range([0, width]));
                break;
            case 'linear':
                this._xAxis = d3.axisBottom(d3.scaleLinear().range([0, width]))
                    .tickFormat(d3.format(xAxisFormat));
                break;
            case 'categorical':
                this._xAxis = d3.axisBottom(d3.scaleBand().rangeRound([0, width])
                    .padding(0.1).align(0.5));
                break;
            default:
                throw new Error('Not allowed type for XAxis. Only allowed "time",  "linear" or "categorical". Got: ' + xAxisType);
        }
        if (xAxisGrid) {
            this._xAxis
                .tickSizeInner(-height)
                .tickPadding(9);
        }
    };
    Object.defineProperty(XAxis.prototype, "xAxis", {
        get: function () {
            return this._xAxis;
        },
        enumerable: true,
        configurable: true
    });
    return XAxis;
}(Component));

var Globals = (function () {
    function Globals() {
    }
    return Globals;
}());
Globals.COMPONENT_TRANSITION_TIME = 100;
Globals.COMPONENT_HIDE_SHOW_TRANSITION_TIME = 300;
Globals.COMPONENT_HIDE_OPACITY = 0.06;
Globals.COMPONENT_DATA_KEY_ATTRIBUTE = 'data-proteic-key';
Globals.LEGEND_DATA_KEY_ATTRIBUTE = 'data-proteic-legend-key';
Globals.LEGEND_HIDE_OPACITY = 0.3;
Globals.BREAKPOINT = 768;
Globals.ASPECT_RATIO = 0.7;
Globals.LOADING_ICON = 'data:image/gif;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

function simple2stacked(data) {
    return d3.nest().key(function (d) { return d.x; }).rollup(function (array) {
        var r = {};
        for (var i = 0; i < array.length; i++) {
            var object = array[i];
            if (object) {
                r[object.key] = object.y;
            }
        }
        return r;
    }).entries(data);
}
function simple2nested(data, key) {
    if (key === void 0) { key = 'key'; }
    return d3.nest().key(function (d) { return d[key]; }).entries(data);
}

function simple2Linked(data) {
    var linkedData = { links: [], nodes: [] };
    data.map(function (d) { return d.class === 'link' ? linkedData.links.push(d) : linkedData.nodes.push(d); });
    return linkedData;
}
function convertPropretiesToTimeFormat(data, properties, format$$1) {
    data.forEach(function (d) {
        properties.map(function (p) {
            d[p] = d3.timeParse(format$$1)(d[p]);
        });
    });
}
function convertByXYFormat(data, xAxisFormat, xAxisType, yAxisFormat, yAxisType) {
    data.forEach(function (d) {
        switch (xAxisType) {
            case 'time':
                d.x = d3.timeParse(xAxisFormat)(d.x);
                break;
            case 'linear':
                d.x = +d.x;
                break;
        }
        switch (yAxisType) {
            case 'time':
                d.y = d3.timeParse(yAxisFormat)(d.y);
                break;
            case 'linear':
                d.y = +d.y;
                break;
        }
    });
    return data;
}

var YAxis = (function (_super) {
    __extends(YAxis, _super);
    function YAxis(orient) {
        var _this = _super.call(this) || this;
        _this._orient = 'left';
        _this.selection = null;
        if (orient != null) {
            _this._orient = orient;
        }
        return _this;
    }
    Object.defineProperty(YAxis.prototype, "orient", {
        get: function () {
            return this._orient;
        },
        enumerable: true,
        configurable: true
    });
    YAxis.prototype.render = function () {
        var width = this.config.get('width'), height = this.config.get('height'), yAxisFormat = this.config.get('yAxisFormat'), yAxisType = this.config.get('yAxisType'), yAxisLabel = this.config.get('yAxisLabel'), yAxisGrid = this.config.get('yAxisGrid');
        this.initializeYAxis(width, height, yAxisFormat, yAxisType, yAxisGrid);
        var yAxisG = this.svg
            .append('g')
            .attr('class', 'y axis')
            .attr("transform", this.orient === 'left'
            ? "translate( 0, 0 )"
            : "translate( " + width + ", 0 )")
            .call(this._yAxis);
        this.svg
            .append('text')
            .attr('class', 'yaxis-title')
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .attr('x', 0 - height / 2)
            .attr('y', 0 - 55)
            .text(yAxisLabel)
            .style('font', '0.8em Montserrat, sans-serif');
        this.selection = yAxisG;
    };
    YAxis.prototype.update = function (data) {
        var propertyKey = this.config.get('propertyKey');
        var propertyY = this.config.get('propertyY');
        var yAxisType = this.config.get('yAxisType'), yAxisShow = this.config.get('yAxisShow'), layoutStacked = this.config.get('stacked');
        this.selection.attr('opacity', yAxisShow ? 1 : 0);
        if (yAxisType === 'linear') {
            if (layoutStacked) {
                var keys = d3.map(data, function (d) { return d[propertyKey]; }).keys();
                var stack_1 = this.config.get('stack');
                var stackedData = stack_1.keys(keys)(simple2stacked(data));
                var min$$1 = d3.min(stackedData, function (serie) { return d3.min(serie, function (d) { return d[0]; }); });
                var max$$1 = d3.max(stackedData, function (serie) { return d3.max(serie, function (d) { return d[1]; }); });
                this.updateDomainByMinMax(min$$1, max$$1);
            }
            else {
                var min$$1 = d3.min(data, function (d) { return d[propertyY]; }), max$$1 = d3.max(data, function (d) { return d[propertyY]; });
                this.updateDomainByMinMax(min$$1, max$$1);
            }
        }
        else if (yAxisType === 'categorical') {
            var keys = d3.map(data, function (d) { return d[propertyKey]; }).keys().sort();
            this._yAxis.scale().domain(keys);
        }
        else {
            console.warn('could not recognize y axis type', yAxisType);
        }
        if (data !== null && data.length) {
            this.transition();
        }
    };
    YAxis.prototype.updateDomainByMinMax = function (min$$1, max$$1) {
        this._yAxis.scale().domain([min$$1, max$$1]);
    };
    YAxis.prototype.transition = function (time) {
        if (time === void 0) { time = 200; }
        this.selection.transition().duration(Globals.COMPONENT_TRANSITION_TIME).call(this._yAxis);
        this.svg.selectAll('.y.axis path').raise();
    };
    YAxis.prototype.initializeYAxis = function (width, height, yAxisFormat, yAxisType, yAxisGrid) {
        switch (yAxisType) {
            case 'linear':
                this._yAxis = (this.orient === 'left')
                    ? d3.axisLeft(d3.scaleLinear().range([height, 0])).tickFormat(d3.format(yAxisFormat))
                    : d3.axisRight(d3.scaleLinear().range([height, 0])).tickFormat(d3.format(yAxisFormat));
                break;
            case 'categorical':
                this._yAxis = (this.orient === 'left')
                    ? d3.axisLeft(d3.scaleBand().rangeRound([height, 0]).padding(0.1).align(0.5))
                    : d3.axisRight(d3.scaleBand().rangeRound([height, 0]).padding(0.1).align(0.5));
                break;
            default:
                throw new Error('Not allowed type for YAxis. Only allowed "time",  "linear" or "categorical". Got: ' + yAxisType);
        }
        if (yAxisGrid && this.orient === 'left') {
            this._yAxis
                .tickSizeInner(-width)
                .tickSizeOuter(0)
                .tickPadding(20);
        }
    };
    Object.defineProperty(YAxis.prototype, "yAxis", {
        get: function () {
            return this._yAxis;
        },
        enumerable: true,
        configurable: true
    });
    return YAxis;
}(Component));

var XYAxis = (function (_super) {
    __extends(XYAxis, _super);
    function XYAxis() {
        var _this = _super.call(this) || this;
        _this._x = new XAxis();
        _this._y = new YAxis();
        return _this;
    }
    XYAxis.prototype.render = function () {
        this._y.render();
        this._x.render();
    };
    XYAxis.prototype.update = function (data) {
        this._y.update(data);
        this._x.update(data);
    };
    XYAxis.prototype.configure = function (config, svg) {
        _super.prototype.configure.call(this, config, svg);
        this._y.configure(config, svg);
        this._x.configure(config, svg);
    };
    Object.defineProperty(XYAxis.prototype, "x", {
        get: function () {
            return this._x;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(XYAxis.prototype, "y", {
        get: function () {
            return this._y;
        },
        enumerable: true,
        configurable: true
    });
    return XYAxis;
}(Component));

var Lineset = (function (_super) {
    __extends(Lineset, _super);
    function Lineset(x, y) {
        var _this = _super.call(this) || this;
        _this.x = x;
        _this.y = y;
        return _this;
    }
    Lineset.prototype.render = function () {
        var _this = this;
        var propertyX = this.config.get('propertyX');
        var propertyY = this.config.get('propertyY');
        var curve = this.config.get('curve');
        this.lineGenerator = d3.line()
            .curve(curve)
            .x(function (d) { return _this.x.xAxis.scale()(d[propertyX]); })
            .y(function (d) { return _this.y.yAxis.scale()(d[propertyY]); });
    };
    Lineset.prototype.update = function (data) {
        var _this = this;
        var propertyKey = this.config.get('propertyKey');
        var dataSeries = d3.nest().key(function (d) { return d[propertyKey]; }).entries(data);
        var series = this.svg.selectAll('g.lineSeries');
        var colorScale = this.config.get('colorScale');
        var lines = series.data(dataSeries, function (d) { return d[propertyKey]; })
            .enter()
            .append('g')
            .attr('class', 'lineSeries')
            .attr(Globals.COMPONENT_DATA_KEY_ATTRIBUTE, function (d) { return d[propertyKey]; })
            .attr('stroke', function (d) { return colorScale(d[propertyKey]); })
            .append('svg:path')
            .style('stroke', function (d) { return colorScale(d[propertyKey]); })
            .style('stroke-width', 1.9)
            .style('fill', 'none')
            .attr('d', function (d) { return _this.lineGenerator(d.values); })
            .attr('class', 'line');
        this.svg.selectAll('.line')
            .data(dataSeries, function (d) { return d[propertyKey]; })
            .attr('d', function (d) { return _this.lineGenerator(d.values); })
            .transition()
            .duration(Globals.COMPONENT_TRANSITION_TIME)
            .ease(d3.easeLinear);
    };
    return Lineset;
}(Component));

var Pointset = (function (_super) {
    __extends(Pointset, _super);
    function Pointset(x, y) {
        var _this = _super.call(this) || this;
        _this.x = x;
        _this.y = y;
        return _this;
    }
    Pointset.prototype.render = function () {
    };
    Pointset.prototype.update = function (data) {
        var _this = this;
        var propertyKey = this.config.get('propertyKey');
        var propertyX = this.config.get('propertyX');
        var propertyY = this.config.get('propertyY');
        var dataSeries = d3.nest()
            .key(function (d) { return d[propertyKey]; })
            .entries(data), markers = null, markerShape = this.config.get('markerShape'), markerSize = this.config.get('markerSize'), markerOutlineWidth = this.config.get('markerOutlineWidth'), colorScale = this.config.get('colorScale'), points = null, series = null;
        var shape = d3.symbol().size(markerSize);
        series = this.svg.selectAll('g.points');
        switch (markerShape) {
            case 'dot':
                shape.type(d3.symbolCircle);
                break;
            case 'ring':
                shape.type(d3.symbolCircle);
                break;
            case 'cross':
                shape.type(d3.symbolCross);
                break;
            case 'diamond':
                shape.type(d3.symbolDiamond);
                break;
            case 'square':
                shape.type(d3.symbolSquare);
                break;
            case 'star':
                shape.type(d3.symbolStar);
                break;
            case 'triangle':
                shape.type(d3.symbolTriangle);
                break;
            case 'wye':
                shape.type(d3.symbolWye);
                break;
            case 'circle':
                shape.type(d3.symbolCircle);
                break;
            default:
                shape.type(d3.symbolCircle);
        }
        points = series
            .data(dataSeries, function (d) { return d.values; }, function (d) { return d[propertyX]; });
        points.enter()
            .append('g')
            .attr('class', 'points')
            .attr(Globals.COMPONENT_DATA_KEY_ATTRIBUTE, function (d) { return d[propertyKey]; })
            .style('stroke', function (d) { return colorScale(d[propertyKey]); })
            .selectAll('circle')
            .data(function (d) { return d.values; })
            .enter()
            .append('path')
            .attr('class', 'marker')
            .attr('d', shape)
            .style('stroke', function (d) { return colorScale(d[propertyKey]); })
            .style('fill', function (d) { return markerShape !== 'ring' ? colorScale(d[propertyKey]) : 'transparent'; })
            .attr('transform', function (d) { return "translate(" + _this.x.xAxis.scale()(d[propertyX]) + ", " + _this.y.yAxis.scale()(d[propertyY]) + ")"; });
        this.svg.selectAll('.marker')
            .transition()
            .duration(Globals.COMPONENT_TRANSITION_TIME)
            .ease(d3.easeLinear)
            .attr('transform', function (d) { return "translate(" + _this.x.xAxis.scale()(d[propertyX]) + ", " + _this.y.yAxis.scale()(d[propertyY]) + ")"; });
        points
            .exit()
            .remove();
        markers = this.svg.selectAll('.marker');
        markers
            .on('mousedown.user', this.config.get('onDown'))
            .on('mouseup.user', this.config.get('onUp'))
            .on('mouseleave.user', this.config.get('onLeave'))
            .on('mouseover.user', this.config.get('onHover'))
            .on('click.user', this.config.get('onClick'));
    };
    return Pointset;
}(Component));

var Areaset = (function (_super) {
    __extends(Areaset, _super);
    function Areaset(x, y) {
        var _this = _super.call(this) || this;
        _this.x = x;
        _this.y = y;
        return _this;
    }
    Areaset.prototype.render = function () {
        var _this = this;
        var height = this.config.get('height'), propertyX = this.config.get('propertyX'), propertyY = this.config.get('propertyY'), curve = this.config.get('curve');
        this.areaGenerator = d3.area()
            .curve(curve)
            .x(function (d) { return _this.x.xAxis.scale()(d[propertyX]); })
            .y0(height)
            .y1(function (d) { return _this.y.yAxis.scale()(d[propertyY]); });
    };
    Areaset.prototype.update = function (data) {
        var _this = this;
        var propertyKey = this.config.get('propertyKey');
        var dataSeries = d3.nest().key(function (d) { return d[propertyKey]; }).entries(data);
        var areas = this.svg.selectAll('g.area');
        var colorScale = this.config.get('colorScale');
        var height = this.config.get('height');
        var areaOpacity = this.config.get('areaOpacity');
        areas = areas.data(dataSeries, function (d) { return d[propertyKey]; })
            .enter()
            .append('g')
            .attr('class', 'area')
            .attr(Globals.COMPONENT_DATA_KEY_ATTRIBUTE, function (d) { return d[propertyKey]; })
            .append('svg:path')
            .style('fill', function (d) { return colorScale(d[propertyKey]); })
            .style('fill-opacity', areaOpacity)
            .attr('d', function (d) { return _this.areaGenerator(d.values); })
            .attr('class', 'areaPath');
        this.svg.selectAll('.areaPath')
            .data(dataSeries, function (d) { return d[propertyKey]; })
            .transition()
            .duration(Globals.COMPONENT_TRANSITION_TIME)
            .attr('d', function (d) { return _this.areaGenerator(d.values); });
    };
    return Areaset;
}(Component));

var Legend = (function (_super) {
    __extends(Legend, _super);
    function Legend() {
        return _super.call(this) || this;
    }
    Legend.prototype.render = function () {
    };
    Legend.prototype.update = function (data) {
        var _this = this;
        var dataSeries = d3.nest()
            .key(function (d) { return d.key; })
            .entries(data), legend = null, entries = null, colorScale = this.config.get('colorScale'), height = this.config.get('height'), width = this.config.get('width');
        if (dataSeries.length === 1 && dataSeries[0].key === 'undefined') {
            console.warn('Not showing legend, since there is a valid key');
            return;
        }
        this.svg.selectAll('g.legend').remove();
        legend = this.svg.append('g').attr('class', 'legend');
        entries = legend.selectAll('.legend-entry')
            .data(dataSeries, function (d) { return d.key; })
            .enter()
            .append('g')
            .attr('class', 'legend-entry')
            .attr(Globals.LEGEND_DATA_KEY_ATTRIBUTE, function (d) { return d.key; });
        entries.append('rect')
            .attr('x', width + 10)
            .attr('y', function (d, i) { return i * 25; })
            .attr('height', 20)
            .attr('width', 20)
            .style('fill', function (d) { return colorScale(d.key); })
            .style('stroke', function (d) { return colorScale(d.key); })
            .style('opacity', 0.8)
            .on('click.default', function (d) { return _this.toggle(d); });
        entries.append('text')
            .attr("x", width + 25 + 10)
            .attr("y", function (d, i) { return i * 25 + 7; })
            .attr("dy", "0.55em")
            .text(function (d) { return d.key; })
            .style('font', '14px Montserrat, sans-serif')
            .on('click.default', function () { return _this.toggle; });
    };
    Legend.prototype.toggle = function (d) {
        var key = d.key, element = this.svg.selectAll('*[' + Globals.COMPONENT_DATA_KEY_ATTRIBUTE + '="' + key + '"]'), colorScale = this.config.get('colorScale');
        if (!element.empty()) {
            var opacity = element.style('opacity');
            opacity = (opacity == 1) ? Globals.COMPONENT_HIDE_OPACITY : 1;
            var legendEntry = this.svg.select('.legend-entry[' + Globals.LEGEND_DATA_KEY_ATTRIBUTE + '="' + key + '"]');
            legendEntry.selectAll('rect')
                .transition()
                .duration(Globals.COMPONENT_HIDE_SHOW_TRANSITION_TIME)
                .style('fill', (opacity === 1) ? function (d) { return colorScale(d.key); } : 'transparent');
            element
                .transition()
                .duration(Globals.COMPONENT_HIDE_SHOW_TRANSITION_TIME)
                .style('opacity', opacity);
        }
    };
    return Legend;
}(Component));

var Container = (function () {
    function Container(config) {
        this.components = [];
        this.config = config;
        var selector = this.config.get('selector'), width = this.config.get('width'), height = this.config.get('height'), marginLeft = this.config.get('marginLeft'), marginRight = this.config.get('marginRight'), marginTop = this.config.get('marginTop'), marginBottom = this.config.get('marginBottom');
        width += marginLeft + marginRight;
        height += marginTop + marginBottom;
        this.initializeContainer(selector, width, height, marginLeft, marginTop);
    }
    Container.prototype.add = function (component) {
        this.components.push(component);
        component.configure(this.config, this.svg);
        component.render();
        return this;
    };
    Container.prototype.initializeContainer = function (selector, width, height, marginLeft, marginTop) {
        this.svg = d3.select(selector)
            .style('position', 'relative')
            .style('width', width + "px")
            .style('height', height + "px")
            .append('svg:svg')
            .attr('preserveAspectRatio', "xMinYMin meet")
            .attr("viewBox", "0 0 " + width + " " + height)
            .attr('width', '100%')
            .attr('class', 'proteic')
            .attr('width', width)
            .attr('height', height)
            .style('position', 'absolute')
            .append('g')
            .attr('class', 'chartContainer')
            .attr('transform', 'translate(' + marginLeft + ',' + marginTop + ')');
    };
    Container.prototype.updateComponents = function (data) {
        for (var i = 0; i < this.components.length; i++) {
            var component = this.components[i];
            component.update(data);
        }
    };
    Container.prototype.translate = function (x, y) {
        this.svg.attr('transform', "translate(" + x + ", " + y + ")");
    };
    Container.prototype.viewBox = function (w, h) {
        this.svg.attr("viewBox", "0 0 " + w + " " + h);
    };
    Container.prototype.zoom = function (z) {
        this.svg.call(d3.zoom().scaleExtent([1 / 2, 4]).on("zoom", z));
    };
    Container.prototype.addLoadingIcon = function () {
        var icon = Globals.LOADING_ICON;
        this.svg.append('image').attr('id', 'loadingIcon')
            .attr('width', '25%')
            .attr('height', '25%')
            .attr('x', '25%')
            .attr('y', '25%')
            .attr('xlink:href', icon);
    };
    Container.prototype.removeLoadingIcon = function () {
        this.svg.select('image[id="loadingIcon"]').transition().duration(200).remove();
    };
    return Container;
}());

var SvgChart = (function () {
    function SvgChart() {
    }
    SvgChart.prototype.initialize = function () {
        this.container = new Container(this.config);
    };
    SvgChart.prototype.setConfig = function (config) {
        this.config = config;
    };
    SvgChart.prototype.addLoading = function () {
        this.container.addLoadingIcon();
    };
    SvgChart.prototype.removeLoading = function () {
        this.container.removeLoadingIcon();
    };
    return SvgChart;
}());

function sortByField(array, field) {
    array.sort(function (e1, e2) {
        var a = e1[field];
        var b = e2[field];
        return (a < b) ? -1 : (a > b) ? 1 : 0;
    });
}

var SvgStrategyLinechart = (function (_super) {
    __extends(SvgStrategyLinechart, _super);
    function SvgStrategyLinechart() {
        var _this = _super.call(this) || this;
        _this.axes = new XYAxis();
        _this.lines = new Lineset(_this.axes.x, _this.axes.y);
        return _this;
    }
    SvgStrategyLinechart.prototype.draw = function (data) {
        var xAxisFormat = this.config.get('xAxisFormat'), xAxisType = this.config.get('xAxisType'), yAxisFormat = this.config.get('yAxisFormat'), yAxisType = this.config.get('yAxisType');
        convertByXYFormat(data, xAxisFormat, xAxisType, yAxisFormat, yAxisType);
        sortByField(data, 'x');
        this.container.updateComponents(data);
    };
    SvgStrategyLinechart.prototype.initialize = function () {
        _super.prototype.initialize.call(this);
        var markerSize = this.config.get('markerSize'), areaOpacity = this.config.get('areaOpacity'), legend = this.config.get('legend');
        this.container.add(this.axes).add(this.lines);
        if (areaOpacity > 0) {
            this.area = new Areaset(this.axes.x, this.axes.y);
            this.container.add(this.area);
        }
        if (markerSize > 0) {
            this.markers = new Pointset(this.axes.x, this.axes.y);
            this.container.add(this.markers);
        }
        if (legend) {
            this.legend = new Legend();
            this.container.add(this.legend);
        }
    };
    return SvgStrategyLinechart;
}(SvgChart));

var paletteCategory2 = [
    '#b6dde2',
    '#6394af',
    '#e4e9ab',
    '#8ea876',
    '#f7dce1',
    '#cc878f',
    '#fadaac',
    '#f29a83',
    '#8d7e9e'
];
var paletteCategory3 = [
    '#6b68a9',
    '#8cc590',
    '#b9487d',
    '#bfa1c5',
    '#4e6936',
    '#71bbc3',
    '#484156',
    '#ccaf44',
    '#d0553c'
];
var paletteCategory4 = [
    '#f1a30d',
    '#1d4763',
    '#84c7bc',
    '#c1212d',
    '#8fbe46',
    '#076837',
    '#563a2d',
    '#563a2d',
    '#87325d'
];
var paletteCategory5 = [
    '#f1a30d',
    '#0c3183',
    '#acd9d6',
    '#c1212d',
    '#8fbe46',
    '#076837',
    '#8a6338',
    '#8d2d84',
    '#f09bbc'
];
var paletteCategory7 = [
    '#ea671e',
    '#684592',
    '#84b92a',
    '#cd131c',
    '#3c5ba2',
    '#5baddc',
    '#ffde06',
    '#5db68b',
    '#775e47'
];
var paletteCategory8 = [
    '#ebd646',
    '#a50f38',
    '#00a096',
    '#f09bbc',
    '#065b78',
    '#72722a',
    '#005231',
    '#4d4e98',
    '#7c4d25'
];
var paletteDivergingSpectral2 = [
    '#d43d4f',
    '#df564b',
    '#eb6d45',
    '#f08e53',
    '#f8b96f',
    '#fee08b',
    '#f5f2b8',
    '#d7e5b1',
    '#b5d7aa',
    '#8ec8a3',
    '#6abda3',
    '#4fa4b5',
    '#3489be'
];

function category2() {
    return d3.scaleOrdinal().range(paletteCategory2);
}
function category3() {
    return d3.scaleOrdinal().range(paletteCategory3);
}
function category4() {
    return d3.scaleOrdinal().range(paletteCategory4);
}
function category5() {
    return d3.scaleOrdinal().range(paletteCategory5);
}

function category7() {
    return d3.scaleOrdinal().range(paletteCategory7);
}
function category8() {
    return d3.scaleOrdinal().range(paletteCategory8);
}





















function diverging_spectral2() {
    return d3.scaleQuantile().range(paletteDivergingSpectral2);
}

var Interpolation = (function () {
    function Interpolation() {
    }
    return Interpolation;
}());
Interpolation.CURVE_LINEAR = d3.curveLinear;
Interpolation.CURVE_LINEAR_CLOSED = d3.curveLinearClosed;
Interpolation.CURVE_MONOTONE_X = d3.curveMonotoneX;
Interpolation.CURVE_MONOTONE_Y = d3.curveMonotoneY;
Interpolation.CURVE_NATURAL = d3.curveNatural;
Interpolation.CURVE_STEP = d3.curveStep;
Interpolation.CURVE_STEP_AFTER = d3.curveStepAfter;
Interpolation.CURVE_STEP_BEFORE = d3.curveStepBefore;

var defaults = {
    selector: '#chart',
    colorScale: category7(),
    curve: Interpolation.CURVE_MONOTONE_X,
    areaOpacity: 0,
    xAxisType: 'linear',
    xAxisFormat: '',
    xAxisLabel: null,
    xAxisGrid: true,
    yAxisType: 'linear',
    yAxisFormat: '',
    yAxisLabel: null,
    yAxisShow: true,
    yAxisGrid: true,
    marginTop: 20,
    marginRight: 250,
    marginBottom: 130,
    marginLeft: 150,
    markerShape: 'dot',
    markerSize: 0,
    markerOutlineWidth: 2,
    width: '100%',
    height: 250,
    legend: true,
    propertyX: 'x',
    propertyY: 'y',
    propertyKey: 'key',
    onDown: function (d) {
    },
    onHover: function (d) {
    },
    onLeave: function (d) {
    },
    onClick: function (d) {
    },
    onUp: function (d) {
    },
    maxNumberOfElements: 10,
};

var Linechart = (function (_super) {
    __extends(Linechart, _super);
    function Linechart(data, userConfig) {
        if (userConfig === void 0) { userConfig = {}; }
        return _super.call(this, new SvgStrategyLinechart(), data, userConfig, defaults) || this;
    }
    Linechart.prototype.keepDrawing = function (datum) {
        var maxNumberOfElements = this.config.get('maxNumberOfElements'), numberOfElements = this.data.length, position = -1, datumType = datum.constructor;
        if (datumType === Array) {
            this.data = this.data.concat(datum);
        }
        else {
            this.data.push(datum);
        }
        if (numberOfElements > maxNumberOfElements) {
            var position_1 = numberOfElements - maxNumberOfElements;
            this.data = this.data.slice(position_1);
        }
        this.draw(copy(this.data));
    };
    return Linechart;
}(Chart));

var Barset = (function (_super) {
    __extends(Barset, _super);
    function Barset(x, y) {
        var _this = _super.call(this) || this;
        _this.x = x;
        _this.y = y;
        return _this;
    }
    Barset.prototype.render = function () {
    };
    Barset.prototype.update = function (data) {
        var bars = null, stacked = this.config.get('stacked');
        this.clean();
        if (stacked) {
            this.updateStacked(data);
        }
        else {
            this.updateGrouped(data);
        }
        bars = this.svg.selectAll('g.barSeries rect');
        bars
            .on('mousedown.user', this.config.get('onDown'))
            .on('mouseup.user', this.config.get('onUp'))
            .on('mouseleave.user', this.config.get('onLeave'))
            .on('mouseover.user', this.config.get('onHover'))
            .on('click.user', this.config.get('onClick'));
    };
    Barset.prototype.updateStacked = function (data) {
        var propertyKey = this.config.get('propertyKey');
        var keys = d3.map(data, function (d) { return d[propertyKey]; }).keys();
        var stack$$1 = this.config.get('stack');
        data = stack$$1.keys(keys)(simple2stacked(data));
        var colorScale = this.config.get('colorScale'), layer = this.svg.selectAll('.barSeries').data(data), layerEnter = layer.enter().append('g'), x = this.x.xAxis.scale(), y = this.y.yAxis.scale();
        layer.merge(layerEnter)
            .attr('class', 'barSeries')
            .attr(Globals.COMPONENT_DATA_KEY_ATTRIBUTE, function (d) { return d[propertyKey]; })
            .style('fill', function (d, i) { return d[propertyKey] !== undefined ? colorScale(d[propertyKey]) : colorScale(i); })
            .selectAll('rect')
            .data(function (d) { return d; })
            .enter().append('rect')
            .attr("x", function (d) { return x(d.data[propertyKey]); })
            .attr("y", function (d) { return y(d[1]); })
            .attr("height", function (d) { return y(d[0]) - y(d[1]); })
            .attr("width", x.bandwidth());
    };
    Barset.prototype.updateGrouped = function (data) {
        var propertyKey = this.config.get('propertyKey');
        var propertyX = this.config.get('propertyX');
        var propertyY = this.config.get('propertyY');
        var keys = d3.map(data, function (d) { return d[propertyKey]; }).keys(), colorScale = this.config.get('colorScale'), layer = null, x = this.x.xAxis.scale(), y = this.y.yAxis.scale(), xGroup = d3.scaleBand().domain(keys).range([0, x.bandwidth()]), height = this.config.get('height');
        data = simple2nested(data, 'key');
        layer = this.svg.selectAll('g.barSeries')
            .data(data, function (d) { return d.values; });
        layer.enter()
            .append('g')
            .attr('class', 'barSeries')
            .attr(Globals.COMPONENT_DATA_KEY_ATTRIBUTE, function (d) { return d[propertyKey]; })
            .selectAll('rect')
            .data(function (d) { return d.values; })
            .enter()
            .append('rect')
            .attr('transform', function (d) { return 'translate(' + x(d[propertyX]) + ')'; })
            .attr('width', xGroup.bandwidth())
            .attr("x", function (d) { return xGroup(d[propertyKey]); })
            .attr("y", function (d) { return y(d[propertyY]); })
            .attr("height", function (d) { return height - y(d[propertyY]); })
            .style('fill', function (d, i) { return d[propertyKey] !== undefined ? colorScale(d[propertyKey]) : colorScale(i); });
    };
    return Barset;
}(Component));

var SvgStrategyBarchart = (function (_super) {
    __extends(SvgStrategyBarchart, _super);
    function SvgStrategyBarchart() {
        var _this = _super.call(this) || this;
        _this.axes = new XYAxis();
        _this.bars = new Barset(_this.axes.x, _this.axes.y);
        return _this;
    }
    SvgStrategyBarchart.prototype.draw = function (data) {
        var xAxisFormat = this.config.get('xAxisFormat'), xAxisType = this.config.get('xAxisType'), yAxisFormat = this.config.get('yAxisFormat'), yAxisType = this.config.get('yAxisType');
        convertByXYFormat(data, xAxisFormat, xAxisType, yAxisFormat, yAxisType);
        sortByField(data, 'x');
        this.container.updateComponents(data);
    };
    SvgStrategyBarchart.prototype.initialize = function () {
        _super.prototype.initialize.call(this);
        var legend = this.config.get('legend');
        this.container.add(this.axes).add(this.bars);
        if (legend) {
            this.legend = new Legend();
            this.container.add(this.legend);
        }
    };
    return SvgStrategyBarchart;
}(SvgChart));

var defaults$1 = {
    selector: '#chart',
    colorScale: category5(),
    stacked: false,
    xAxisType: 'categorical',
    xAxisFormat: '',
    xAxisLabel: '',
    xAxisGrid: false,
    yAxisType: 'linear',
    yAxisFormat: '',
    yAxisLabel: '',
    yAxisShow: true,
    yAxisGrid: true,
    marginTop: 20,
    marginRight: 250,
    marginBottom: 130,
    marginLeft: 150,
    width: '100%',
    height: 350,
    legend: true,
    propertyX: 'x',
    propertyY: 'y',
    propertyKey: 'key',
    stack: d3.stack().value(function (d, k) { return d.value[k]; }),
    onDown: function (d) {
    },
    onHover: function (d) {
    },
    onLeave: function (d) {
    },
    onClick: function (d) {
    },
    onUp: function (d) {
    }
};

var Barchart = (function (_super) {
    __extends(Barchart, _super);
    function Barchart(data, userConfig) {
        if (userConfig === void 0) { userConfig = {}; }
        return _super.call(this, new SvgStrategyBarchart(), data, userConfig, defaults$1) || this;
    }
    Barchart.prototype.fire = function (event$$1, data) {
        if (event$$1 === 'transition') {
            if (data === 'grouped') {
                this.config.put('stacked', false);
            }
            else if (data === 'stacked') {
                this.config.put('stacked', true);
            }
            this.draw();
        }
    };
    Barchart.prototype.keepDrawing = function (datum) {
        var datumType = datum.constructor;
        if (datumType === Array) {
            this.data = datum;
        }
        else {
            var found = false;
            for (var i = 0; i < this.data.length; i++) {
                var d = this.data[i];
                if (d['x'] === datum['x'] && d['key'] === datum['key']) {
                    this.data[i] = datum;
                    found = true;
                    break;
                }
            }
            if (!found) {
                this.data.push(datum);
            }
        }
        this.draw(copy(this.data));
    };
    return Barchart;
}(Chart));

var Dial = (function (_super) {
    __extends(Dial, _super);
    function Dial() {
        return _super.call(this) || this;
    }
    Dial.prototype.render = function () {
        var labels = null, invertColorScale = this.config.get('invertColorScale'), colorScale = this.config.get('colorScale'), width = this.config.get('width'), height = this.config.get('height'), ringWidth = this.config.get('ringWidth'), ringMargin = this.config.get('ringMargin'), ticks = this.config.get('ticks'), minAngle = this.config.get('minAngle'), maxAngle = this.config.get('maxAngle'), minLevel = this.config.get('minLevel'), maxLevel = this.config.get('maxLevel'), labelInset = this.config.get('labelInset'), scale = d3.scaleLinear()
            .domain([minLevel, maxLevel])
            .range([0, 1]), scaleMarkers = scale.ticks(ticks), range$$1 = maxAngle - minAngle, r = ((width > height) ?
            height : width) / 2, translation = (function () { return 'translate(' + r + ',' + r + ')'; }), tickData = d3.range(ticks).map(function () { return 1 / ticks; }), arc$$1 = d3.arc()
            .innerRadius(r - ringWidth - ringMargin)
            .outerRadius(r - ringMargin)
            .startAngle(function (d, i) { return deg2rad(minAngle + ((d * i) * range$$1)); })
            .endAngle(function (d, i) { return deg2rad(minAngle + ((d * (i + 1)) * range$$1)); });
        colorScale.domain([0, 1]);
        var arcs = this.svg.append('g')
            .attr('class', 'arc')
            .attr('transform', translation);
        var arcPaths = arcs.selectAll('path')
            .data(tickData)
            .enter().append('path')
            .attr('id', function (d, i) { return 'sector-' + i; })
            .attr('d', arc$$1);
        arcPaths.attr('fill', function (d, i) { return colorScale(invertColorScale
            ? (1 - d * i)
            : (d * i)); });
        labels = this.svg.append('g')
            .attr('class', 'labels')
            .attr('transform', translation);
        labels.selectAll('text')
            .data(scaleMarkers)
            .enter().append('text')
            .attr('transform', function (d) {
            var ratio = scale(d);
            var newAngle = minAngle + (ratio * range$$1);
            return 'rotate(' + newAngle + ') translate(0,' + (labelInset - r) + ')';
        })
            .text(function (d) { return d; })
            .style('text-anchor', 'middle')
            .style('font', '18px Montserrat, sans-serif');
    };
    Dial.prototype.update = function () {
    };
    return Dial;
}(Component));

var DialNeedle = (function (_super) {
    __extends(DialNeedle, _super);
    function DialNeedle() {
        return _super.call(this) || this;
    }
    DialNeedle.prototype.render = function () {
        var labels = null, invertColorScale = this.config.get('invertColorScale'), colorScale = this.config.get('colorScale'), width = this.config.get('width'), height = this.config.get('height'), ringWidth = this.config.get('ringWidth'), ringMargin = this.config.get('ringMargin'), ticks = this.config.get('ticks'), minAngle = this.config.get('minAngle'), maxAngle = this.config.get('maxAngle'), minLevel = this.config.get('minLevel'), maxLevel = this.config.get('maxLevel'), labelInset = this.config.get('labelInset'), needleNutRadius = this.config.get('needleNutRadius'), needleLenghtRatio = this.config.get('needleLenghtRatio'), scale = d3.scaleLinear()
            .domain([minLevel, maxLevel])
            .range([0, 1]), scaleMarkers = scale.ticks(ticks), range$$1 = maxAngle - minAngle, r = ((width > height) ?
            height : width) / 2, needleLen = needleLenghtRatio * (r), translation = (function () { return 'translate(' + r + ',' + r + ')'; }), tickData = d3.range(ticks).map(function () { return 1 / ticks; }), arc$$1 = d3.arc()
            .innerRadius(r - ringWidth - ringMargin)
            .outerRadius(r - ringMargin)
            .startAngle(function (d, i) { return deg2rad(minAngle + ((d * i) * range$$1)); })
            .endAngle(function (d, i) { return deg2rad(minAngle + ((d * (i + 1)) * range$$1)); }), angleScale = d3.scaleLinear()
            .domain([minLevel, maxLevel])
            .range([90 + minAngle, 90 + maxAngle]);
        this.svg.append('path')
            .attr('class', 'needle')
            .datum(0)
            .attr('transform', function (d) { return "translate(" + r + ", " + r + ") rotate(" + (angleScale(d) - 90) + ")"; })
            .attr('d', "M " + (0 - needleNutRadius) + " " + 0 + " L " + 0 + " " + (0 - needleLen) + " L " + needleNutRadius + " " + 0)
            .style('fill', '#666666');
        this.svg.append('circle')
            .attr('class', 'needle')
            .attr('transform', translation)
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', needleNutRadius)
            .style('fill', '#666666');
    };
    DialNeedle.prototype.update = function (data) {
        var datum = data[data.length - 1], width = this.config.get('width'), height = this.config.get('height'), needleNutRadius = this.config.get('needleNutRadius'), needleLenghtRatio = this.config.get('needleLenghtRatio'), propertyValue = this.config.get('propertyValue'), minAngle = this.config.get('minAngle'), maxAngle = this.config.get('maxAngle'), minLevel = this.config.get('minLevel'), maxLevel = this.config.get('maxLevel'), r = ((width > height) ?
            height : width) / 2, needleLen = needleLenghtRatio * (r), angleScale = d3.scaleLinear()
            .domain([minLevel, maxLevel])
            .range([90 + minAngle, 90 + maxAngle]);
        this.svg.select('.needle')
            .transition()
            .attr('transform', function (d) { return "translate(" + r + ", " + r + ") rotate(" + (angleScale(datum[propertyValue]) - 90) + ")"; })
            .attr('d', "M " + (0 - needleNutRadius) + " " + 0 + " L " + 0 + " " + (0 - needleLen) + " L " + needleNutRadius + " " + 0);
    };
    return DialNeedle;
}(Component));

var TextIndicator = (function (_super) {
    __extends(TextIndicator, _super);
    function TextIndicator() {
        var _this;
        return _this;
    }
    TextIndicator.prototype.update = function (data) {
        var datum = data[data.length - 1];
        this.svg.select('.value')
            .text(datum.value);
        this.svg.select('.label')
            .text(datum.label);
    };
    TextIndicator.prototype.render = function () {
        var indicator = this.svg.append('g')
            .attr('class', 'text-indicator')
            .attr('pointer-events', 'none')
            .style('text-anchor', 'middle')
            .style('alignment-baseline', 'central');
        indicator.append('text')
            .attr('class', 'value')
            .attr('x', 0)
            .attr('y', 0)
            .attr('pointer-events', 'none')
            .text('')
            .style('text-anchor', 'middle');
        indicator.append('text')
            .attr('class', 'label')
            .attr('x', 0)
            .attr('y', 0)
            .attr('pointer-events', 'none')
            .text('')
            .style('transform', 'translate(0, 1.5em')
            .style('text-anchor', 'middle');
    };
    TextIndicator.prototype.translate = function (x, y) {
        this.svg
            .select('g.text-indicator')
            .attr('transform', "translate(" + x + ", " + y + ")");
    };
    return TextIndicator;
}(Component));

var SvgStrategyGauge = (function (_super) {
    __extends(SvgStrategyGauge, _super);
    function SvgStrategyGauge() {
        var _this = _super.call(this) || this;
        _this.dial = new Dial();
        _this.dialNeedle = new DialNeedle();
        _this.textIndicator = new TextIndicator();
        return _this;
    }
    SvgStrategyGauge.prototype.draw = function (data) {
        this.container.updateComponents(data);
    };
    SvgStrategyGauge.prototype.initialize = function () {
        _super.prototype.initialize.call(this);
        this.container.add(this.dial).add(this.dialNeedle);
        if (this.config.get('numericIndicator')) {
            var width = this.config.get('width'), height = this.config.get('height');
            var r = ((width > height) ? height : width) / 2;
            var indicatorOffset = r + 75;
            this.container.add(this.textIndicator);
            this.textIndicator.translate(r, indicatorOffset);
        }
    };
    return SvgStrategyGauge;
}(SvgChart));

var defaults$2 = {
    selector: '#chart',
    colorScale: diverging_spectral2(),
    invertColorScale: true,
    minLevel: 0,
    maxLevel: 100,
    minAngle: -90,
    maxAngle: 90,
    ringWidth: 50,
    ringMargin: 20,
    labelInset: 10,
    needleNutRadius: 25,
    needleLenghtRatio: 0.8,
    numericIndicator: true,
    label: 'km/h',
    marginTop: 20,
    marginRight: 250,
    marginBottom: 30,
    marginLeft: 50,
    width: '50%',
    height: 250,
    ticks: 10,
    propertyValue: 'value'
};

var Gauge = (function (_super) {
    __extends(Gauge, _super);
    function Gauge(data, userConfig) {
        if (userConfig === void 0) { userConfig = {}; }
        return _super.call(this, new SvgStrategyGauge(), data, userConfig, defaults$2) || this;
    }
    Gauge.prototype.keepDrawing = function (datum) {
        this.data = [datum[0]];
        _super.prototype.draw.call(this);
    };
    return Gauge;
}(Chart));

var CanvasPointset = (function (_super) {
    __extends(CanvasPointset, _super);
    function CanvasPointset(x, y) {
        var _this = _super.call(this) || this;
        _this.x = x;
        _this.y = y;
        return _this;
    }
    CanvasPointset.prototype.update = function (data) {
        var _this = this;
        var propertyKey = this.config.get('propertyKey');
        var propertyX = this.config.get('propertyX');
        var propertyY = this.config.get('propertyY');
        var markerShape = this.config.get('markerShape'), markerSize = this.config.get('markerSize'), colorScale = this.config.get('colorScale'), points = null, series = null, dataContainer = null, width = this.config.get('width'), height = this.config.get('height');
        var shape = d3.symbol()
            .size(markerSize)
            .context(this.canvasCtx);
        switch (markerShape) {
            case 'dot':
                shape.type(d3.symbolCircle);
                break;
            case 'ring':
                shape.type(d3.symbolCircle);
                break;
            case 'cross':
                shape.type(d3.symbolCross);
                break;
            case 'diamond':
                shape.type(d3.symbolDiamond);
                break;
            case 'square':
                shape.type(d3.symbolSquare);
                break;
            case 'star':
                shape.type(d3.symbolStar);
                break;
            case 'triangle':
                shape.type(d3.symbolTriangle);
                break;
            case 'wye':
                shape.type(d3.symbolWye);
                break;
            case 'circle':
                shape.type(d3.symbolCircle);
                break;
            default:
                shape.type(d3.symbolCircle);
        }
        dataContainer = this.svg.append('proteic');
        series = dataContainer.selectAll('proteic.g.points');
        this.canvasCtx.clearRect(0, 0, width, height);
        series
            .data(data, function (d) { return d[propertyKey]; })
            .enter()
            .call(function (s) {
            var self = _this;
            s.each(function (d) {
                self.canvasCtx.save();
                self.canvasCtx.translate(self.x.xAxis.scale()(d[propertyX]), self.y.yAxis.scale()(d[propertyY]));
                self.canvasCtx.beginPath();
                self.canvasCtx.strokeStyle = colorScale(d[propertyKey]);
                self.canvasCtx.fillStyle = colorScale(d[propertyKey]);
                shape();
                self.canvasCtx.closePath();
                self.canvasCtx.stroke();
                if (markerShape !== 'ring') {
                    self.canvasCtx.fill();
                }
                self.canvasCtx.restore();
            });
        });
    };
    CanvasPointset.prototype.render = function () {
        this.canvas = d3.select(this.config.get('selector')).append('canvas')
            .attr('id', 'point-set-canvas')
            .attr('width', this.config.get('width'))
            .attr('height', this.config.get('height'))
            .style('position', 'absolute')
            .style('z-index', 2)
            .style('transform', "translate(" + this.config.get('marginLeft') + "px, " + this.config.get('marginTop') + "px)");
        this.canvasCtx = this.canvas.node().getContext('2d');
    };
    return CanvasPointset;
}(Component));

var SvgStrategyScatterplot = (function (_super) {
    __extends(SvgStrategyScatterplot, _super);
    function SvgStrategyScatterplot() {
        var _this = _super.call(this) || this;
        _this.axes = new XYAxis();
        _this.markers = new Pointset(_this.axes.x, _this.axes.y);
        _this.canvasMarkers = new CanvasPointset(_this.axes.x, _this.axes.y);
        return _this;
    }
    SvgStrategyScatterplot.prototype.draw = function (data) {
        var xAxisFormat = this.config.get('xAxisFormat'), xAxisType = this.config.get('xAxisType'), yAxisFormat = this.config.get('yAxisFormat'), yAxisType = this.config.get('yAxisType');
        convertByXYFormat(data, xAxisFormat, xAxisType, yAxisFormat, yAxisType);
        sortByField(data, 'x');
        this.container.updateComponents(data);
    };
    SvgStrategyScatterplot.prototype.initialize = function () {
        _super.prototype.initialize.call(this);
        var legend = this.config.get('legend');
        this.container.add(this.axes);
        if (this.config.get('canvas')) {
            this.container.add(this.canvasMarkers);
        }
        else {
            this.container.add(this.markers);
        }
        if (legend) {
            this.legend = new Legend();
            this.container.add(this.legend);
        }
    };
    return SvgStrategyScatterplot;
}(SvgChart));

var defaults$3 = {
    selector: '#chart',
    colorScale: category7(),
    xAxisType: 'linear',
    xAxisFormat: '.1f',
    xAxisLabel: '',
    xAxisGrid: true,
    yAxisType: 'linear',
    yAxisFormat: '.1f',
    yAxisLabel: '',
    yAxisShow: true,
    yAxisGrid: true,
    marginTop: 20,
    marginRight: 250,
    marginBottom: 130,
    marginLeft: 150,
    markerShape: 'circle',
    markerSize: 15,
    width: '100%',
    height: 250,
    legend: true,
    propertyX: 'x',
    propertyY: 'y',
    propertyKey: 'key',
    onDown: function (d) {
    },
    onHover: function (d) {
    },
    onLeave: function (d) {
    },
    onClick: function (d) {
    },
    onUp: function (d) {
    },
    maxNumberOfElements: 100,
    canvas: false
};

var Scatterplot = (function (_super) {
    __extends(Scatterplot, _super);
    function Scatterplot(data, userConfig) {
        if (userConfig === void 0) { userConfig = {}; }
        return _super.call(this, new SvgStrategyScatterplot(), data, userConfig, defaults$3) || this;
    }
    Scatterplot.prototype.keepDrawing = function (datum) {
        var datumType = datum.constructor;
        if (datumType === Array) {
            if (this.data) {
                this.data = this.data.concat(datum);
            }
            else {
                this.data = datum;
            }
        }
        else {
            this.data.push(datum);
        }
        this.draw(copy(this.data));
    };
    return Scatterplot;
}(Chart));

var Streamset = (function (_super) {
    __extends(Streamset, _super);
    function Streamset(xyAxes) {
        var _this = _super.call(this) || this;
        _this.xyAxes = xyAxes;
        _this.areaGenerator = d3.area()
            .curve(d3.curveCardinal)
            .y0(function (d) { return _this.xyAxes.y.yAxis.scale()(d[0]); })
            .y1(function (d) { return _this.xyAxes.y.yAxis.scale()(d[1]); });
        return _this;
    }
    Streamset.prototype.render = function () {
    };
    Streamset.prototype.update = function (data) {
        var _this = this;
        var propertyKey = this.config.get('propertyKey');
        var propertyX = this.config.get('propertyX');
        var propertyY = this.config.get('propertyY');
        this.clean();
        var colorScale = this.config.get('colorScale'), onDown = this.config.get('onDown'), onUp = this.config.get('onUp'), onLeave = this.config.get('onLeave'), onHover = this.config.get('onHover'), onClick = this.config.get('onClick'), keys = d3.map(data, function (d) { return d[propertyKey]; }).keys(), data4stack = simple2stacked(data), stack$$1 = this.config.get('stack'), dataSeries = stack$$1(data4stack), series = null;
        this.areaGenerator.x(function (d) { return _this.xyAxes.x.xAxis.scale()((new Date(d.data[propertyKey]))); });
        series = this.svg.selectAll('.serie')
            .data(dataSeries)
            .enter()
            .append('g')
            .attr('class', 'serie')
            .style('stroke', function (d, i) { return colorScale(d[propertyKey]); })
            .attr(Globals.COMPONENT_DATA_KEY_ATTRIBUTE, function (d) { return d[propertyKey]; });
        series
            .append('path')
            .attr('class', 'layer')
            .attr('d', this.areaGenerator)
            .style('fill', function (d, i) { return colorScale(d[propertyKey]); });
        series.exit().remove();
        series
            .attr('opacity', 1)
            .on('mousedown.user', onDown)
            .on('mouseup.user', onUp)
            .on('mouseleave.user', onLeave)
            .on('mouseover.user', onHover)
            .on('click.user', onClick);
    };
    return Streamset;
}(Component));

var SvgStrategyStreamgraph = (function (_super) {
    __extends(SvgStrategyStreamgraph, _super);
    function SvgStrategyStreamgraph() {
        var _this = _super.call(this) || this;
        _this.axes = new XYAxis();
        _this.streams = new Streamset(_this.axes);
        return _this;
    }
    SvgStrategyStreamgraph.prototype.draw = function (data) {
        var xAxisFormat = this.config.get('xAxisFormat'), xAxisType = this.config.get('xAxisType'), yAxisFormat = this.config.get('yAxisFormat'), yAxisType = this.config.get('yAxisType');
        convertPropretiesToTimeFormat(data, ['x'], xAxisFormat);
        sortByField(data, 'x');
        this.container.updateComponents(data);
    };
    SvgStrategyStreamgraph.prototype.initialize = function () {
        _super.prototype.initialize.call(this);
        var markerSize = this.config.get('markerSize'), areaOpacity = this.config.get('areaOpacity'), legend = this.config.get('legend');
        this.container.add(this.axes).add(this.streams);
        if (legend) {
            this.legend = new Legend();
            this.container.add(this.legend);
        }
    };
    return SvgStrategyStreamgraph;
}(SvgChart));

var defaults$4 = {
    selector: '#chart',
    colorScale: category4(),
    xAxisType: 'time',
    xAxisFormat: '%y/%m/%d',
    xAxisLabel: '',
    xAxisGrid: true,
    yAxisType: 'linear',
    yAxisFormat: '',
    yAxisLabel: '',
    yAxisShow: false,
    yAxisGrid: false,
    marginTop: 20,
    marginRight: 250,
    marginBottom: 130,
    marginLeft: 150,
    width: '100%',
    height: 250,
    legend: true,
    propertyX: 'x',
    propertyY: 'y',
    propertyKey: 'key',
    stack: d3.stack().value(function (d, k) { return d.value[k]; }).order(d3.stackOrderInsideOut).offset(d3.stackOffsetWiggle),
    stacked: true,
    onDown: function (d) {
    },
    onHover: function (d) {
    },
    onLeave: function (d) {
    },
    onClick: function (d) {
    },
    onUp: function (d) {
    },
    maxNumberOfElements: 100,
};

var Streamgraph = (function (_super) {
    __extends(Streamgraph, _super);
    function Streamgraph(data, userConfig) {
        if (userConfig === void 0) { userConfig = {}; }
        return _super.call(this, new SvgStrategyStreamgraph(), data, userConfig, defaults$4) || this;
    }
    Streamgraph.prototype.keepDrawing = function (datum) {
        var datumType = datum.constructor;
        if (datumType === Array) {
            this.data = this.data.concat(datum);
        }
        else {
            this.data.push(datum);
        }
        this.draw(copy(this.data));
    };
    return Streamgraph;
}(Chart));

var defaults$5 = {
    selector: '#chart',
    colorScale: category2(),
    xAxisType: 'time',
    xAxisFormat: '%y/%m/%d',
    xAxisLabel: '',
    xAxisGrid: true,
    yAxisType: 'linear',
    yAxisFormat: '',
    yAxisLabel: '',
    yAxisShow: true,
    yAxisGrid: true,
    marginTop: 20,
    marginRight: 250,
    marginBottom: 130,
    marginLeft: 150,
    width: '100%',
    height: 250,
    legend: true,
    propertyX: 'x',
    propertyY: 'y',
    propertyKey: 'key',
    stacked: true,
    stack: d3.stack().value(function (d, k) { return d.value[k]; }).order(d3.stackOrderInsideOut).offset(d3.stackOffsetNone),
    onDown: function (d) {
    },
    onHover: function (d) {
    },
    onLeave: function (d) {
    },
    onClick: function (d) {
    },
    onUp: function (d) {
    },
    maxNumberOfElements: 100,
};

var StackedArea = (function (_super) {
    __extends(StackedArea, _super);
    function StackedArea(data, userConfig) {
        if (userConfig === void 0) { userConfig = {}; }
        return _super.call(this, new SvgStrategyStreamgraph(), data, userConfig, defaults$5) || this;
    }
    StackedArea.prototype.keepDrawing = function (datum) {
        var datumType = datum.constructor;
        if (datumType === Array) {
            this.data = this.data.concat(datum);
        }
        else {
            this.data.push(datum);
        }
        this.draw(copy(this.data));
    };
    return StackedArea;
}(Chart));

var Timeboxset = (function (_super) {
    __extends(Timeboxset, _super);
    function Timeboxset(xyAxes) {
        var _this = _super.call(this) || this;
        _this.xyAxes = xyAxes;
        return _this;
    }
    Timeboxset.prototype.render = function () {
    };
    Timeboxset.prototype.update = function (data) {
        var propertyKey = this.config.get('propertyKey');
        var propertyStart = this.config.get('propertyStart');
        var propertyEnd = this.config.get('propertyEnd');
        var colorScale = this.config.get('colorScale'), height = this.config.get('height'), onDown = this.config.get('onDown'), onUp = this.config.get('onUp'), onLeave = this.config.get('onLeave'), onHover = this.config.get('onHover'), onClick = this.config.get('onClick'), keys = d3.map(data, function (d) { return d[propertyKey]; }).keys(), layer = this.svg.selectAll('.serie').data(data), layerEnter = null, layerMerge = null, box = null, boxEnter = null, boxMerge = null, extLanes = null, yLanes = null, yLanesBand = d3.scaleBand().range([0, keys.length + 1]).domain(keys), x = this.xyAxes.x.xAxis.scale(), y = this.xyAxes.y.yAxis.scale();
        data = simple2nested(data);
        extLanes = d3.extent(data, function (d, i) { return i; });
        yLanes = d3.scaleLinear().domain([extLanes[0], extLanes[1] + 1]).range([0, height]);
        layer = this.svg.selectAll('.serie').data(data);
        layerEnter = layer.enter().append('g');
        layerMerge = layer.merge(layerEnter)
            .attr('class', 'serie')
            .attr(Globals.COMPONENT_DATA_KEY_ATTRIBUTE, function (d) { return d[propertyKey]; });
        box = layerMerge.selectAll('rect')
            .data(function (d) { return d.values; });
        boxEnter = box.enter().append('rect');
        boxMerge = box.merge(boxEnter)
            .attr('width', function (d) { return x(d[propertyEnd]) - x(d[propertyStart]); })
            .attr('x', function (d) { return x(d[propertyStart]); })
            .attr('y', function (d) { return y(d[propertyKey]); })
            .attr('height', function () { return 0.8 * yLanes(1); })
            .style('fill', function (d) { return colorScale(d[propertyKey]); });
        box = this.svg.selectAll('g.serie rect');
        box
            .on('mousedown.user', onDown)
            .on('mouseup.user', onUp)
            .on('mouseleave.user', onLeave)
            .on('mouseover.user', onHover)
            .on('click.user', onClick);
    };
    return Timeboxset;
}(Component));

var SvgStrategySwimlane = (function (_super) {
    __extends(SvgStrategySwimlane, _super);
    function SvgStrategySwimlane() {
        var _this = _super.call(this) || this;
        _this.axes = new XYAxis();
        _this.boxes = new Timeboxset(_this.axes);
        return _this;
    }
    SvgStrategySwimlane.prototype.draw = function (data) {
        var xAxisFormat = this.config.get('xAxisFormat');
        convertPropretiesToTimeFormat(data, ['start', 'end'], xAxisFormat);
        sortByField(data, 'start');
        this.container.updateComponents(data);
    };
    SvgStrategySwimlane.prototype.initialize = function () {
        _super.prototype.initialize.call(this);
        var markerSize = this.config.get('markerSize'), areaOpacity = this.config.get('areaOpacity'), legend = this.config.get('legend');
        this.container.add(this.axes);
        if (legend) {
            this.legend = new Legend();
            this.container.add(this.legend).add(this.boxes);
        }
    };
    return SvgStrategySwimlane;
}(SvgChart));

var defaults$6 = {
    selector: '#chart',
    colorScale: category3(),
    xAxisType: 'time',
    xAxisFormat: '%y/%m/%d',
    xAxisLabel: '',
    xAxisGrid: true,
    yAxisType: 'categorical',
    yAxisFormat: 's',
    yAxisLabel: '',
    yAxisShow: true,
    yAxisGrid: true,
    marginTop: 20,
    marginRight: 250,
    marginBottom: 30,
    marginLeft: 50,
    width: '100%',
    height: 250,
    legend: true,
    propertyStart: 'start',
    propertyEnd: 'end',
    propertyKey: 'key',
    onDown: function (d) {
    },
    onHover: function (d) {
    },
    onLeave: function (d) {
    },
    onClick: function (d) {
    },
    onUp: function (d) {
    }
};

var Swimlane = (function (_super) {
    __extends(Swimlane, _super);
    function Swimlane(data, userConfig) {
        if (userConfig === void 0) { userConfig = {}; }
        return _super.call(this, new SvgStrategySwimlane(), data, userConfig, defaults$6) || this;
    }
    Swimlane.prototype.keepDrawing = function (datum) {
        var datumType = datum.constructor;
        if (datumType === Array) {
            this.data = this.data.concat(datum);
        }
        else {
            this.data.push(datum);
        }
        this.draw(copy(this.data));
    };
    return Swimlane;
}(Chart));

var XRadialAxis = (function (_super) {
    __extends(XRadialAxis, _super);
    function XRadialAxis() {
        return _super.call(this) || this;
    }
    XRadialAxis.prototype.update = function (data) { };
    XRadialAxis.prototype.render = function () {
        this._xRadialAxis = d3.scaleLinear().range([0, 2 * Math.PI]);
    };
    Object.defineProperty(XRadialAxis.prototype, "xRadialAxis", {
        get: function () {
            return this._xRadialAxis;
        },
        enumerable: true,
        configurable: true
    });
    return XRadialAxis;
}(Component));

var YRadialAxis = (function (_super) {
    __extends(YRadialAxis, _super);
    function YRadialAxis() {
        return _super.call(this) || this;
    }
    YRadialAxis.prototype.render = function () {
        var width = this.config.get('width'), height = this.config.get('height'), radius = null;
        radius = (Math.min(width, height) / 2) - 10;
        this._yRadialAxis = d3.scaleSqrt().range([0, radius]);
    };
    
    YRadialAxis.prototype.update = function (data) { };
    
    Object.defineProperty(YRadialAxis.prototype, "yRadialAxis", {
        get: function () {
            return this._yRadialAxis;
        },
        enumerable: true,
        configurable: true
    });
    return YRadialAxis;
}(Component));

var RadialAxes = (function (_super) {
    __extends(RadialAxes, _super);
    function RadialAxes() {
        var _this = _super.call(this) || this;
        _this._x = new XRadialAxis();
        _this._y = new YRadialAxis();
        return _this;
    }
    RadialAxes.prototype.configure = function (config, svg) {
        _super.prototype.configure.call(this, config, svg);
        this._x.configure(config, svg);
        this._y.configure(config, svg);
    };
    RadialAxes.prototype.render = function () {
        this._x.render();
        this._y.render();
    };
    RadialAxes.prototype.update = function (data) {
        this._x.update(data);
        this._y.update(data);
    };
    Object.defineProperty(RadialAxes.prototype, "x", {
        get: function () {
            return this._x;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RadialAxes.prototype, "y", {
        get: function () {
            return this._y;
        },
        enumerable: true,
        configurable: true
    });
    return RadialAxes;
}(Component));

var SunburstDisk = (function (_super) {
    __extends(SunburstDisk, _super);
    function SunburstDisk(x, y) {
        var _this = _super.call(this) || this;
        _this.x = x;
        _this.y = y;
        return _this;
    }
    SunburstDisk.prototype.removePaths = function () {
        this.svg.selectAll('path').remove();
    };
    SunburstDisk.prototype.getAncestors = function (node) {
        var path = [];
        var current = node;
        while (current.parent) {
            path.unshift(current);
            current = current.parent;
        }
        return path;
    };
    SunburstDisk.prototype.update = function (data) {
        var _this = this;
        var arcGen = d3.arc()
            .startAngle(function (d) { return Math.max(0, Math.min(2 * Math.PI, _this.x.xRadialAxis(d.x0))); })
            .endAngle(function (d) { return Math.max(0, Math.min(2 * Math.PI, _this.x.xRadialAxis(d.x1))); })
            .innerRadius(function (d) { return Math.max(0, _this.y.yRadialAxis(d.y0)); })
            .outerRadius(function (d) { return Math.max(0, _this.y.yRadialAxis(d.y1)); });
        var colorScale = this.config.get('colorScale');
        this.removePaths();
        var root = d3.stratify()
            .id(function (d) { return d.id; })
            .parentId(function (d) { return d.parent; })(data);
        root.sum(function (d) { return d.value; });
        d3.partition()(root);
        var paths = this.svg.selectAll('path')
            .data(root.descendants())
            .enter().append('path')
            .attr('d', arcGen)
            .style('fill', function (d) {
            if (!d.parent) {
                return 'white';
            }
            else {
                return colorScale(d.data.label);
            }
        })
            .style('stroke', '#fff')
            .style('stroke-width', '2')
            .style('shape-rendering', 'crispEdge');
        paths
            .on('mouseover.default', function (d) {
            var ancestors = _this.getAncestors(d);
            if (ancestors.length > 0) {
                _this.svg.selectAll('path')
                    .style('opacity', 0.3);
            }
            _this.svg.selectAll('path')
                .filter(function (node) { return ancestors.indexOf(node) >= 0; })
                .style('opacity', 1);
            _this.svg.select('.text-indicator .label').text(d.data.label);
            _this.svg.select('.text-indicator .value').text(d.value);
        })
            .on('mouseout.default', function (d) {
            _this.svg.selectAll('path').style('opacity', 1);
            _this.svg.select('.text-indicator .label').style('font-weight', 'normal');
            _this.svg.select('.text-indicator .label').text('');
            _this.svg.select('.text-indicator .value').text('');
        });
        paths
            .on('mousedown.user', this.config.get('onDown'))
            .on('mouseup.user', this.config.get('onUp'))
            .on('mouseleave.user', this.config.get('onLeave'))
            .on('mouseover.user', this.config.get('onHover'))
            .on('click.user', this.config.get('onClick'));
    };
    SunburstDisk.prototype.render = function () {
    };
    return SunburstDisk;
}(Component));

var SvgStrategySunburst = (function (_super) {
    __extends(SvgStrategySunburst, _super);
    function SvgStrategySunburst() {
        var _this = _super.call(this) || this;
        _this.axes = new RadialAxes();
        _this.disk = new SunburstDisk(_this.axes.x, _this.axes.y);
        _this.textIndicator = new TextIndicator();
        return _this;
    }
    SvgStrategySunburst.prototype.draw = function (data) {
        this.container.translate(this.config.get('width') / 2, this.config.get('height') / 2);
        this.container.updateComponents(data);
    };
    SvgStrategySunburst.prototype.initialize = function () {
        _super.prototype.initialize.call(this);
        this.container
            .add(this.axes)
            .add(this.disk)
            .add(this.textIndicator);
    };
    return SvgStrategySunburst;
}(SvgChart));

var defaults$7 = {
    selector: '#chart',
    colorScale: category8(),
    marginTop: 20,
    marginRight: 20,
    marginBottom: 30,
    marginLeft: 50,
    width: '50%',
    height: 450,
    tickLabel: '',
    transitionDuration: 300,
    maxNumberOfElements: 5,
    sortData: {
        descending: false,
        prop: 'x'
    },
    onDown: function (d) {
    },
    onHover: function (d) {
    },
    onLeave: function (d) {
    },
    onClick: function (d) {
    },
    onUp: function (d) {
    }
};

var Sunburst = (function (_super) {
    __extends(Sunburst, _super);
    function Sunburst(data, userConfig) {
        if (userConfig === void 0) { userConfig = {}; }
        return _super.call(this, new SvgStrategySunburst(), data, userConfig, defaults$7) || this;
    }
    Sunburst.prototype.keepDrawing = function (datum) {
        var datumType = datum.constructor;
        if (datumType === Array) {
            if (this.data) {
                this.data = this.data.concat(datum);
            }
            else {
                this.data = datum;
            }
        }
        else {
            this.data.push(datum);
        }
        this.draw(copy(this.data));
    };
    return Sunburst;
}(Chart));

var LinkedNodeset = (function (_super) {
    __extends(LinkedNodeset, _super);
    function LinkedNodeset() {
        var _this = _super.call(this) || this;
        _this.toggle = 0;
        return _this;
    }
    LinkedNodeset.prototype.render = function () {
        var _this = this;
        var width = this.config.get('width'), height = this.config.get('height');
        this.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(function (d) { return d.id; }).distance(50))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(width / 2, height / 2));
        this.dragstarted = function (d) {
            if (!d3.event.active)
                _this.simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        };
        this.dragged = function (d) {
            d.fx = d3.event['x'];
            d.fy = d3.event['y'];
        };
        this.dragended = function (d) {
            if (!d3.event.active)
                _this.simulation.alphaTarget(1);
            d.fx = null;
            d.fy = null;
        };
    };
    LinkedNodeset.prototype.update = function (data) {
        var _this = this;
        var nodeRadius = this.config.get('nodeRadius'), colorScale = this.config.get('colorScale'), linkWeight = this.config.get('linkWeight'), nodeWeight = this.config.get('nodeWeight'), minLinkWeight = this.config.get('minLinkWeight'), maxLinkWeight = this.config.get('maxLinkWeight'), minNodeWeight = this.config.get('minNodeWeight'), maxNodeWeight = this.config.get('maxNodeWeight'), weighted = this.config.get('weighted'), linkScaleRadius = d3.scaleLinear().domain([minLinkWeight, maxLinkWeight]).range([0, 3]), nodeScaleRadius = d3.scaleLinear().domain([minNodeWeight, maxNodeWeight]).range([0, 15]), labelShow = this.config.get('labelShow'), labelField = this.config.get('labelField'), node = null, link = null, text = null;
        data = simple2Linked(data);
        this.svg.selectAll('g.links').remove();
        this.svg.selectAll('g.nodes').remove();
        this.svg.selectAll('g.labels').remove();
        link = this.svg.append('g')
            .attr('class', 'serie')
            .append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(data.links)
            .enter()
            .append("line")
            .attr(Globals.COMPONENT_DATA_KEY_ATTRIBUTE, function (d) { console.log(d); return d.key; })
            .attr("stroke-width", function (d) { return (weighted && d.weight) ? linkScaleRadius(d.weight) : linkWeight; })
            .attr("stroke", "#999")
            .attr("stroke-opacity", 1);
        node = this.svg.select('g.serie').append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(data.nodes)
            .enter()
            .append("circle")
            .attr(Globals.COMPONENT_DATA_KEY_ATTRIBUTE, function (d) { return d.key; })
            .attr("r", function (d) { return (weighted && d.weight) ? nodeScaleRadius(d.weight) : nodeWeight; })
            .attr("fill", function (d) { return colorScale(d.key); })
            .attr("stroke", "white")
            .call(d3.drag()
            .on("start", this.dragstarted)
            .on("drag", this.dragged)
            .on("end", this.dragended));
        var chart = this;
        node
            .on('mousedown.user', this.config.get('onDown'))
            .on('mouseup.user', this.config.get('onUp'))
            .on('mouseleave.user', this.config.get('onLeave'))
            .on('mouseover.user', this.config.get('onHover'))
            .on('click.user', this.config.get('onClick'));
        if (labelShow) {
            text = this.svg.select('g.serie').append("g")
                .attr("class", "labels")
                .selectAll('text')
                .data(data.nodes)
                .enter()
                .append('text')
                .attr(Globals.COMPONENT_DATA_KEY_ATTRIBUTE, function (d) { return d.key; })
                .attr('dx', 10)
                .attr('dy', '.35em')
                .attr('font-size', '.85em')
                .text(typeof labelField === 'string' ? function (d) { return d[labelField]; } : labelField)
                .on('mousedown.user', this.config.get('onDown'))
                .on('mouseup.user', this.config.get('onUp'))
                .on('mouseleave.user', this.config.get('onLeave'))
                .on('mouseover.user', this.config.get('onHover'))
                .on('click.user', this.config.get('onClick'));
        }
        this.simulation.nodes(data.nodes).on("tick", function () { return labelShow ? _this.tickedWithText(link, node, text) : _this.ticked(link, node); });
        this.simulation.force("link").links(data.links);
    };
    LinkedNodeset.prototype.tickedWithText = function (link, node, text) {
        this.ticked(link, node);
        text
            .attr('x', function (d) { return d.x; })
            .attr('y', function (d) { return d.y; });
    };
    LinkedNodeset.prototype.ticked = function (link, node) {
        link
            .attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });
        node
            .attr("cx", function (d) { return d.x; })
            .attr("cy", function (d) { return d.y; });
    };
    LinkedNodeset.prototype.zoom = function (event$$1) {
        var transform = event$$1.transform;
        this.svg.selectAll('.nodes circle').attr('transform', transform);
        this.svg.selectAll('.links line').attr('transform', transform);
        this.svg.selectAll('.labels text').attr('transform', transform);
    };
    return LinkedNodeset;
}(Component));

var ZoomComponent = (function (_super) {
    __extends(ZoomComponent, _super);
    function ZoomComponent(zoomerComponent) {
        var _this = _super.call(this) || this;
        _this.zoomerComponent = zoomerComponent;
        _this.zoom = d3.zoom().scaleExtent([1 / 2, 4]);
        return _this;
    }
    ZoomComponent.prototype.render = function () {
        var _this = this;
        var selector = this.config.get('selector');
        d3.select(selector).call(this.zoom);
        this.zoom.on('zoom', function () {
            _this.zoomerComponent.zoom(d3.event);
        });
    };
    ZoomComponent.prototype.update = function (data) {
    };
    return ZoomComponent;
}(Component));

var SvgStrategyNetwork = (function (_super) {
    __extends(SvgStrategyNetwork, _super);
    function SvgStrategyNetwork() {
        return _super.call(this) || this;
    }
    SvgStrategyNetwork.prototype.draw = function (data) {
        this.container.updateComponents(data);
    };
    SvgStrategyNetwork.prototype.initialize = function () {
        _super.prototype.initialize.call(this);
        var legend = this.config.get('legend');
        var zoom$$1 = this.config.get('zoom');
        this.linkedNodes = new LinkedNodeset();
        this.container.add(this.linkedNodes);
        if (legend) {
            this.legend = new Legend();
            this.container.add(this.legend);
        }
        if (zoom$$1) {
            this.zoom = new ZoomComponent(this.linkedNodes);
            this.container.add(this.zoom);
        }
    };
    return SvgStrategyNetwork;
}(SvgChart));

var defaults$8 = {
    selector: '#chart',
    colorScale: category7(),
    marginTop: 20,
    marginRight: 250,
    marginBottom: 130,
    marginLeft: 150,
    width: '100%',
    height: 250,
    nodeRadius: 8.5,
    legend: true,
    linkWeight: 1,
    nodeWeight: 8,
    minLinkValue: 0,
    maxLinkValue: 10,
    minNodeWeight: 0,
    maxNodeWeight: 100,
    weighted: false,
    labelShow: true,
    labelField: 'id',
    zoom: true,
    onDown: function (d) {
    },
    onHover: function (d) {
    },
    onLeave: function (d) {
    },
    onClick: function (d) {
    },
    onUp: function (d) {
    }
};

var Network = (function (_super) {
    __extends(Network, _super);
    function Network(data, userConfig) {
        if (userConfig === void 0) { userConfig = {}; }
        return _super.call(this, new SvgStrategyNetwork(), data, userConfig, defaults$8) || this;
    }
    Network.prototype.keepDrawing = function (datum) {
        var datumType = datum.constructor;
        if (datumType === Array) {
            this.data = this.data.concat(datum);
        }
        else {
            this.data.push(datum);
        }
        this.draw(copy(this.data));
    };
    return Network;
}(Chart));

var SectorSet = (function (_super) {
    __extends(SectorSet, _super);
    function SectorSet() {
        return _super.call(this) || this;
    }
    SectorSet.prototype.render = function () {
    };
    SectorSet.prototype.update = function (data) {
        var propertyKey = this.config.get('propertyKey');
        var propertyX = this.config.get('propertyX');
        var width = this.config.get('width');
        var height = this.config.get('height');
        var radius = Math.min(width, height) / 2;
        var colorScale = this.config.get('colorScale');
        var myPie = d3.pie().value(function (d) { return d[propertyX]; })(data);
        var myArc = d3.arc().innerRadius(0).outerRadius(radius);
        var arcs = this.svg.selectAll("g.slice").data(myPie);
        var newBlock = arcs.enter();
        newBlock
            .append("g")
            .attr(Globals.COMPONENT_DATA_KEY_ATTRIBUTE, function (d) { return d.data[propertyKey]; })
            .append("path")
            .attr('fill', function (d, i) {
            return d.data[propertyKey] !== undefined ? colorScale(d.data[propertyKey]) : colorScale(i);
        })
            .attr("d", myArc);
    };
    return SectorSet;
}(Component));

var SvgStrategyPieChart = (function (_super) {
    __extends(SvgStrategyPieChart, _super);
    function SvgStrategyPieChart() {
        var _this = _super.call(this) || this;
        _this.sectors = new SectorSet();
        return _this;
    }
    SvgStrategyPieChart.prototype.draw = function (data) {
        this.container.translate(this.config.get('width') / 2, this.config.get('height') / 2);
        this.container.updateComponents(data);
    };
    SvgStrategyPieChart.prototype.initialize = function () {
        _super.prototype.initialize.call(this);
        this.container
            .add(this.sectors);
        var legend = this.config.get('legend');
        if (legend) {
            this.legend = new Legend();
            this.container.add(this.legend);
        }
    };
    return SvgStrategyPieChart;
}(SvgChart));

var defaults$9 = {
    selector: '#chart',
    colorScale: category8(),
    marginTop: 0,
    marginRight: '100',
    marginBottom: 0,
    marginLeft: 0,
    width: '500',
    height: '500',
    transitionDuration: 300,
    maxNumberOfElements: 5,
    legend: true,
    propertyX: 'x',
    propertyKey: 'key',
    sortData: {
        descending: false,
        prop: 'x'
    },
    onDown: function (d) {
    },
    onHover: function (d) {
    },
    onLeave: function (d) {
    },
    onClick: function (d) {
    },
    onUp: function (d) {
    }
};

var PieChart = (function (_super) {
    __extends(PieChart, _super);
    function PieChart(data, userConfig) {
        if (userConfig === void 0) { userConfig = {}; }
        return _super.call(this, new SvgStrategyPieChart, data, userConfig, defaults$9) || this;
    }
    PieChart.prototype.keepDrawing = function (datum) {
        var datumType = datum.constructor;
        if (datumType === Array) {
            if (this.data) {
                this.data = this.data.concat(datum);
            }
            else {
                this.data = datum;
            }
        }
        else {
            this.data.push(datum);
        }
        this.draw(copy(this.data));
    };
    return PieChart;
}(Chart));

var Datasource = (function () {
    function Datasource() {
        this.dispatcher = null;
        this.source = null;
        this.isWaitingForData = true;
    }
    Datasource.prototype.start = function () {
        window.console.log('Starting datasource');
    };
    Datasource.prototype.stop = function () {
        window.console.log('Stopping datasource');
    };
    Datasource.prototype.configure = function (dispatcher) {
        this.dispatcher = dispatcher;
    };
    Datasource.prototype.filter = function (filter) {
        return this;
    };
    return Datasource;
}());

var WebsocketDatasource = (function (_super) {
    __extends(WebsocketDatasource, _super);
    function WebsocketDatasource(source) {
        var _this = _super.call(this) || this;
        _this.source = source;
        return _this;
    }
    WebsocketDatasource.prototype.configure = function (dispatcher) {
        this.dispatcher = dispatcher;
    };
    WebsocketDatasource.prototype.start = function () {
        var _this = this;
        _super.prototype.start.call(this);
        this.ws = new WebSocket(this.source['endpoint']);
        this.dispatcher.call('addLoading', this, {});
        this.ws.onopen = function (e) {
            _this.dispatcher.call('onopen', _this, e);
        };
        this.ws.onerror = function (e) {
            throw new Error('An error occurred trying to reach the websocket server' + e);
        };
        this.ws.onmessage = function (e) {
            if (_this.isWaitingForData) {
                _this.dispatcher.call('removeLoading', _this, e);
                _this.isWaitingForData = false;
            }
            var data = JSON.parse(e.data);
            _this.dispatcher.call('onmessage', _this, data);
        };
    };
    WebsocketDatasource.prototype.stop = function () {
        _super.prototype.stop.call(this);
        if (this.ws) {
            this.ws.close();
        }
    };
    return WebsocketDatasource;
}(Datasource));

var HTTPDatasource = (function (_super) {
    __extends(HTTPDatasource, _super);
    function HTTPDatasource(source) {
        var _this = _super.call(this) || this;
        _this.source = source;
        _this.intervalId = -1;
        _this.started = false;
        return _this;
    }
    HTTPDatasource.prototype.start = function () {
        if (!this.started) {
            _super.prototype.start.call(this);
            var pollingTime = this.source.pollingTime;
            var url = this.source.url;
            this._startPolling(url, pollingTime);
            this.started = true;
        }
    };
    HTTPDatasource.prototype._startPolling = function (url, time) {
        var _this = this;
        if (time === void 0) { time = 1000; }
        var interval = window.setInterval;
        this.intervalId = interval(function () { return _this._startRequest(url); }, time);
    };
    HTTPDatasource.prototype._startRequest = function (url) {
        var _this = this;
        window.console.log('url', url);
        d3.request(url).get(function (e, response) { return _this._handleResponse(response); });
    };
    HTTPDatasource.prototype._stopPolling = function () {
        var clearInterval = window.clearInterval;
        clearInterval(this.intervalId);
    };
    HTTPDatasource.prototype._handleResponse = function (xmlHttpRequest) {
        var parseJson = window.JSON.parse;
        if (xmlHttpRequest.readyState === 4 && xmlHttpRequest.status === 200) {
            var response = parseJson(xmlHttpRequest.response);
            this._handleOK(response);
        }
        else {
            this._handleError(xmlHttpRequest);
        }
    };
    HTTPDatasource.prototype._handleOK = function (data) {
        if (this.properties.length > 0) {
            data = this.convert(data);
        }
        this.dispatcher.call('onmessage', this, data);
    };
    HTTPDatasource.prototype._handleError = function (data) {
        this.dispatcher.call('onerror', this, data);
    };
    HTTPDatasource.prototype.stop = function () {
        if (this.started) {
            this._stopPolling();
            this.started = false;
        }
    };
    return HTTPDatasource;
}(Datasource));

exports.Linechart = Linechart;
exports.Barchart = Barchart;
exports.Gauge = Gauge;
exports.Scatterplot = Scatterplot;
exports.Streamgraph = Streamgraph;
exports.StackedArea = StackedArea;
exports.Swimlane = Swimlane;
exports.Sunburst = Sunburst;
exports.Network = Network;
exports.PieChart = PieChart;
exports.WebsocketDatasource = WebsocketDatasource;
exports.HTTPDatasource = HTTPDatasource;
exports.Globals = Globals;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=proteic.js.map
