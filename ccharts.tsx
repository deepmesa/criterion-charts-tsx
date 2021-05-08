import React, { PureComponent, CSSProperties } from 'react';
import { Area, ComposedChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceArea, ReferenceLine, Label } from 'recharts';

export enum PlotName {
    MeanTimePerIter,
    LinearRegression,
    ProbabilityDensity,
}

export enum TimeUnit {
    s,
    ms,
    ns,
    ps,
}

export interface TimeUnits {
    display: TimeUnit,
    data: TimeUnit
}

interface Dot {
    size?: number,
    stroke?: string,
    fill?: string,
}

interface TrendLine {
    stroke?: string,
    strokeWidth?: number,
}

export interface StatsInfo {
    mean: number,
    stdDev: number,
}

export interface SeriesInfo {
    yIndex: string,
    tyIndex: string,
    dyIndex: string,
}

interface Series {
    name: string,
    dot?: Dot,
    activeDot?: Dot
    stroke?: string,
    strokeWidth?: number,
    trendLine?: TrendLine,
    areaFill?: string,
    mean?: Mean,
    renderMean?: boolean,
}

interface PlotLabel {
    value?: string,
    color?: string,
}

export interface Mean {
    stroke?: string,
    strokeWidth?: number
}

export interface Range {
    min: number,
    max: number,
}

export interface CriterionPlotProps {
    group: string,
    style?: CSSProperties
    className?: string,
    legend?: LegendStyle,
    series: Series[],
    xLabel?: PlotLabel,
    yLabel?: PlotLabel,
    yRightLabel?: PlotLabel,
    timeUnit?: TimeUnit,
    iterMultiplier?: number,
    xrange?: Range,
}

export type StatsInfoMap = Map<string, Map<string, StatsInfo>>;
export type SeriesInfoMap = Map<string, Map<string, SeriesInfo>>;
export type UnitsMap = Map<string, TimeUnit>;
export type DataMap = Map<string, DataPoint[]>;

interface CriterionChartProps extends CriterionPlotProps {
    dataMap: DataMap,
    seriesInfoMap: SeriesInfoMap,
    statsInfoMap?: StatsInfoMap,
    unitsMap: UnitsMap,
}

export enum LegendPosition {
    Top,
    Bottom,
    Left,
    Right
}

export interface LegendStyle {
    pos: LegendPosition,
    style?: CSSProperties,
}

export interface DataPoint {
    i: number,
    x: number,
    [y: string]: number,
}

interface ChartMargin {
    top: number,
    right: number,
    left: number,
    bottom: number
}

interface LineChartProps {
    data: DataPoint[],
    width: number,
    height: number
    margin: ChartMargin
    xDataKey: string,
    children: any,
    series: string[],
    legend: LegendStyle,
    xLabelValue?: string,
    xLabelColor?: string,
    yLabelValue?: string,
    yLabelColor?: string,
    yRightLabelColor?: string,
    yRightLabelValue?: string,
    timeUnits: TimeUnits,
    iterMultiplier?: number,
    hasRightAxis: boolean,
    invertRescale?: boolean
    xmin: string | number,
    xmax: string | number,
}

interface LineChartState {
    data: DataPoint[],
    selectStart: number,
    selectEnd: number,
    left: string | number,
    right: string | number,
    refAreaLeft: string | number,
    refAreaRight: string | number,
    top: string | number,
    bottom: string | number,
    animation: boolean,
    xmin: string | number,
    xmax: string | number,
}

const TIME_UNIT_CONVERT: number[][] = [
    /* s,  ms, ns, ps */
    /*  s   */[1, 1000, 1000000000, 1000000000000],
    /*  ms  */[0.001, 1, 1000000, 1000000000],
    /*  ns  */[0.000000001, 0.000001, 1, 1000000],
    /*  ps  */[0.000000000001, 0.000000001, 0.000001, 1]
];

