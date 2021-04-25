use std::collections::BTreeMap;
use std::collections::BTreeSet;

use crate::infomap::SeriesInfoMap;
use crate::lrdata::LinRegData;
use crate::lrdata::LinearRegression;
use crate::mtpi::MTPIData;
use crate::timeunit::TimeUnit;
use crate::FnName;
use crate::GroupName;
use crate::IterCount;
use crate::Measure;
use crate::YIndex;

use std::error::Error;
use std::fs::File;

pub struct CriterionDataPoint {
    iter_count: IterCount,
    measurement: Measure,
    time_unit: TimeUnit,
}

pub struct CriterionDataSet {
    dataset: Vec<CriterionDataPoint>,
}

pub struct CriterionFnData {
    fn_map: BTreeMap<FnName, CriterionDataSet>,
    fn_names: BTreeSet<FnName>,
}

pub struct CriterionData {
    data: BTreeMap<GroupName, CriterionFnData>,
}

impl CriterionDataPoint {
    pub fn new(
        measurement: Measure,
        iter_count: IterCount,
        time_unit: TimeUnit,
    ) -> CriterionDataPoint {
        CriterionDataPoint {
            iter_count,
            measurement,
            time_unit,
        }
    }

    pub fn iter_count(&self) -> IterCount {
        self.iter_count
    }

    pub fn measurement(&self) -> Measure {
        self.measurement
    }

    pub fn time_unit(&self) -> TimeUnit {
        self.time_unit
    }
}

impl CriterionDataSet {
    pub fn new() -> CriterionDataSet {
        CriterionDataSet {
            dataset: Vec::<CriterionDataPoint>::with_capacity(crate::SAMPLE_SIZE),
        }
    }

    pub fn insert(&mut self, measurement: Measure, iter_count: IterCount, time_unit: TimeUnit) {
        let datapoint = CriterionDataPoint::new(measurement, iter_count, time_unit);
        self.dataset.push(datapoint);
    }

    pub fn get(&self, index: usize) -> Option<&CriterionDataPoint> {
        self.dataset.get(index)
    }

    pub fn len(&self) -> usize {
        self.dataset.len()
    }
}

impl CriterionFnData {
    pub fn new() -> CriterionFnData {
        CriterionFnData {
            fn_map: BTreeMap::<FnName, CriterionDataSet>::new(),
            fn_names: BTreeSet::<FnName>::new(),
        }
    }
    pub fn insert(
        &mut self,
        function: FnName,
        measurement: Measure,
        iter_count: IterCount,
        time_unit: TimeUnit,
    ) {
        let function_key = function.to_ascii_lowercase();
        match self.fn_map.get_mut(&function_key) {
            None => {
                let mut c_dataset = CriterionDataSet::new();
                c_dataset.insert(measurement, iter_count, time_unit);
                self.fn_map.insert(function_key, c_dataset);
                self.fn_names.insert(function);
            }
            Some(c_dataset) => {
                c_dataset.insert(measurement, iter_count, time_unit);
            }
        }
    }
    pub fn get(&self, function: &str) -> Option<&CriterionDataSet> {
        self.fn_map.get(&function.to_ascii_lowercase())
    }
}

impl CriterionData {
    pub fn new() -> CriterionData {
        CriterionData {
            data: BTreeMap::<GroupName, CriterionFnData>::new(),
        }
    }

    pub fn insert(
        &mut self,
        group: GroupName,
        function: FnName,
        measurement: Measure,
        iter_count: IterCount,
        time_unit: TimeUnit,
    ) {
        let group_key = group.to_ascii_lowercase();
        match self.data.get_mut(&group_key) {
            None => {
                let mut fn_data = CriterionFnData::new();
                fn_data.insert(function, measurement, iter_count, time_unit);
                self.data.insert(group_key, fn_data);
            }
            Some(fn_data) => {
                fn_data.insert(function, measurement, iter_count, time_unit);
            }
        };
    }

    pub fn get(&self, group: &str) -> Option<&CriterionFnData> {
        self.data.get(&group.to_ascii_lowercase())
    }

