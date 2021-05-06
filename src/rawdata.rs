use std::collections::BTreeMap;
use std::collections::BTreeSet;

use crate::infomap::SeriesInfoMap;
use crate::timeunit::TimeUnit;
use crate::tsxdata::MeanTimeData;
use crate::tsxdata::TotalTimeData;
use crate::tsxdata::TsxData;
use crate::FnName;
use crate::GroupName;
use crate::IterCount;
use crate::Measure;
use crate::YIndex;

use std::error::Error;
use std::fs::File;

#[derive(Debug)]
pub struct CriterionDataPoint {
    iter_count: IterCount,
    measurement: Measure,
    time_unit: TimeUnit,
}

/// A set of raw data points.
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

    pub fn as_mean_time(&self) -> CriterionDataPoint {
        CriterionDataPoint {
            measurement: self.measurement / (self.iter_count as f64),
            iter_count: self.iter_count,
            time_unit: self.time_unit,
        }
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

    pub fn groups(&self) -> Vec<GroupName> {
        let mut groups = Vec::<GroupName>::new();
        for group_name in self.data.keys() {
            groups.push(group_name.to_string());
        }
        groups
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

    pub fn to_tsx_data<T: TsxData>(
        &self,
        group: &str,
        fn_map: &CriterionFnData,
        data: &mut T,
        mean_time: bool,
    ) {
        let mut y_index: YIndex = 0;
        for (fn_name, cdataset) in &fn_map.fn_map {
            for datapoint in &cdataset.dataset {
                if mean_time {
                    data.push(group, &fn_name, &datapoint.as_mean_time(), y_index);
                } else {
                    data.push(group, &fn_name, &datapoint, y_index);
                }
            }
            y_index += 1;
        }
    }

    pub fn mean_time_data(&self, group_name: Option<&str>) -> Option<MeanTimeData> {
        let mut mean_time_data = MeanTimeData::new();
        if let Some(group) = group_name {
            let fn_data = self.data.get(group);
            match fn_data {
                None => return None,
                Some(fn_data) => {
                    self.to_tsx_data::<MeanTimeData>(&group, fn_data, &mut mean_time_data, true);
                    return Some(mean_time_data);
                }
            }
        }

        for (group, fn_data) in &self.data {
            self.to_tsx_data::<MeanTimeData>(group, fn_data, &mut mean_time_data, true);
        }
        Some(mean_time_data)
    }

    pub fn total_time_data(&self, group_name: Option<&str>) -> Option<TotalTimeData> {
        let mut total_time_data = TotalTimeData::new();
        if let Some(group) = group_name {
            let fn_data = self.data.get(group);
            match fn_data {
                None => return None,
                Some(fn_data) => {
                    self.to_tsx_data::<TotalTimeData>(&group, fn_data, &mut total_time_data, false);
                    return Some(total_time_data);
                }
            }
        }

        for (group, fn_data) in &self.data {
            self.to_tsx_data::<TotalTimeData>(group, fn_data, &mut total_time_data, false);
        }
        Some(total_time_data)
    }

    pub fn series_info_map(&self, group_name: Option<&str>) -> Option<SeriesInfoMap> {
        let mut si_map = SeriesInfoMap::new();
        match group_name {
            None => {
                for (group, fndata) in &self.data {
                    let mut y_index: YIndex = 0;
                    for (function, _) in &fndata.fn_map {
                        si_map.push(group, function, y_index);
                        y_index += 1;
                    }
                }
            }
            Some(group_name) => {
                let fn_data = self.data.get(group_name);
                match fn_data {
                    None => return None,
                    Some(fn_data) => {
                        let mut y_index: YIndex = 0;
                        for (function, _) in &fn_data.fn_map {
                            si_map.push(&group_name, function, y_index);
                            y_index += 1;
                        }
                    }
                }
            }
        }
        Some(si_map)
    }

    pub fn load(&mut self, file_path: &str) -> Result<(), Box<dyn Error>> {
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
}