const RECHARTS_DATAMIN: string = 'dataMin';
const RECHARTS_DATAMAX: string = 'dataMax';
const SELECTION_BOUNDARY_UNSET: number = -1;
const REFERENCE_AREA_BOUNDARY_UNSET: string = '';

class CriterionLineChart extends PureComponent<LineChartProps, LineChartState> {
    constructor(props: LineChartProps) {
        super(props);
        let [xmin, xmax] = this.rescaleXRange(this.props.xmin, this.props.xmax, this.props.iterMultiplier);
        this.state = {
            data: this.rescaleData(this.props.data, this.props.timeUnits, this.props.iterMultiplier),
            selectStart: SELECTION_BOUNDARY_UNSET,
            selectEnd: SELECTION_BOUNDARY_UNSET,
            xmin: xmin,
            xmax: xmax,
            left: xmin,
            right: xmax,
            refAreaLeft: REFERENCE_AREA_BOUNDARY_UNSET,
            refAreaRight: REFERENCE_AREA_BOUNDARY_UNSET,
            top: RECHARTS_DATAMAX,
            bottom: RECHARTS_DATAMIN,
            animation: true,
        };
    }

    static defaultProps = {
        data: null,
        width: 500,
        height: 300,
        margin: {
            top: 5,
            right: 20,
            left: 20,
            bottom: 20,
        },
        xDataKey: "x",
        series: ['y0'],
        xmin: RECHARTS_DATAMIN,
        xmax: RECHARTS_DATAMAX,
        hasRightAxis: false,
        invertRescale: false,
        legend: {
            pos: LegendPosition.Right,
            style: { paddingLeft: '10px' },
        }
    }

    rescaleXRange = (xmin: number | string, xmax: number | string, iterMultiplier = 1) => {
        if (this.props.invertRescale) {
            return [xmin, xmax];
        }
        if (iterMultiplier === 1) {
            return [xmin, xmax];
        }
        if (typeof xmin === "number") {
            xmin = xmin / iterMultiplier;
        }
        if (typeof xmax === "number") {
            xmax = xmax / iterMultiplier;
        }
        return [xmin, xmax];
    }

    getZoomBoundary = (data: DataPoint[],
        series: string[],
        selectStart: number,
        selectEnd: number): {
            left: number;
            right: number;
            top: number;
            bottom: number
        } | null => {
        if (selectStart === selectEnd || selectEnd === SELECTION_BOUNDARY_UNSET) {
            return null;
        }

        if (selectStart > selectEnd) {
            [selectStart, selectEnd] = [selectEnd, selectStart];
        }

        const selectedData = data.slice(selectStart, selectEnd);
        let startYIndex = series[0];

        let bottom: number = selectedData[0][startYIndex];
        let top: number = bottom;

        selectedData.forEach((d: DataPoint) => {
            for (let i = 0; i < series.length; i++) {
                let idx: string = series[i];
                if (d[idx]) {
                    if (!top || d[idx] > top) {
                        top = d[idx];
                    }
                    if (!bottom || d[idx] < bottom) {
                        bottom = d[idx];
                    }
                }
            }
        });

        if (bottom === top) {
            bottom -= 0.1;
            top += 0.1;
        }
        return {
            left: data[selectStart].x,
            right: data[selectEnd].x,
            top: top,
            bottom: bottom
        }
    }

    zoom = () => {
        let zoomBoundary = this.getZoomBoundary(this.state.data,
            this.props.series,
            this.state.selectStart,
            this.state.selectEnd);

        if (zoomBoundary === null) {
            this.setState((prevState) => ({
                refAreaLeft: REFERENCE_AREA_BOUNDARY_UNSET,
                refAreaRight: REFERENCE_AREA_BOUNDARY_UNSET,
                left: prevState.xmin,
                right: prevState.xmax,
                bottom: RECHARTS_DATAMIN,
                top: RECHARTS_DATAMAX,
                selectStart: SELECTION_BOUNDARY_UNSET,
                selectEnd: SELECTION_BOUNDARY_UNSET
            }));
            return;
        }
        this.setState({
            refAreaLeft: REFERENCE_AREA_BOUNDARY_UNSET,
            refAreaRight: REFERENCE_AREA_BOUNDARY_UNSET,
            left: zoomBoundary.left,
            right: zoomBoundary.right,
            top: zoomBoundary.top,
            bottom: zoomBoundary.bottom,
            selectStart: SELECTION_BOUNDARY_UNSET,
            selectEnd: SELECTION_BOUNDARY_UNSET,
        });
    }

