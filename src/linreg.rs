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

impl TrendLine {
    pub fn new(y_index: YIndex) -> TrendLine {
        TrendLine {
            x_start: 50.5,
            y_start: 0.36,
            x_end: 320.0,
            y_end: 38.2,
            y_index: y_index,
        }
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
                    //TODO: Remove the constant and do a conversion if the timeunit doesn't match
                    panic!(
                        "mismatched time_unit: expected: {}, actual: {}",
                        tu,
                        datapoint.time_unit()
                    );
                }
            }
        }
        //TODO: Remove the hardcoded constant 1000000 and do the unit conversion
        let y_val: f64 = datapoint.measurement() / 1000000 as f64;
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
                "        {{i:{}, x:{:.2}, ",
                i,
                (*iter_count as f64 / 1000 as f64)
            )?;
            for y_value in y_values {
                write!(outfile, "y{}:{:.2}}},", y_value.1, y_value.0)?;
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
            "const LINEAR_REGRESSION_UNITS: Map<string, string> = new Map<string, string>(["
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
                "    [\"{}\", \"{}\"]",
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
