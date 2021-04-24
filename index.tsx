import React, { PureComponent } from 'react';
import 'semantic-ui-css/semantic.min.css';
import Layout from '../../components/layout';
import { PlotName, CriterionPlot, LegendPosition } from '../../components/cchart';
import { flexVert } from '../../styles';

const SamplePage = () => {
    return (
        <Layout>
            <div className={flexVert}>
                <CriterionPlot
                    group="Push"
                    xLabel={{
                        color: "white"
                    }}
                    yLabel={{
                        color: "DarkGray"
                    }}

                    series={
                        [
                            {
                                name: 'fll-noalloc-back',
                            }
                        ]
                    }
                    plot={PlotName.MeanTimePerIter}
                    style={{ width: '1200px', height: '300px' }}
                />

                <CriterionPlot
                    group="Push"
                    series={
                        [
                            {
                                name: 'fll-noalloc-front',
                            }
                        ]
                    }
                    plot={PlotName.MeanTimePerIter}
                    style={{ width: '1200px', height: '300px' }}
                />


                <CriterionPlot
                    group="Push"
                    xLabel={{
                        value: "This is the XLabel",
                        color: "white"
                    }}
                    yLabel={{
                        value: "This is the Y Label that is long",
                        color: "green"
                    }}
                    series={
                        [
                            {
                                name: 'fll-noalloc-back',
                                stroke: 'red',
                                dot: {
                                    size: 3,
                                    fill: 'red',
                                    stroke: 'red'
                                },
                                activeDot: {
                                    size: 8,
                                    fill: 'red',
                                    stroke: 'blue'
                                }
                            },
                            {
                                name: 'fll-noalloc-front',
                                stroke: 'green',
                                dot: {
                                    size: 3,
                                    fill: 'green',
                                    stroke: 'green'
                                },
                                activeDot: {
                                    size: 8,
                                    fill: 'red',
                                    stroke: 'green'
                                }

                            }
                        ]
                    }
                    plot={PlotName.MeanTimePerIter}
                    style={{ width: '1200px', height: '300px' }}
                    legend={{ pos: LegendPosition.Right }} />

                <CriterionPlot
                    group="Push"
                    xLabel={{
                        color: "green"
                    }}
                    yLabel={{
                        color: "green"
                    }}
                    series={
                        [
                            {
                                name: 'fll-noalloc-back',
                            }
                        ]
                    }
                    plot={PlotName.LinearRegression}
                    style={{ width: '1200px', height: '300px' }}
                />
            </div>
        </Layout>
    );
}

export default SamplePage;