    getEventPayload = (e: any): any | null => {
        if (!e || !e.activePayload) {
            return;
        }
        if (e.activePayload.length == 0) {
            return;
        }

        let payload = e.activePayload[0].payload;
        if (!payload) {
            return;
        }
        return payload;
    }

    onMouseDown = (e: any) => {
        let payload = this.getEventPayload(e);
        if (!payload) {
            return;
        }
        let selectStart = payload.i;
        if (!selectStart) {
            return;
        }
        let refAreaLeft = this.state.data[selectStart].x;
        this.setState({
            selectStart: selectStart,
            refAreaLeft: refAreaLeft
        });
    }

    onMouseMove = (e: any) => {
        let payload = this.getEventPayload(e);
        if (!payload) {
            return;
        }
        let selectEnd = payload.i;
        if (!selectEnd) {
            return;
        }
        let refAreaRight = this.state.data[selectEnd].x;

        this.state.refAreaLeft && this.setState({
            selectEnd: selectEnd,
            refAreaRight: refAreaRight
        });
    }

    renderLegend() {
        switch (this.props.legend.pos) {
            case LegendPosition.Right: {
                return (
                    <Legend layout="vertical" verticalAlign="top" align="right" wrapperStyle={this.props.legend.style} />
                );
            }
            case LegendPosition.Left: {
                return (
                    <Legend layout="vertical" verticalAlign="top" align="left" wrapperStyle={this.props.legend.style} />
                );
            }
            case LegendPosition.Bottom: {
                return (
                    <Legend verticalAlign="bottom" layout="horizontal" wrapperStyle={this.props.legend.style} />
                );
            }
            case LegendPosition.Top: {
                return (
                    <Legend verticalAlign="top" layout="horizontal" wrapperStyle={this.props.legend.style} />
                );
            }
        }
    }

    convertTimeUnit = (val: number, unitFrom: TimeUnit, unitTo: TimeUnit) => {
        if (unitFrom === unitTo) {
            return val;
        }
        let multiplier = TIME_UNIT_CONVERT[unitFrom][unitTo];
        return val * multiplier;
    }

    rescaleData = (data: DataPoint[], timeUnits: TimeUnits, iterMultiplier: number = 1) => {
        if (iterMultiplier === 1 && timeUnits?.data === timeUnits?.display) {
            return data;
        }

        let rescaledData: DataPoint[] = new Array();
        data.forEach((entry: DataPoint) => {
            let { i, x, ...rest } = entry;
            for (const key in rest) {
                if (this.props.invertRescale && !key.startsWith('d')) {
                    rest[key] = rest[key] / iterMultiplier;
                } else if (timeUnits && timeUnits.data !== timeUnits.display) {
                    rest[key] = this.convertTimeUnit(rest[key], timeUnits.data, timeUnits.display);
                }
            }

            if (this.props.invertRescale) {
                x = this.convertTimeUnit(x, timeUnits.data, timeUnits?.display);
            } else {
                x = x / iterMultiplier;
            }
            rescaledData.push({
                i: i,
                x: x,
                ...rest
            });
        });
        return rescaledData;
    }

    formatXTick = (value: any) => {
        if (value < 1) {
            return value;
        }
        return (Math.round(value * 100) / 100).toFixed(2);
    }

