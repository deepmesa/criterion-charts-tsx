use crate::rawdata::CriterionDataPoint;
use crate::timeunit::TimeUnit;
use crate::GroupName;
use crate::IterCount;
use crate::Measure;
use crate::YIndex;

use std::collections::BTreeMap;
use std::error::Error;
use std::fs::File;
use std::io::Write;

struct LinRegPoint(Measure, YIndex);

pub struct LinRegDataSet {
    points: BTreeMap<IterCount, Vec<LinRegPoint>>,
    trendlines: Vec<TrendLine>,
    time_unit: Option<TimeUnit>,
}

pub struct LinRegData {
    data: BTreeMap<GroupName, LinRegDataSet>,
}

pub struct TrendLine {
    x_start: f64,
    y_start: f64,
    x_end: f64,
    y_end: f64,
    y_index: YIndex,
}

pub struct LinearRegression {
    x_sum: f64,
    y_sum: f64,
    count: u32,
    sn: f64,
    sd: f64,
    x_min: Option<f64>,
    x_max: Option<f64>,
    y_min: f64,
    y_max: f64,
}

impl LinearRegression {
    pub fn new() -> LinearRegression {
        LinearRegression {
            x_sum: 0.0,
            y_sum: 0.0,
            count: 0,
            sn: 0.0,
            sd: 0.0,
            x_min: None,
            x_max: None,
            y_min: 0.0,
            y_max: 0.0,
        }
    }

    pub fn add(&mut self, x: f64, y: f64) {
        match self.x_min {
            None => self.x_min = Some(x),
            Some(xm) => {
                if x < xm {
                    self.x_min = Some(x);
                }
            }
        }

        match self.x_max {
            None => self.x_max = Some(x),
            Some(xm) => {
                if x > xm {
                    self.x_max = Some(x);
                }
            }
        }
        self.x_sum += x;
        self.y_sum += y;
        self.count += 1;

        let xb = self.x_sum / self.count as f64;
        let yb = self.y_sum / self.count as f64;
        self.sn += (x - xb) * (y - yb);
        self.sd += (x - xb).powi(2);
        let slope = self.sn / self.sd;
        let y_int = yb - (slope * xb);

        self.y_min = (slope * self.x_min.unwrap()) + y_int;
        self.y_max = (slope * self.x_max.unwrap()) + y_int;
    }

    pub fn trendline(&mut self, y_index: YIndex) -> TrendLine {
        TrendLine::new(
            self.x_min.unwrap(),
            self.y_min,
            self.x_max.unwrap(),
            self.y_max,
            y_index,
        )
    }
}

impl TrendLine {
    pub fn new(x_start: f64, y_start: f64, x_end: f64, y_end: f64, y_index: YIndex) -> TrendLine {
        TrendLine {
            x_start,
            y_start,
            x_end,
            y_end,
            y_index,
        }
    }

    pub fn set(&mut self, x_start: f64, y_start: f64, x_end: f64, y_end: f64) {
        self.x_start = x_start;
        self.x_end = x_end;
        self.y_start = y_start;
        self.y_end = y_end;
    }

    pub fn set_yindex(&mut self, y_index: YIndex) {
        self.y_index = y_index;
    }

    //        { i: 200, x: 50.5, tl0: 0.36 },
    pub fn to_tsx_object(&self, data_index: u16) -> String {
        format!(
            "{{i:{}, x:{}, tl{}:{}}},\n        {{i:{}, x:{}, tl{}:{}}}",
            data_index,
            self.x_start,
            self.y_index,
            self.y_start,
            data_index + 1,
            self.x_end,
            self.y_index,
            self.y_end,
        )
    }
}

impl LinRegDataSet {
    pub fn new() -> LinRegDataSet {
        LinRegDataSet {
            points: BTreeMap::<IterCount, Vec<LinRegPoint>>::new(),
            trendlines: Vec::<TrendLine>::new(),
            time_unit: None,
        }
    }

