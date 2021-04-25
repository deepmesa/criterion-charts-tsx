import React, { PureComponent, CSSProperties } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceArea, Label } from 'recharts';

export enum PlotName {
    MeanTimePerIter,
    LinearRegression
}

export enum TimeUnit {
    s,
    ms,
    ns,
    ps,
}

export interface YAxisUnits {
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

interface Series {
    name: string,
    dot?: Dot,
    activeDot?: Dot
    stroke?: string,
    strokeWidth?: number,
    trendLine?: TrendLine
}

interface PlotLabel {
    value?: string,
    color?: string,
    unit?: TimeUnit,
}

export interface CriterionPlotProps {
    group: string,
    plot: PlotName,
    style?: CSSProperties
    className?: string,
    legend?: LegendStyle,
    series: Series[],
    xLabel?: PlotLabel,
    yLabel?: PlotLabel,
}

interface SeriesInfo {
    yIndex: string,
    tyIndex: string,
}

export type SeriesInfoMap = Map<string, Map<string, SeriesInfo>>;
export type UnitsMap = Map<string, TimeUnit>;

interface CriterionChartProps extends CriterionPlotProps {
    data: DataPoint[],
    seriesInfoMap: SeriesInfoMap
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
    yAxisUnits: YAxisUnits,
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
        this.state = {
            data: this.rescaleData(this.props.data, this.props.yAxisUnits),
            selectStart: SELECTION_BOUNDARY_UNSET,
            selectEnd: SELECTION_BOUNDARY_UNSET,
            left: RECHARTS_DATAMIN,
            right: RECHARTS_DATAMAX,
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
        legend: {
            pos: LegendPosition.Right,
            style: { paddingLeft: '10px' },
        }
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
                if (d[idx] > top) top = d[idx];
                if (d[idx] < bottom) bottom = d[idx];
            }
        });

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
            this.setState(({
                refAreaLeft: REFERENCE_AREA_BOUNDARY_UNSET,
                refAreaRight: REFERENCE_AREA_BOUNDARY_UNSET,
                left: RECHARTS_DATAMIN,
                right: RECHARTS_DATAMAX,
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

    rescaleData = (data: DataPoint[], yAxisUnits: YAxisUnits) => {
        let rescaledData: DataPoint[] = new Array();
        data.forEach((entry: DataPoint) => {
            const { i, x, ...rest } = entry;
            for (const key in rest) {
                rest[key] = this.convertTimeUnit(rest[key], yAxisUnits.data, yAxisUnits.display);
            }

            rescaledData.push({
                i: i,
                x: x,
                ...rest
            });
        });
        return rescaledData;
    }

    render() {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    width={this.props.width}
                    height={this.props.height}
                    data={this.state.data}
                    margin={this.props.margin}
                    onMouseDown={this.onMouseDown}
                    onMouseMove={this.onMouseMove}
                    onMouseUp={this.zoom}
                >
                    <XAxis allowDataOverflow dataKey={this.props.xDataKey} domain={[this.state.left, this.state.right]} type="number">
                        {this.props.xLabelValue ?
                            <Label position="bottom" fill={this.props.xLabelColor}>
                                {this.props.xLabelValue}
                            </Label>
                            : null
                        }
                    </XAxis>
                    <YAxis allowDataOverflow scale="linear" domain={[this.state.bottom, this.state.top]} type="number">
                        {this.props.yLabelValue ?
                            <Label position="left" angle={-90} style={{ textAnchor: 'middle' }} fill={this.props.yLabelColor}>
                                {this.props.yLabelValue}
                            </Label>
                            : null
                        }
                    </YAxis>
                    <Tooltip />
                    {this.renderLegend()}
                    {this.props.children}
                    {this.state.refAreaLeft && this.state.refAreaRight ? (
                        <ReferenceArea x1={this.state.refAreaLeft} x2={this.state.refAreaRight} strokeOpacity={0.3} />
                    ) : null}

                </LineChart>
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

const renderTrendLine = (seriesName: string, trendLine: TrendLine | undefined, yDataKey: string | null) => {
    if (!trendLine) {
        trendLine = {
            strokeWidth: 1
        }
    } else {
        if (!trendLine.strokeWidth) {
            trendLine.strokeWidth = 1;
        }
    }
    return (
        <Line
            type="monotone"
            dataKey={yDataKey ? yDataKey : undefined}
            stroke={trendLine.stroke}
            strokeWidth={trendLine.strokeWidth}
            dot={false}
            name={'LR (' + seriesName + ')'}
            activeDot={false}
            animationDuration={300} />
    );
}

const renderPlotLine = (series: Series, yDataKey: string | null, defaultStrokeWidth: number = 1) => {
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

    if (!series.strokeWidth) {
        series.strokeWidth = defaultStrokeWidth;
    }

    return (
        <Line
            key={series.name}
            connectNulls
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

const getSeriesLineDataKey = (seriesInfoMap: SeriesInfoMap, series: Series, group: string) => {
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
    if (!seriesNameMap.yIndex) {
        return null
    }
    return seriesNameMap.yIndex;
}


const getYDataKeys = (seriesInfoMap: SeriesInfoMap, series: Series[], group: string) => {
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
        yDataKeys.push(seriesName.yIndex);
    });

    return yDataKeys;
}

const getXLabelValue = (suppliedVal?: string) => {
    return suppliedVal ? suppliedVal : "Iterations";
}

const getYLabelValue = (unit: TimeUnit, plotName: PlotName, suppliedVal?: string) => {
    if (suppliedVal) {
        return suppliedVal;
    }

    switch (plotName) {
        case PlotName.MeanTimePerIter: {
            return "Mean Time Per Iteration (" + TimeUnit[unit] + ")";
        }
        case PlotName.LinearRegression: {
            return "Total Sample Time (" + TimeUnit[unit] + ")";
        }
    }
}

const getYAxisUnits = (unitsMap: UnitsMap, group: string, displayUnit: TimeUnit | undefined) => {
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
        const unitsMap = this.props.unitsMap;
        let yAxisUnits = getYAxisUnits(unitsMap, group, this.props.yLabel?.unit);
        let seriesYDataKeys = getYDataKeys(this.props.seriesInfoMap, this.props.series, group);
        return (
            <div className={this.props.className} style={this.props.style}>
                <CriterionLineChart
                    data={this.props.data}
                    series={seriesYDataKeys}
                    xLabelValue={getXLabelValue(this.props.xLabel?.value)}
                    xLabelColor={this.props.xLabel?.color}
                    yLabelValue={getYLabelValue(yAxisUnits.display, PlotName.MeanTimePerIter, this.props.yLabel?.value)}
                    yLabelColor={this.props.yLabel?.color}
                    yAxisUnits={yAxisUnits}
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
        const unitsMap = this.props.unitsMap;
        let yAxisUnits = getYAxisUnits(unitsMap, group, this.props.yLabel?.unit);
        let seriesYDataKeys = getYDataKeys(this.props.seriesInfoMap, this.props.series, group);
        return (
            <div className={this.props.className} style={this.props.style}>
                <CriterionLineChart
                    data={this.props.data}
                    series={seriesYDataKeys}
                    xLabelValue={getXLabelValue(this.props.xLabel?.value)}
                    xLabelColor={this.props.xLabel?.color}
                    yLabelValue={getYLabelValue(yAxisUnits.display, PlotName.LinearRegression, this.props.yLabel?.value)}
                    yLabelColor={this.props.yLabel?.color}
                    yAxisUnits={yAxisUnits}
                    legend={this.props.legend}>
                    {
                        this.props.series.map((series: Series) => (
                            [renderPlotLine(series, getSeriesLineDataKey(this.props.seriesInfoMap, series, group), 0),
                            renderTrendLine(series.name, series.trendLine, getTrendLineDataKey(this.props.seriesInfoMap, series, group))]
                        ))
                    }
                </CriterionLineChart>
            </div>
        );
    }
}