    render() {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    width={this.props.width}
                    height={this.props.height}
                    data={this.state.data}
                    margin={this.props.margin}
                    onMouseDown={this.onMouseDown}
                    onMouseMove={this.onMouseMove}
                    onMouseUp={this.zoom}
                >
                    <XAxis allowDataOverflow tickFormatter={this.formatXTick} dataKey={this.props.xDataKey} domain={[this.state.left, this.state.right]} type="number">
                        {this.props.xLabelValue ?
                            <Label position="bottom" fill={this.props.xLabelColor}>
                                {this.props.xLabelValue}
                            </Label>
                            : null
                        }
                    </XAxis>
                    <YAxis yAxisId="left" allowDataOverflow scale="linear" orientation="left" domain={[this.state.bottom, this.state.top]} type="number">
                        {this.props.yLabelValue ?
                            <Label position="left" angle={-90} style={{ textAnchor: 'middle' }} fill={this.props.yLabelColor}>
                                {this.props.yLabelValue}
                            </Label>
                            : null
                        }
                    </YAxis>
                    {this.props.hasRightAxis ?
                        <YAxis yAxisId="right" allowDataOverflow scale="linear" domain={['auto', 'auto']} type="number" orientation="right" >
                            {this.props.yLabelValue ?
                                <Label position="right" angle={-90} style={{ textAnchor: 'middle' }} fill={this.props.yRightLabelColor}>
                                    {this.props.yRightLabelValue}
                                </Label>
                                : null
                            }
                        </YAxis>
                        : null
                    }
                    <Tooltip />
                    {this.renderLegend()}
                    {this.props.children}
                    {this.state.refAreaLeft && this.state.refAreaRight ? (
                        <ReferenceArea yAxisId="left" x1={this.state.refAreaLeft} x2={this.state.refAreaRight} strokeOpacity={0.3} />
                    ) : null}

                </ComposedChart>
            </ResponsiveContainer>
        );
    }
}

export const ErrorDiv = (props: { message: string }) => {
    return (
        <div style={{ width: '500px', height: '100px' }}>
            <p>{props.message}</p>
        </div>
    );
}

const renderErrorDiv = (group: string) => {
    return (
        <ErrorDiv message={'Could not find Plot Data for Criterion Group: ' + group + '. Please check the group prop in the CriterionPlot Component'} />
    );
}

const renderTrendLine = (seriesName: string, trendLine: TrendLine | undefined, yDataKey: string | null) => {
    if (!trendLine) {
        trendLine = {
            strokeWidth: 1
        }
    } else {
        if (trendLine.strokeWidth === null || trendLine.strokeWidth === undefined) {
            trendLine.strokeWidth = 1;
        }
    }
    return (
        <Line
            type="monotone"
            dataKey={yDataKey ? yDataKey : undefined}
            stroke={trendLine.stroke}
            strokeWidth={trendLine.strokeWidth}
            yAxisId="left"
            dot={false}
            name={'LR (' + seriesName + ')'}
            activeDot={false}
            animationDuration={300} />
    );
}

const renderArea = (series: Series, yDataKey: string | null, yAxisId: string = "left", defaultStrokeWidth: number = 1) => {
    if (!yDataKey) {
        return null;
    }

    if (defaultStrokeWidth === -1) {
        series.strokeWidth = 0;
    } else {
        if (!series.strokeWidth) {
            series.strokeWidth = defaultStrokeWidth;
        }
    }

    return (
        <Area
            yAxisId={yAxisId}
            type="monotone"
            dataKey={yDataKey}
            dot={false}
            name={"Density (" + series.name + ")"}
            connectNulls
            fill={series.areaFill}
            stroke={series.stroke}
            strokeWidth={series.strokeWidth}
        />
    );
}

