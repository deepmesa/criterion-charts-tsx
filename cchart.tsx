import React, { PureComponent, CSSProperties } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceArea, Label } from 'recharts';


export enum PlotName {
    MeanTimePerIter,
    LinearRegression
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
    color?: string
}

interface CriterionPlotProps {
    group: string,
    plot: PlotName,
    style?: CSSProperties
    className?: string,
    legend?: LegendStyle,
    series: Series[],
    xLabel?: PlotLabel,
    yLabel?: PlotLabel,
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

interface DataPoint {
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

const RECHARTS_DATAMIN: string = 'dataMin';
const RECHARTS_DATAMAX: string = 'dataMax';
const SELECTION_BOUNDARY_UNSET: number = -1;
const REFERENCE_AREA_BOUNDARY_UNSET: string = '';

class CriterionLineChart extends PureComponent<LineChartProps, LineChartState> {
    constructor(props: LineChartProps) {
        super(props);
        this.state = {
            data: this.props.data,
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

    render() {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    width={this.props.width}
                    height={this.props.height}
                    data={this.props.data}
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

const ErrorDiv = (props: { message: string }) => {
    return (
        <div style={{ width: '500px', height: '100px' }}>
            <p>{props.message}</p>
        </div>
    );
}

const renderTrendLine = (trendLine: TrendLine | undefined, yDataKey: string | null) => {
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
            name="Linear Regression"
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

const getTrendLineDataKey = (series: Series, group: string) => {
    let groupSeriesMap = SERIES_INFO_MAP.get(group);
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

const getSeriesLineDataKey = (series: Series, group: string) => {
    let groupSeriesMap = SERIES_INFO_MAP.get(group);
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

const getYDataKeys = (series: Series[], group: string) => {
    let yDataKeys: string[] = [];
    series.forEach((s: Series) => {
        let groupSeriesMap = SERIES_INFO_MAP.get(group);
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
    return suppliedVal ? suppliedVal : "Iterations (x 1000)";
}

const getYLabelValue = (group: string, plotName: PlotName, suppliedVal?: string) => {
    if (suppliedVal) {
        return suppliedVal;
    }
    switch (plotName) {
        case PlotName.MeanTimePerIter: {
            let unit = MEAN_TIME_PER_ITER_UNITS.get(group);
            if (!unit) {
                console.error("Invalid Group: ", group);
                unit = "ERROR!"
            }
            return "Mean Time Per Iteration (" + unit + ")";
        }
        case PlotName.LinearRegression: {
            let unit = LINEAR_REGRESSION_UNITS.get(group);
            if (!unit) {
                console.error("Invalid Group: ", group);
                unit = "ERROR!"
            }
            return "Mean Time Per Iteration (" + unit + ")";
        }
    }
}

export class CriterionMeanTimePerIterPlot extends React.Component<CriterionPlotProps> {
    render() {
        const group = this.props.group.toLowerCase();
        let data = MEAN_TIME_PER_ITER_DATA_MAP.get(group);
        if (!data) {
            return (
                <ErrorDiv message={'Could not find Plot Data for Criterion Group: ' + this.props.group + '. Please check the group prop in the CriterionPlot Component'} />
            );
        }

        let seriesYDataKeys = getYDataKeys(this.props.series, group);
        return (
            <div className={this.props.className} style={this.props.style}>
                <CriterionLineChart
                    data={data}
                    series={seriesYDataKeys}
                    xLabelValue={getXLabelValue(this.props.xLabel?.value)}
                    xLabelColor={this.props.xLabel?.color}
                    yLabelValue={getYLabelValue(group, PlotName.MeanTimePerIter, this.props.yLabel?.value)}
                    yLabelColor={this.props.yLabel?.color}
                    legend={this.props.legend}>
                    {
                        this.props.series.map((series: Series) => (
                            renderPlotLine(series, getSeriesLineDataKey(series, group))
                        ))
                    }
                </CriterionLineChart>
            </div>
        );
    }
}

export class CriterionLinearRegressionPlot extends React.Component<CriterionPlotProps> {
    render() {
        const group = this.props.group.toLowerCase();
        let data = LINEAR_REGRESSION_DATA_MAP.get(group);
        if (!data) {
            return (
                <ErrorDiv message={'Could not find Plot Data for Criterion Group: ' + this.props.group + '. Please check the group prop in the CriterionPlot Component'} />
            );
        }

        let seriesYDataKeys = getYDataKeys(this.props.series, group);
        return (
            <div className={this.props.className} style={this.props.style}>
                <CriterionLineChart
                    data={data}
                    series={seriesYDataKeys}
                    xLabelValue={getXLabelValue(this.props.xLabel?.value)}
                    xLabelColor={this.props.xLabel?.color}
                    yLabelValue={getYLabelValue(group, PlotName.LinearRegression, this.props.yLabel?.value)}
                    yLabelColor={this.props.yLabel?.color}
                    legend={this.props.legend}>
                    {
                        this.props.series.map((series: Series) => (
                            [renderPlotLine(series, getSeriesLineDataKey(series, group), 0),
                            renderTrendLine(series.trendLine, getTrendLineDataKey(series, group))]
                        ))
                    }
                </CriterionLineChart>
            </div>
        );
    }
}

export class CriterionPlot extends React.Component<CriterionPlotProps> {
    render() {
        if (this.props.plot === PlotName.MeanTimePerIter) {
            return (
                <CriterionMeanTimePerIterPlot {...this.props} />
            );
        } else if (this.props.plot === PlotName.LinearRegression) {
            return (
                <CriterionLinearRegressionPlot {...this.props} />
            );
        } else {
            return (
                <ErrorDiv message={'Could not find Plot for Criterion PlotName: ' + this.props.plot + '. Please check the plot prop in the CriterionPlot Component'} />
            );
        }
    }
}

interface SeriesInfo {
    yIndex: string,
    tyIndex: string,
}

const MEAN_TIME_PER_ITER_UNITS: Map<string, string> = new Map<string, string>([
    ["push", "ns"]
]);

const LINEAR_REGRESSION_UNITS: Map<string, string> = new Map<string, string>([
    ["push", "ps"]
]);

const SERIES_INFO_MAP: Map<string, Map<string, SeriesInfo>> = new Map<string, Map<string, SeriesInfo>>();
SERIES_INFO_MAP.set("push", new Map<string, SeriesInfo>([
    ["fll-noalloc-back", { yIndex: "y0", tyIndex: "tl0" }],
    ["fll-noalloc-front", { yIndex: "y1", tyIndex: "tl1" }]
]));


const MEAN_TIME_PER_ITER_DATA_MAP: Map<string, DataPoint[]> = new Map<string, DataPoint[]>([
    ["push", [
        { i: 0, x: 6.43, y1: 54.89 },
        { i: 1, x: 6.44, y0: 55.89 },
        { i: 2, x: 12.86, y1: 53.00 },
        { i: 3, x: 12.89, y0: 54.03 },
        { i: 4, x: 19.29, y1: 53.51 },
        { i: 5, x: 19.33, y0: 54.42 },
        { i: 6, x: 25.72, y1: 53.05 },
        { i: 7, x: 25.77, y0: 54.32 },
        { i: 8, x: 32.15, y1: 53.40 },
        { i: 9, x: 32.22, y0: 54.09 },
        { i: 10, x: 38.57, y1: 53.39 },
        { i: 11, x: 38.66, y0: 54.41 },
        { i: 12, x: 45.00, y1: 53.26 },
        { i: 13, x: 45.10, y0: 54.51 },
        { i: 14, x: 51.43, y1: 53.40 },
        { i: 15, x: 51.54, y0: 54.60 },
        { i: 16, x: 57.86, y1: 53.33 },
        { i: 17, x: 57.99, y0: 54.09 },
        { i: 18, x: 64.29, y1: 53.22 },
        { i: 19, x: 64.43, y0: 54.40 },
        { i: 20, x: 70.72, y1: 53.40 },
        { i: 21, x: 70.87, y0: 54.22 },
        { i: 22, x: 77.15, y1: 53.49 },
        { i: 23, x: 77.32, y0: 54.20 },
        { i: 24, x: 83.58, y1: 53.39 },
        { i: 25, x: 83.76, y0: 54.18 },
        { i: 26, x: 90.01, y1: 53.42 },
        { i: 27, x: 90.20, y0: 54.14 },
        { i: 28, x: 96.44, y1: 53.07 },
        { i: 29, x: 96.64, y0: 54.45 },
        { i: 30, x: 102.86, y1: 53.40 },
        { i: 31, x: 103.09, y0: 54.29 },
        { i: 32, x: 109.29, y1: 53.30 },
        { i: 33, x: 109.53, y0: 54.25 },
        { i: 34, x: 115.72, y1: 53.52 },
        { i: 35, x: 115.97, y0: 54.26 },
        { i: 36, x: 122.15, y1: 53.59 },
        { i: 37, x: 122.42, y0: 54.50 },
        { i: 38, x: 128.58, y1: 53.55 },
        { i: 39, x: 128.86, y0: 54.56 },
        { i: 40, x: 135.01, y1: 53.34 },
        { i: 41, x: 135.30, y0: 54.39 },
        { i: 42, x: 141.44, y1: 53.20 },
        { i: 43, x: 141.75, y0: 54.32 },
        { i: 44, x: 147.87, y1: 53.36 },
        { i: 45, x: 148.19, y0: 54.44 },
        { i: 46, x: 154.30, y1: 53.36 },
        { i: 47, x: 154.63, y0: 54.32 },
        { i: 48, x: 160.72, y1: 53.29 },
        { i: 49, x: 161.07, y0: 54.51 },
        { i: 50, x: 167.15, y1: 53.33 },
        { i: 51, x: 167.52, y0: 54.34 },
        { i: 52, x: 173.58, y1: 53.45 },
        { i: 53, x: 173.96, y0: 54.25 },
        { i: 54, x: 180.01, y1: 53.28 },
        { i: 55, x: 180.40, y0: 54.56 },
        { i: 56, x: 186.44, y1: 53.74 },
        { i: 57, x: 186.85, y0: 54.15 },
        { i: 58, x: 192.87, y1: 53.49 },
        { i: 59, x: 193.29, y0: 54.47 },
        { i: 60, x: 199.30, y1: 53.32 },
        { i: 61, x: 199.73, y0: 54.24 },
        { i: 62, x: 205.73, y1: 53.41 },
        { i: 63, x: 206.18, y0: 54.36 },
        { i: 64, x: 212.16, y1: 53.42 },
        { i: 65, x: 212.62, y0: 54.33 },
        { i: 66, x: 218.59, y1: 53.50 },
        { i: 67, x: 219.06, y0: 54.27 },
        { i: 68, x: 225.01, y1: 53.32 },
        { i: 69, x: 225.50, y0: 54.39 },
        { i: 70, x: 231.44, y1: 53.45 },
        { i: 71, x: 231.95, y0: 54.34 },
        { i: 72, x: 237.87, y1: 53.48 },
        { i: 73, x: 238.39, y0: 54.34 },
        { i: 74, x: 244.30, y1: 53.44 },
        { i: 75, x: 244.83, y0: 54.44 },
        { i: 76, x: 250.73, y1: 53.39 },
        { i: 77, x: 251.28, y0: 54.27 },
        { i: 78, x: 257.16, y1: 53.33 },
        { i: 79, x: 257.72, y0: 54.34 },
        { i: 80, x: 263.59, y1: 53.40 },
        { i: 81, x: 264.16, y0: 54.25 },
        { i: 82, x: 270.02, y1: 53.28 },
        { i: 83, x: 270.61, y0: 54.31 },
        { i: 84, x: 276.45, y1: 53.33 },
        { i: 85, x: 277.05, y0: 54.30 },
        { i: 86, x: 282.88, y1: 53.33 },
        { i: 87, x: 283.49, y0: 54.23 },
        { i: 88, x: 289.31, y1: 53.30 },
        { i: 89, x: 289.94, y0: 54.26 },
        { i: 90, x: 295.73, y1: 53.44 },
        { i: 91, x: 296.38, y0: 54.36 },
        { i: 92, x: 302.16, y1: 53.35 },
        { i: 93, x: 302.82, y0: 54.31 },
        { i: 94, x: 308.59, y1: 53.42 },
        { i: 95, x: 309.26, y0: 54.22 },
        { i: 96, x: 315.02, y1: 53.43 },
        { i: 97, x: 315.71, y0: 54.35 },
        { i: 98, x: 321.45, y1: 53.37 },
        { i: 99, x: 322.15, y0: 54.21 },
        { i: 100, x: 327.88, y1: 53.34 },
        { i: 101, x: 328.59, y0: 54.29 },
        { i: 102, x: 334.31, y1: 53.36 },
        { i: 103, x: 335.04, y0: 54.22 },
        { i: 104, x: 340.74, y1: 53.28 },
        { i: 105, x: 341.48, y0: 54.32 },
        { i: 106, x: 347.17, y1: 53.40 },
        { i: 107, x: 347.92, y0: 54.25 },
        { i: 108, x: 353.60, y1: 53.30 },
        { i: 109, x: 354.37, y0: 54.26 },
        { i: 110, x: 360.02, y1: 53.30 },
        { i: 111, x: 360.81, y0: 54.21 },
        { i: 112, x: 366.45, y1: 53.16 },
        { i: 113, x: 367.25, y0: 54.04 },
        { i: 114, x: 372.88, y1: 53.43 },
        { i: 115, x: 373.69, y0: 54.11 },
        { i: 116, x: 379.31, y1: 53.39 },
        { i: 117, x: 380.14, y0: 54.05 },
        { i: 118, x: 385.74, y1: 53.38 },
        { i: 119, x: 386.58, y0: 54.02 },
        { i: 120, x: 392.17, y1: 53.15 },
        { i: 121, x: 393.02, y0: 54.29 },
        { i: 122, x: 398.60, y1: 53.31 },
        { i: 123, x: 399.47, y0: 54.11 },
        { i: 124, x: 405.03, y1: 53.25 },
        { i: 125, x: 405.91, y0: 54.22 },
        { i: 126, x: 411.46, y1: 53.15 },
        { i: 127, x: 412.35, y0: 54.25 },
        { i: 128, x: 417.88, y1: 53.23 },
        { i: 129, x: 418.80, y0: 54.20 },
        { i: 130, x: 424.31, y1: 53.30 },
        { i: 131, x: 425.24, y0: 54.18 },
        { i: 132, x: 430.74, y1: 53.24 },
        { i: 133, x: 431.68, y0: 54.23 },
        { i: 134, x: 437.17, y1: 53.46 },
        { i: 135, x: 438.12, y0: 54.26 },
        { i: 136, x: 443.60, y1: 53.27 },
        { i: 137, x: 444.57, y0: 54.21 },
        { i: 138, x: 450.03, y1: 53.16 },
        { i: 139, x: 451.01, y0: 54.16 },
        { i: 140, x: 456.46, y1: 53.37 },
        { i: 141, x: 457.45, y0: 54.15 },
        { i: 142, x: 462.89, y1: 53.31 },
        { i: 143, x: 463.90, y0: 54.22 },
        { i: 144, x: 469.32, y1: 53.18 },
        { i: 145, x: 470.34, y0: 54.30 },
        { i: 146, x: 475.75, y1: 53.16 },
        { i: 147, x: 476.78, y0: 54.11 },
        { i: 148, x: 482.18, y1: 53.25 },
        { i: 149, x: 483.23, y0: 54.04 },
        { i: 150, x: 488.60, y1: 53.31 },
        { i: 151, x: 489.67, y0: 54.38 },
        { i: 152, x: 495.03, y1: 53.23 },
        { i: 153, x: 496.11, y0: 54.20 },
        { i: 154, x: 501.46, y1: 53.24 },
        { i: 155, x: 502.55, y0: 54.15 },
        { i: 156, x: 507.89, y1: 53.14 },
        { i: 157, x: 509.00, y0: 54.19 },
        { i: 158, x: 514.32, y1: 53.18 },
        { i: 159, x: 515.44, y0: 54.15 },
        { i: 160, x: 520.75, y1: 53.23 },
        { i: 161, x: 521.88, y0: 54.09 },
        { i: 162, x: 527.18, y1: 53.13 },
        { i: 163, x: 528.33, y0: 54.19 },
        { i: 164, x: 533.61, y1: 53.17 },
        { i: 165, x: 534.77, y0: 54.29 },
        { i: 166, x: 540.04, y1: 53.16 },
        { i: 167, x: 541.21, y0: 54.10 },
        { i: 168, x: 546.47, y1: 53.22 },
        { i: 169, x: 547.65, y0: 54.15 },
        { i: 170, x: 552.89, y1: 53.16 },
        { i: 171, x: 554.10, y0: 54.09 },
        { i: 172, x: 559.32, y1: 53.41 },
        { i: 173, x: 560.54, y0: 54.17 },
        { i: 174, x: 565.75, y1: 53.27 },
        { i: 175, x: 566.98, y0: 54.16 },
        { i: 176, x: 572.18, y1: 53.18 },
        { i: 177, x: 573.43, y0: 54.07 },
        { i: 178, x: 578.61, y1: 53.15 },
        { i: 179, x: 579.87, y0: 54.25 },
        { i: 180, x: 585.04, y1: 53.24 },
        { i: 181, x: 586.31, y0: 54.17 },
        { i: 182, x: 591.47, y1: 53.12 },
        { i: 183, x: 592.76, y0: 54.10 },
        { i: 184, x: 597.90, y1: 53.13 },
        { i: 185, x: 599.20, y0: 54.16 },
        { i: 186, x: 604.33, y1: 53.14 },
        { i: 187, x: 605.64, y0: 54.13 },
        { i: 188, x: 610.75, y1: 53.10 },
        { i: 189, x: 612.09, y0: 54.16 },
        { i: 190, x: 617.18, y1: 53.14 },
        { i: 191, x: 618.53, y0: 54.16 },
        { i: 192, x: 623.61, y1: 53.22 },
        { i: 193, x: 624.97, y0: 54.06 },
        { i: 194, x: 630.04, y1: 53.12 },
        { i: 195, x: 631.41, y0: 54.14 },
        { i: 196, x: 636.47, y1: 53.25 },
        { i: 197, x: 637.86, y0: 54.17 },
        { i: 198, x: 642.90, y1: 53.14 },
        { i: 199, x: 644.30, y0: 54.18 }
    ]]
]);

const LINEAR_REGRESSION_DATA_MAP: Map<string, DataPoint[]> = new Map<string, DataPoint[]>([
    ["push", [
        { i: 0, x: 6.43, y1: 0.35 },
        { i: 1, x: 6.44, y0: 0.36 },
        { i: 2, x: 12.86, y1: 0.68 },
        { i: 3, x: 12.89, y0: 0.70 },
        { i: 4, x: 19.29, y1: 1.03 },
        { i: 5, x: 19.33, y0: 1.05 },
        { i: 6, x: 25.72, y1: 1.36 },
        { i: 7, x: 25.77, y0: 1.40 },
        { i: 8, x: 32.15, y1: 1.72 },
        { i: 9, x: 32.22, y0: 1.74 },
        { i: 10, x: 38.57, y1: 2.06 },
        { i: 11, x: 38.66, y0: 2.10 },
        { i: 12, x: 45.00, y1: 2.40 },
        { i: 13, x: 45.10, y0: 2.46 },
        { i: 14, x: 51.43, y1: 2.75 },
        { i: 15, x: 51.54, y0: 2.81 },
        { i: 16, x: 57.86, y1: 3.09 },
        { i: 17, x: 57.99, y0: 3.14 },
        { i: 18, x: 64.29, y1: 3.42 },
        { i: 19, x: 64.43, y0: 3.51 },
        { i: 20, x: 70.72, y1: 3.78 },
        { i: 21, x: 70.87, y0: 3.84 },
        { i: 22, x: 77.15, y1: 4.13 },
        { i: 23, x: 77.32, y0: 4.19 },
        { i: 24, x: 83.58, y1: 4.46 },
        { i: 25, x: 83.76, y0: 4.54 },
        { i: 26, x: 90.01, y1: 4.81 },
        { i: 27, x: 90.20, y0: 4.88 },
        { i: 28, x: 96.44, y1: 5.12 },
        { i: 29, x: 96.64, y0: 5.26 },
        { i: 30, x: 102.86, y1: 5.49 },
        { i: 31, x: 103.09, y0: 5.60 },
        { i: 32, x: 109.29, y1: 5.83 },
        { i: 33, x: 109.53, y0: 5.94 },
        { i: 34, x: 115.72, y1: 6.19 },
        { i: 35, x: 115.97, y0: 6.29 },
        { i: 36, x: 122.15, y1: 6.55 },
        { i: 37, x: 122.42, y0: 6.67 },
        { i: 38, x: 128.58, y1: 6.89 },
        { i: 39, x: 128.86, y0: 7.03 },
        { i: 40, x: 135.01, y1: 7.20 },
        { i: 41, x: 135.30, y0: 7.36 },
        { i: 42, x: 141.44, y1: 7.52 },
        { i: 43, x: 141.75, y0: 7.70 },
        { i: 44, x: 147.87, y1: 7.89 },
        { i: 45, x: 148.19, y0: 8.07 },
        { i: 46, x: 154.30, y1: 8.23 },
        { i: 47, x: 154.63, y0: 8.40 },
        { i: 48, x: 160.72, y1: 8.57 },
        { i: 49, x: 161.07, y0: 8.78 },
        { i: 50, x: 167.15, y1: 8.91 },
        { i: 51, x: 167.52, y0: 9.10 },
        { i: 52, x: 173.58, y1: 9.28 },
        { i: 53, x: 173.96, y0: 9.44 },
        { i: 54, x: 180.01, y1: 9.59 },
        { i: 55, x: 180.40, y0: 9.84 },
        { i: 56, x: 186.44, y1: 10.02 },
        { i: 57, x: 186.85, y0: 10.12 },
        { i: 58, x: 192.87, y1: 10.32 },
        { i: 59, x: 193.29, y0: 10.53 },
        { i: 60, x: 199.30, y1: 10.63 },
        { i: 61, x: 199.73, y0: 10.83 },
        { i: 62, x: 205.73, y1: 10.99 },
        { i: 63, x: 206.18, y0: 11.21 },
        { i: 64, x: 212.16, y1: 11.33 },
        { i: 65, x: 212.62, y0: 11.55 },
        { i: 66, x: 218.59, y1: 11.69 },
        { i: 67, x: 219.06, y0: 11.89 },
        { i: 68, x: 225.01, y1: 12.00 },
        { i: 69, x: 225.50, y0: 12.27 },
        { i: 70, x: 231.44, y1: 12.37 },
        { i: 71, x: 231.95, y0: 12.60 },
        { i: 72, x: 237.87, y1: 12.72 },
        { i: 73, x: 238.39, y0: 12.95 },
        { i: 74, x: 244.30, y1: 13.06 },
        { i: 75, x: 244.83, y0: 13.33 },
        { i: 76, x: 250.73, y1: 13.39 },
        { i: 77, x: 251.28, y0: 13.64 },
        { i: 78, x: 257.16, y1: 13.71 },
        { i: 79, x: 257.72, y0: 14.00 },
        { i: 80, x: 263.59, y1: 14.08 },
        { i: 81, x: 264.16, y0: 14.33 },
        { i: 82, x: 270.02, y1: 14.39 },
        { i: 83, x: 270.61, y0: 14.70 },
        { i: 84, x: 276.45, y1: 14.74 },
        { i: 85, x: 277.05, y0: 15.04 },
        { i: 86, x: 282.88, y1: 15.09 },
        { i: 87, x: 283.49, y0: 15.37 },
        { i: 88, x: 289.31, y1: 15.42 },
        { i: 89, x: 289.94, y0: 15.73 },
        { i: 90, x: 295.73, y1: 15.80 },
        { i: 91, x: 296.38, y0: 16.11 },
        { i: 92, x: 302.16, y1: 16.12 },
        { i: 93, x: 302.82, y0: 16.44 },
        { i: 94, x: 308.59, y1: 16.48 },
        { i: 95, x: 309.26, y0: 16.77 },
        { i: 96, x: 315.02, y1: 16.83 },
        { i: 97, x: 315.71, y0: 17.16 },
        { i: 98, x: 321.45, y1: 17.15 },
        { i: 99, x: 322.15, y0: 17.46 },
        { i: 100, x: 327.88, y1: 17.49 },
        { i: 101, x: 328.59, y0: 17.84 },
        { i: 102, x: 334.31, y1: 17.84 },
        { i: 103, x: 335.04, y0: 18.16 },
        { i: 104, x: 340.74, y1: 18.15 },
        { i: 105, x: 341.48, y0: 18.55 },
        { i: 106, x: 347.17, y1: 18.54 },
        { i: 107, x: 347.92, y0: 18.87 },
        { i: 108, x: 353.60, y1: 18.85 },
        { i: 109, x: 354.37, y0: 19.23 },
        { i: 110, x: 360.02, y1: 19.19 },
        { i: 111, x: 360.81, y0: 19.56 },
        { i: 112, x: 366.45, y1: 19.48 },
        { i: 113, x: 367.25, y0: 19.85 },
        { i: 114, x: 372.88, y1: 19.92 },
        { i: 115, x: 373.69, y0: 20.22 },
        { i: 116, x: 379.31, y1: 20.25 },
        { i: 117, x: 380.14, y0: 20.55 },
        { i: 118, x: 385.74, y1: 20.59 },
        { i: 119, x: 386.58, y0: 20.88 },
        { i: 120, x: 392.17, y1: 20.85 },
        { i: 121, x: 393.02, y0: 21.34 },
        { i: 122, x: 398.60, y1: 21.25 },
        { i: 123, x: 399.47, y0: 21.62 },
        { i: 124, x: 405.03, y1: 21.57 },
        { i: 125, x: 405.91, y0: 22.01 },
        { i: 126, x: 411.46, y1: 21.87 },
        { i: 127, x: 412.35, y0: 22.37 },
        { i: 128, x: 417.88, y1: 22.24 },
        { i: 129, x: 418.80, y0: 22.70 },
        { i: 130, x: 424.31, y1: 22.62 },
        { i: 131, x: 425.24, y0: 23.04 },
        { i: 132, x: 430.74, y1: 22.93 },
        { i: 133, x: 431.68, y0: 23.41 },
        { i: 134, x: 437.17, y1: 23.37 },
        { i: 135, x: 438.12, y0: 23.77 },
        { i: 136, x: 443.60, y1: 23.63 },
        { i: 137, x: 444.57, y0: 24.10 },
        { i: 138, x: 450.03, y1: 23.92 },
        { i: 139, x: 451.01, y0: 24.43 },
        { i: 140, x: 456.46, y1: 24.36 },
        { i: 141, x: 457.45, y0: 24.77 },
        { i: 142, x: 462.89, y1: 24.68 },
        { i: 143, x: 463.90, y0: 25.15 },
        { i: 144, x: 469.32, y1: 24.96 },
        { i: 145, x: 470.34, y0: 25.54 },
        { i: 146, x: 475.75, y1: 25.29 },
        { i: 147, x: 476.78, y0: 25.80 },
        { i: 148, x: 482.18, y1: 25.67 },
        { i: 149, x: 483.23, y0: 26.12 },
        { i: 150, x: 488.60, y1: 26.05 },
        { i: 151, x: 489.67, y0: 26.63 },
        { i: 152, x: 495.03, y1: 26.35 },
        { i: 153, x: 496.11, y0: 26.89 },
        { i: 154, x: 501.46, y1: 26.70 },
        { i: 155, x: 502.55, y0: 27.21 },
        { i: 156, x: 507.89, y1: 26.99 },
        { i: 157, x: 509.00, y0: 27.58 },
        { i: 158, x: 514.32, y1: 27.35 },
        { i: 159, x: 515.44, y0: 27.91 },
        { i: 160, x: 520.75, y1: 27.72 },
        { i: 161, x: 521.88, y0: 28.23 },
        { i: 162, x: 527.18, y1: 28.01 },
        { i: 163, x: 528.33, y0: 28.63 },
        { i: 164, x: 533.61, y1: 28.37 },
        { i: 165, x: 534.77, y0: 29.03 },
        { i: 166, x: 540.04, y1: 28.71 },
        { i: 167, x: 541.21, y0: 29.28 },
        { i: 168, x: 546.47, y1: 29.08 },
        { i: 169, x: 547.65, y0: 29.66 },
        { i: 170, x: 552.89, y1: 29.39 },
        { i: 171, x: 554.10, y0: 29.97 },
        { i: 172, x: 559.32, y1: 29.88 },
        { i: 173, x: 560.54, y0: 30.36 },
        { i: 174, x: 565.75, y1: 30.14 },
        { i: 175, x: 566.98, y0: 30.71 },
        { i: 176, x: 572.18, y1: 30.43 },
        { i: 177, x: 573.43, y0: 31.00 },
        { i: 178, x: 578.61, y1: 30.75 },
        { i: 179, x: 579.87, y0: 31.46 },
        { i: 180, x: 585.04, y1: 31.15 },
        { i: 181, x: 586.31, y0: 31.76 },
        { i: 182, x: 591.47, y1: 31.42 },
        { i: 183, x: 592.76, y0: 32.07 },
        { i: 184, x: 597.90, y1: 31.77 },
        { i: 185, x: 599.20, y0: 32.45 },
        { i: 186, x: 604.33, y1: 32.11 },
        { i: 187, x: 605.64, y0: 32.78 },
        { i: 188, x: 610.75, y1: 32.43 },
        { i: 189, x: 612.09, y0: 33.15 },
        { i: 190, x: 617.18, y1: 32.80 },
        { i: 191, x: 618.53, y0: 33.50 },
        { i: 192, x: 623.61, y1: 33.19 },
        { i: 193, x: 624.97, y0: 33.79 },
        { i: 194, x: 630.04, y1: 33.47 },
        { i: 195, x: 631.41, y0: 34.18 },
        { i: 196, x: 636.47, y1: 33.89 },
        { i: 197, x: 637.86, y0: 34.55 },
        { i: 198, x: 642.90, y1: 34.16 },
        { i: 199, x: 644.30, y0: 34.91 },
        { i: 200, x: 50.5, tl0: 0.36 },
        { i: 201, x: 320, tl0: 38.2 },
    ]]
]);
