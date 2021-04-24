use crate::rawdata::CriterionDataPoint;
use crate::GroupName;
use crate::IterCount;
use crate::Measure;
use crate::YIndex;

use std::collections::BTreeMap;
use std::error::Error;
use std::fs::File;
use std::io::Write;

struct MTPIPoint(Measure, YIndex);

pub struct MTPIDataSet {
    //maps an x value (iteration count) to a vector of y values (time)
    points: BTreeMap<IterCount, Vec<MTPIPoint>>, // measurements
}

pub struct MTPIData {
    data: BTreeMap<GroupName, MTPIDataSet>,
}

impl MTPIDataSet {
    pub fn new() -> MTPIDataSet {
        MTPIDataSet {
            points: BTreeMap::<IterCount, Vec<MTPIPoint>>::new(),
        }
    }

    pub fn insert(&mut self, datapoint: &CriterionDataPoint, y_index: YIndex) {
        //Divide the measurement by the iter_count to get the y
        // value. The x value is the iteration count itself
        let y_val: f64 = datapoint.measurement() / (datapoint.iter_count() as f64);
        let x_val = datapoint.iter_count();
        if let Some(points) = self.points.get_mut(&x_val) {
            points.push(MTPIPoint(y_val, y_index));
        } else {
            let mut points = Vec::<MTPIPoint>::with_capacity(crate::SAMPLE_SIZE);
            points.push(MTPIPoint(y_val, y_index));
            self.points.insert(x_val, points);
        }
    }
}

impl MTPIData {
    pub fn new() -> MTPIData {
        MTPIData {
            data: BTreeMap::<GroupName, MTPIDataSet>::new(),
        }
    }

    pub fn push(&mut self, group: &str, datapoint: &CriterionDataPoint, y_index: YIndex) {
        if let Some(dataset) = self.data.get_mut(group) {
            dataset.insert(datapoint, y_index);
        } else {
            //Doesn't exist so add it
            let mut dataset = MTPIDataSet::new();
            dataset.insert(datapoint, y_index);
            self.data.insert(group.to_ascii_lowercase(), dataset);
        }
    }

    pub fn get(&self, group: &str) -> Option<&MTPIDataSet> {
        self.data.get(group)
    }

    pub fn write_tsx_to_file(&self, outfile: &mut File) -> Result<(), Box<dyn Error>> {
        writeln!(outfile, "const MEAN_TIME_PER_ITER_DATA_MAP: Map<string, DataPoint[]> = new Map<string, DataPoint[]>([")?;
        let mut data_count = 0;
        for (group, mtpi_data) in &self.data {
            writeln!(outfile, "    [\"{}\", [", group)?;
            let mut i = 0;
            for (iter_count, y_values) in &mtpi_data.points {
                write!(
                    outfile,
                    "        {{i:{}, x:{:.2}, ",
                    i,
                    (*iter_count as f64 / 1000 as f64)
                )?;
                for y_value in y_values {
                    write!(outfile, "y{}: {:.2}}}", y_value.1, y_value.0)?;
                    if mtpi_data.points.len() > i + 1 {
                        write!(outfile, ",")?;
                    }
                }
                i += 1;
                writeln!(outfile)?;
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