    pub fn to_mtpi_data(&self) -> MTPIData {
        let mut mtpi_data = MTPIData::new();
        for (group, fndata) in &self.data {
            //fndata is a map of function name to data for that function
            //iterate over all functions and aggregate the samples for
            // each into a single vector of - i.e. an MTPIDataSet
            let mut y_index: YIndex = 0;
            for (_, cdataset) in &fndata.fn_map {
                for datapoint in &cdataset.dataset {
                    mtpi_data.push(group, datapoint, y_index);
                }
                y_index += 1;
            }
        }
        mtpi_data
    }

    pub fn to_linreg_data(&self) -> LinRegData {
        let mut linreg_data = LinRegData::new();
        for (group, fndata) in &self.data {
            let mut y_index: YIndex = 0;
            for (_, cdataset) in &fndata.fn_map {
                let mut lr = LinearRegression::new();
                for datapoint in &cdataset.dataset {
                    linreg_data.push(group, datapoint, y_index);
                    lr.add(datapoint.iter_count() as f64, datapoint.measurement());
                }
                linreg_data.add_trendline(group, lr.trendline(y_index));
                y_index += 1;
            }
        }
        linreg_data
    }

    pub fn to_series_info_map(&self) -> SeriesInfoMap {
        let mut si_map = SeriesInfoMap::new();
        for (group, fndata) in &self.data {
            let mut y_index: YIndex = 0;
            for (function, _) in &fndata.fn_map {
                si_map.push(group, function, y_index);
                y_index += 1;
            }
        }

        si_map
    }

    pub fn load(&mut self, file_path: String) -> Result<(), Box<dyn Error>> {
        let file = File::open(file_path)?;
        let mut rdr = csv::ReaderBuilder::new().from_reader(file);

        for result in rdr.records() {
            let record = result?;
            self.insert(
                record[0].to_string(),
                record[1].to_string(),
                record[5].parse::<Measure>()?,
                record[7].parse::<IterCount>()?,
                record[6].parse::<TimeUnit>()?,
            );
        }
        Ok(())
    }
}

#[cfg(test)]
pub mod test {
    use super::*;

    #[test]
    fn test_cdata() {
        let mut cdata = CriterionData::new();
        let measurement: Measure = 54.625;
        let iter_count: IterCount = 81928;
        cdata.insert(
            "Push".to_string(),
            "Fll-NoAlloc-Push".to_string(),
            measurement,
            iter_count,
            super::TimeUnit::NS,
        );

        let fn_data: &CriterionFnData;
        if let Some(fnd) = cdata.get("Push") {
            fn_data = fnd;
        } else {
            assert!(false);
            return;
        }

        let c_dataset: &CriterionDataSet;
        if let Some(cds) = fn_data.get("Fll-NoAlloc-Push") {
            c_dataset = cds;
        } else {
            assert!(false);
            return;
        }

        if let Some(cdp) = c_dataset.get(0) {
            assert_eq!(iter_count, cdp.iter_count());
            assert_eq!(measurement, cdp.measurement());
        } else {
            assert!(false);
        }
    }

    #[test]
    fn test_load() {
        let mut cdata = CriterionData::new();
        cdata.load("./raw-1.csv".to_string()).unwrap();
        cdata.load("./raw-2.csv".to_string()).unwrap();
        let mtpi_data = cdata.to_mtpi_data();
        let sn_map = cdata.to_series_info_map();
        let mut outfile = File::create("./mtpi.tsx").unwrap();
        sn_map.write_tsx_to_file(&mut outfile).unwrap();
        mtpi_data.write_tsx_to_file(&mut outfile).unwrap();
        let mut linreg_file = File::create("./linreg.tsx").unwrap();
        let linreg_data = cdata.to_linreg_data();
        linreg_data.write_tsx_to_file(&mut linreg_file).unwrap();

        // let mtpi_push = mtpi_data.get("push").unwrap();
        // for (iter_count, y_values) in &mtpi_push.points {
        //     let mut i = 0;
        //     print!("i: {}, x: {}, : ", i, iter_count);
        //     for y_value in y_values {
        //         print!("y{}: {}", y_value.1, y_value.0);
        //         i += 1;
        //     }
        //     println!();
        // }
    }
}