const renderPlotLine = (series: Series, yDataKey: string | null, yAxisId: string = "left", defaultStrokeWidth: number = 1) => {
    if (!yDataKey) {
        return null;
    }

    let dotSize = 1;
    let dotStroke = undefined;
    let dotFill = 'white';
    if (series.dot) {
        dotSize = series.dot.size ? series.dot.size : 1;
        dotStroke = series.dot.stroke ? series.dot.stroke : undefined;
        dotFill = series.dot.fill ? series.dot.fill : 'white';
    }
    let activeDotSize = 2;
    let activeDotStroke = undefined;
    let activeDotFill = 'white';
    if (series.activeDot) {
        activeDotSize = series.activeDot.size ? series.activeDot.size : 2;
        activeDotStroke = series.activeDot.stroke ? series.activeDot.stroke : undefined;
        activeDotFill = series.activeDot.fill ? series.activeDot.fill : 'white';
    }

    if (defaultStrokeWidth === -1) {
        series.strokeWidth = 0;
        series.stroke = dotFill;
    } else {
        if (!series.strokeWidth) {
            series.strokeWidth = defaultStrokeWidth;
        }
    }

    return (
        <Line
            key={series.name}
            connectNulls
            yAxisId={yAxisId}
            type="monotone"
            dataKey={yDataKey}
            stroke={series.stroke}
            strokeWidth={series.strokeWidth}
            dot={{ r: dotSize, stroke: dotStroke, fill: dotFill }}
            activeDot={{ r: activeDotSize, stroke: activeDotStroke, fill: activeDotFill }}
            name={series.name}
            animationDuration={300} />
    );
}

const getTrendLineDataKey = (seriesInfoMap: SeriesInfoMap, series: Series, group: string) => {
    let groupSeriesMap = seriesInfoMap.get(group);
    if (!groupSeriesMap) {
        console.error("Invalid Trendline Group: ", group);
        return null;
    }
    let seriesNameMap = groupSeriesMap.get(series.name);
    if (!seriesNameMap) {
        console.error("Invalid Series Name: ", series.name);
        return null;
    }
    if (!seriesNameMap.tyIndex) {
        return null;
    }
    return seriesNameMap.tyIndex;
}

const getSeriesLineDataKey = (seriesInfoMap: SeriesInfoMap, series: Series, group: string, yIndexName: 'yIndex' | 'dyIndex' = 'yIndex') => {
    let groupSeriesMap = seriesInfoMap.get(group);
    if (!groupSeriesMap) {
        console.error("Invalid Series Group: ", group);
        return null;
    }

    let seriesNameMap = groupSeriesMap.get(series.name);
    if (!seriesNameMap) {
        console.error("Invalid Series Name: ", series.name);
        return null;
    }
    if (!seriesNameMap[yIndexName]) {
        return null
    }
    return seriesNameMap[yIndexName];
}

const renderReferenceLine = (group: string, seriesName: string, refLineType: "mean", statsInfoMap?: StatsInfoMap, renderFlag: boolean = true, stroke?: string, strokeWidth?: number) => {
    if (!renderFlag) {
        return null;
    }

    if (!statsInfoMap) {
        return null;
    }

    let groupStatsMap = statsInfoMap.get(group);
    if (!groupStatsMap) {
        return null;
    }

    let statsInfo = groupStatsMap.get(seriesName);
    if (!statsInfo) {
        return null;
    }

    if (refLineType === "mean") {
        return (
            <ReferenceLine x={statsInfo.mean} yAxisId="left" stroke={stroke} strokeWidth={strokeWidth} />
        );
    }
}

const getYDataKeys = (seriesInfoMap: SeriesInfoMap, series: Series[], group: string, yIndexName: 'yIndex' | 'dyIndex' = 'yIndex') => {
    let yDataKeys: string[] = [];
    series.forEach((s: Series) => {
        let groupSeriesMap = seriesInfoMap.get(group);
        if (!groupSeriesMap) {
            console.error("Invalid Series Group: ", group);
            return;
        }
        let seriesName = groupSeriesMap.get(s.name);
        if (!seriesName) {
            console.error("Invalid Series Name: ", s.name);
            return yDataKeys;
        }
        yDataKeys.push(seriesName[yIndexName]);
    });

    return yDataKeys;
}