    pub fn insert(&mut self, datapoint: &CriterionDataPoint, y_index: YIndex) {
        match self.time_unit {
            None => self.time_unit = Some(datapoint.time_unit()),
            Some(tu) => {
                if tu != datapoint.time_unit() {
                    panic!(
                        "mismatched time_unit: expected: {}, actual: {}",
                        tu,
                        datapoint.time_unit()
                    );
                }
            }
        }
        let y_val: f64 = datapoint.measurement();
        let x_val = datapoint.iter_count();
        if let Some(points) = self.points.get_mut(&x_val) {
            points.push(LinRegPoint(y_val, y_index));
        } else {
            let mut points = Vec::<LinRegPoint>::with_capacity(crate::SAMPLE_SIZE);
            points.push(LinRegPoint(y_val, y_index));
            self.points.insert(x_val, points);
        }
    }

    pub fn add_trendline(&mut self, trendline: TrendLine) {
        self.trendlines.push(trendline);
    }

    pub fn write_tsx_to_file(&self, outfile: &mut File) -> Result<u16, Box<dyn Error>> {
        let mut i: u16 = 0;
        for (iter_count, y_values) in &self.points {
            write!(
                outfile,
                "        {{i:{}, x:{}, ",
                i,
                (*iter_count as f64/*/ 1000 as f64*/)
            )?;
            for y_value in y_values {
                write!(outfile, "y{}:{}}},", y_value.1, y_value.0)?;
            }
            i += 1;
            writeln!(outfile)?;
        }
        Ok(i)
    }
}

impl LinRegData {
    pub fn new() -> LinRegData {
        LinRegData {
            data: BTreeMap::<GroupName, LinRegDataSet>::new(),
        }
    }

    pub fn push(&mut self, group: &str, datapoint: &CriterionDataPoint, y_index: YIndex) {
        match self.data.get_mut(group) {
            Some(dataset) => {
                dataset.insert(datapoint, y_index);
            }
            None => {
                //Doesn't exist so add it
                let mut dataset = LinRegDataSet::new();
                dataset.insert(datapoint, y_index);
                self.data.insert(group.to_ascii_lowercase(), dataset);
            }
        }
    }

    pub fn get(&self, group: &str) -> Option<&LinRegDataSet> {
        self.data.get(group)
    }

    pub fn add_trendline(&mut self, group: &str, trendline: TrendLine) {
        match self.data.get_mut(group) {
            Some(dataset) => {
                dataset.add_trendline(trendline);
            }
            None => {
                panic!("add_trendline failed: group {} not found", group);
            }
        }
    }

    fn write_units_tsx_to_file(&self, outfile: &mut File) -> Result<(), Box<dyn Error>> {
        writeln!(
            outfile,
            "const LINEAR_REGRESSION_UNITS: UnitsMap = new Map<string, TimeUnit>(["
        )?;
        let mut data_count = 0;
        let mut time_unit: TimeUnit;
        for (group, linreg_data) in &self.data {
            match linreg_data.time_unit {
                None => panic!("Time unit not set on Linear Regression Data"),
                Some(t) => time_unit = t,
            }

            writeln!(
                outfile,
                "    [\"{}\", TimeUnit.{}]",
                group,
                time_unit.to_string()
            )?;
            data_count += 1;
            if self.data.len() > data_count + 1 {
                writeln!(outfile, ",")?;
            } else {
                writeln!(outfile, "")?;
            }
        }
        writeln!(outfile, "]));")?;
        Ok(())
    }

    pub fn write_tsx_to_file(&self, outfile: &mut File) -> Result<(), Box<dyn Error>> {
        self.write_units_tsx_to_file(outfile)?;
        writeln!(outfile, "const LINEAR_REGRESSION_DATA_MAP: Map<string, DataPoint[]> = new Map<string, DataPoint[]>([")?;
        let mut data_count = 0;
        for (group, linreg_data) in &self.data {
            writeln!(outfile, "    [\"{}\", [", group)?;

            let mut data_index = linreg_data.write_tsx_to_file(outfile)?;
            //now add in the trendlines
            let mut count = 0;
            for trendline in &linreg_data.trendlines {
                write!(outfile, "        {}", trendline.to_tsx_object(data_index))?;
                if linreg_data.trendlines.len() > count + 1 {
                    writeln!(outfile, ",")?;
                } else {
                    writeln!(outfile, "")?;
                }
                count += 1;
                data_index += 2;
            }

            write!(outfile, "    ]]")?;
            if self.data.len() > data_count + 1 {
                writeln!(outfile, ",")?;
            } else {
                writeln!(outfile, "")?;
            }
            data_count += 1;
        }
        writeln!(outfile, "]);")?;
        Ok(())
    }
}