const getXLabelValue = (unit: TimeUnit | null, iterMultiplier: number = 1, plotName: PlotName, suppliedVal?: string) => {
    if (suppliedVal) {
        return suppliedVal;
    }

    switch (plotName) {
        case PlotName.ProbabilityDensity: {
            if (unit === 0 || unit) {
                return "Mean Time Per Iteration (" + TimeUnit[unit] + ")";
            } else {
                return "Mean Time Per Iteration"
            }
        }
        case PlotName.LinearRegression: {
            if (iterMultiplier === 1) {
                return "Iterations";
            } else {
                return "Iterations (" + mulToString(iterMultiplier) + ")";
            }
        }
        case PlotName.MeanTimePerIter: {
            if (iterMultiplier === 1) {
                return "Iterations";
            } else {
                return "Iterations (" + mulToString(iterMultiplier) + ")";
            }
        }
    }

}

const mulToString = (multiplier: number = 1) => {
    if (multiplier === 1) {
        return "";
    }

    if (multiplier % 10 !== 0) {
        return "x" + multiplier;
    }

    let exp = 0;
    while (multiplier > 1) {
        multiplier = multiplier / 10;
        exp += 1;
    }
    return "x 10^" + exp;
}

const getYLabelValue = (unit: TimeUnit | null, plotName: PlotName, suppliedVal?: string) => {
    if (suppliedVal) {
        return suppliedVal;
    }

    switch (plotName) {
        case PlotName.MeanTimePerIter: {
            if (unit === 0 || unit) {
                return "Mean Time Per Iteration (" + TimeUnit[unit] + ")";
            } else {
                return "Mean Time Per Iteration";
            }
        }
        case PlotName.LinearRegression: {
            if (unit === 0 || unit) {
                return "Total Sample Time (" + TimeUnit[unit] + ")";
            } else {
                return "Total Sample Time";
            }
        }
        case PlotName.ProbabilityDensity: {
            return "Density"
        }
    }
}

const getAxisUnits = (unitsMap: UnitsMap, group: string, displayUnit: TimeUnit | undefined) => {
    let dataYAxisUnit = unitsMap.get(group);
    if (!dataYAxisUnit) {
        console.error("Failed to get the Data YAxisUnit for group", group);
        dataYAxisUnit = TimeUnit.ns;
    }
    if (displayUnit === undefined) {
        displayUnit = dataYAxisUnit;
    }
    return {
        data: dataYAxisUnit,
        display: displayUnit,
    }
}

export class CriterionMeanTimePerIterChart extends React.Component<CriterionChartProps> {
    render() {
        const group = this.props.group.toLowerCase();
        let data = this.props.dataMap.get(group);
        if (!data) {
            return renderErrorDiv(group);
        }
        const unitsMap = this.props.unitsMap;
        let yAxisUnits = getAxisUnits(unitsMap, group, this.props.timeUnit);
        let seriesYDataKeys = getYDataKeys(this.props.seriesInfoMap, this.props.series, group);
        return (
            <div className={this.props.className} style={this.props.style}>
                <CriterionLineChart
                    data={data}
                    series={seriesYDataKeys}
                    xLabelValue={getXLabelValue(null, this.props.iterMultiplier, PlotName.MeanTimePerIter, this.props.xLabel?.value)}
                    xLabelColor={this.props.xLabel?.color}
                    yLabelValue={getYLabelValue(yAxisUnits.display, PlotName.MeanTimePerIter, this.props.yLabel?.value)}
                    yLabelColor={this.props.yLabel?.color}
                    timeUnits={yAxisUnits}
                    iterMultiplier={this.props.iterMultiplier}
                    xmin={this.props.xrange?.min}
                    xmax={this.props.xrange?.max}
                    legend={this.props.legend}>
                    {
                        this.props.series.map((series: Series) => (
                            renderPlotLine(series, getSeriesLineDataKey(this.props.seriesInfoMap, series, group))
                        ))
                    }
                </CriterionLineChart>
            </div>
        );
    }
}


export class CriterionLinearRegressionChart extends React.Component<CriterionChartProps> {
    render() {
        const group = this.props.group.toLowerCase();
        let data = this.props.dataMap.get(group);
        if (!data) {
            return renderErrorDiv(group);
        }
        const unitsMap = this.props.unitsMap;

        let yAxisUnits = getAxisUnits(unitsMap, group, this.props.timeUnit);
        let seriesYDataKeys = getYDataKeys(this.props.seriesInfoMap, this.props.series, group);
        return (
            <div className={this.props.className} style={this.props.style}>
                <CriterionLineChart
                    data={data}
                    series={seriesYDataKeys}
                    xLabelValue={getXLabelValue(null, this.props.iterMultiplier, PlotName.LinearRegression, this.props.xLabel?.value)}
                    xLabelColor={this.props.xLabel?.color}
                    yLabelValue={getYLabelValue(yAxisUnits.display, PlotName.LinearRegression, this.props.yLabel?.value)}
                    yLabelColor={this.props.yLabel?.color}
                    timeUnits={yAxisUnits}
                    iterMultiplier={this.props.iterMultiplier}
                    xmin={this.props.xrange?.min}
                    xmax={this.props.xrange?.max}
                    legend={this.props.legend}>
                    {
                        this.props.series.map((series: Series) => (
                            [renderPlotLine(series, getSeriesLineDataKey(this.props.seriesInfoMap, series, group), "left", -1),
                            renderTrendLine(series.name, series.trendLine, getTrendLineDataKey(this.props.seriesInfoMap, series, group))]
                        ))
                    }
                </CriterionLineChart>
            </div>
        );
    }
}

export class CriterionProbabilityDensityChart extends React.Component<CriterionChartProps> {
    render() {
        const group = this.props.group.toLowerCase();
        let data = this.props.dataMap.get(group);
        if (!data) {
            return renderErrorDiv(group);
        }
        let seriesYDataKeys = getYDataKeys(this.props.seriesInfoMap, this.props.series, group, 'dyIndex');
        const unitsMap = this.props.unitsMap;
        let xAxisUnits = getAxisUnits(unitsMap, group, this.props.timeUnit);
        let yRightLabelValue = this.props.yRightLabel?.value;
        if (!yRightLabelValue) {
            if (this.props.iterMultiplier === 1) {
                yRightLabelValue = "Iterations";
            } else {
                yRightLabelValue = "Iterations (" + mulToString(this.props.iterMultiplier) + ")";
            }
        }

        return (
            <div className={this.props.className} style={this.props.style}>
                <CriterionLineChart
                    data={data}
                    series={seriesYDataKeys}
                    hasRightAxis={true}
                    xLabelValue={getXLabelValue(xAxisUnits.display, this.props.iterMultiplier, PlotName.ProbabilityDensity, this.props.xLabel?.value)}
                    xLabelColor={this.props.xLabel?.color}
                    yLabelValue={getYLabelValue(null, PlotName.ProbabilityDensity)}
                    yLabelColor={this.props.yLabel?.color}
                    yRightLabelValue={yRightLabelValue}
                    yRightLabelColor={this.props.yRightLabel?.color}
                    iterMultiplier={this.props.iterMultiplier}
                    timeUnits={xAxisUnits}
                    xmin={this.props.xrange?.min}
                    xmax={this.props.xrange?.max}
                    invertRescale={true}
                    legend={this.props.legend}>
                    {
                        this.props.series.map((series: Series) => (
                            [
                                renderArea(series, getSeriesLineDataKey(this.props.seriesInfoMap, series, group, 'dyIndex'), "left", 0),
                                renderPlotLine(series, getSeriesLineDataKey(this.props.seriesInfoMap, series, group), "right", -1),
                                renderReferenceLine(group, series.name, "mean", this.props.statsInfoMap, series.renderMean, series.mean?.stroke, series.mean?.strokeWidth),
                            ]
                        ))
                    }

                </CriterionLineChart>
            </div >
        );
    }
}
