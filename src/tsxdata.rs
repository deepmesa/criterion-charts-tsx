use crate::timeunit::TimeUnit;
use crate::{infomap::StatsInfoMap, rawdata::CriterionDataPoint, stats::KdeDataSet};

use crate::Density;
use crate::GroupName;
use crate::IterCount;
use crate::KdeXVal;
use crate::Measure;
use crate::YIndex;

use crate::stats::BvAnalysis;
use crate::stats::UvAnalysis;

use std::collections::BTreeMap;
use std::error::Error;
use std::fs::File;
use std::io::Write;

pub trait ToTsxFile {
    fn to_tsx_file(&self, tsxfile_path: &mut File) -> Result<(), Box<dyn Error>>;
}

pub trait TsxData {
    fn data(&self) -> &TsxDataMap;
    fn data_mut(&mut self) -> &mut TsxDataMap;

    fn push(
        &mut self,
        group: &str,
        fn_name: &str,
        datapoint: &CriterionDataPoint,
        y_index: YIndex,
    ) {
        self.data_mut().push(group, fn_name, datapoint, y_index);
    }

    fn get(&self, group: &str) -> Option<&TsxDataSet> {
        self.data().get(group)
    }
}

struct TsxYDataPoint(Measure, YIndex);

pub struct TsxDataSet {
    points: BTreeMap<IterCount, Vec<TsxYDataPoint>>,
    uv_analysis: BTreeMap<YIndex, UvAnalysis>,
    bv_analysis: BTreeMap<YIndex, BvAnalysis>,
    time_unit: Option<TimeUnit>,
    trendlines: bool,
}

impl TsxDataSet {
    pub fn new(trendlines: bool) -> TsxDataSet {
        TsxDataSet {
            points: BTreeMap::<IterCount, Vec<TsxYDataPoint>>::new(),
            uv_analysis: BTreeMap::<YIndex, UvAnalysis>::new(),
            bv_analysis: BTreeMap::<YIndex, BvAnalysis>::new(),
            time_unit: None,
            trendlines: trendlines,
        }
    }

    pub fn get_uv_stats(&self, group: &str, si_map: &mut StatsInfoMap) {
        for (_, uva) in &self.uv_analysis {
            let s_info = uva.stats_info();
            let fn_name = uva.fn_name();
            si_map.push(group, fn_name, s_info);
        }
    }

    pub fn insert(&mut self, fn_name: &str, datapoint: &CriterionDataPoint, y_index: YIndex) {
        //TODO: Convert the time to the right unit rather than panicing
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
        let time_val: f64 = datapoint.measurement(); //y_val
        let iter_val = datapoint.iter_count(); //x_val
        if let Some(points) = self.points.get_mut(&iter_val) {
            points.push(TsxYDataPoint(time_val, y_index));
        } else {
            let mut points = Vec::<TsxYDataPoint>::with_capacity(crate::SAMPLE_SIZE);
            points.push(TsxYDataPoint(time_val, y_index));
            self.points.insert(iter_val, points);
        }

        if let Some(uva) = self.uv_analysis.get_mut(&y_index) {
            uva.add(time_val);
        } else {
            let mut uva = UvAnalysis::new(fn_name.to_string());
            uva.add(time_val);
            self.uv_analysis.insert(y_index, uva);
        }

        if self.trendlines {
            if let Some(bva) = self.bv_analysis.get_mut(&y_index) {
                bva.add(iter_val as f64, time_val);
            } else {
                let mut bva = BvAnalysis::new();
                bva.add(iter_val as f64, time_val);
                self.bv_analysis.insert(y_index, bva);
            }
        }
    }

    pub fn to_pdf_data(&self) -> PdfDataSet {
        let mut pdf_data = PdfDataSet::new();
        for (iter_count, y_values) in &self.points {
            for y_value in y_values {
                pdf_data.add_measurement(y_value.0, y_value.1, *iter_count);
            }
        }

        for (y_index, uva) in &self.uv_analysis {
            let kde_data = &uva.kdensity(500);
            pdf_data.add_kde_data(kde_data, *y_index);
        }
        pdf_data.sort();
        pdf_data
    }
}

impl ToTsxFile for TsxDataSet {
    fn to_tsx_file(&self, tsxfile: &mut File) -> Result<(), Box<dyn Error>> {
        let mut i: u16 = 0;
        for (iter_count, y_values) in &self.points {
            write!(tsxfile, "        {{i:{},x:{},", i, (*iter_count as f64))?;
            for y_value in y_values {
                write!(tsxfile, "y{}:{},", y_value.1, y_value.0)?;
            }
            writeln!(tsxfile, "}},")?;
            i += 1;
        }
        if !self.trendlines {
            return Ok(());
        }

        //Now write the trendline data
        for (y_index, bva) in &self.bv_analysis {
            let trendline = bva.trendline();
            writeln!(
                tsxfile,
                "        {{i:{},x:{},tl{}:{}}},",
                i,
                trendline.x_start(),
                y_index,
                trendline.y_start()
            )?;
            i += 1;
            writeln!(
                tsxfile,
                "        {{i:{},x:{},tl{}:{}}},",
                i,
                trendline.x_end(),
                y_index,
                trendline.y_end()
            )?;
            i += 1;
        }
        Ok(())
    }
}

pub struct TsxDataMap {
    data: BTreeMap<GroupName, TsxDataSet>,
    dataset_name: String,
    trendlines: bool,
    pdfdata: bool,
}

impl TsxDataMap {
    pub fn new(dataset_name: &str, trendlines: bool, pdfdata: bool) -> TsxDataMap {
        TsxDataMap {
            data: BTreeMap::<GroupName, TsxDataSet>::new(),
            dataset_name: dataset_name.to_ascii_uppercase(),
            trendlines: trendlines,
            pdfdata: pdfdata,
        }
    }

    pub fn push(
        &mut self,
        group: &str,
        fn_name: &str,
        datapoint: &CriterionDataPoint,
        y_index: YIndex,
    ) {
        match self.data.get_mut(group) {
            Some(dataset) => {
                dataset.insert(fn_name, datapoint, y_index);
            }
            None => {
                //Doesn't exist so add it
                let mut dataset = TsxDataSet::new(self.trendlines);
                dataset.insert(fn_name, datapoint, y_index);
                self.data.insert(group.to_ascii_lowercase(), dataset);
            }
        }
    }

    pub fn get(&self, group: &str) -> Option<&TsxDataSet> {
        self.data.get(group)
    }

    fn write_units_tsx_to_file(&self, tsxfile: &mut File) -> Result<(), Box<dyn Error>> {
        writeln!(
            tsxfile,
            "const {}_UNITS: UnitsMap = new Map<string, TimeUnit>([",
            self.dataset_name
        )?;
        let mut stats_info_map = StatsInfoMap::new();

        let mut time_unit: TimeUnit;
        for (group, tsx_data) in &self.data {
            match tsx_data.time_unit {
                None => panic!("Time unit not set on Linear Regression Data"),
                Some(t) => time_unit = t,
            }

            if self.pdfdata {
                tsx_data.get_uv_stats(group, &mut stats_info_map);
            }

            writeln!(
                tsxfile,
                "    [\"{}\", TimeUnit.{}],",
                group,
                time_unit.to_string()
            )?;
        }
        writeln!(tsxfile, "]);")?;
        if self.pdfdata {
            stats_info_map.to_tsx_file(tsxfile)?;
        }
        Ok(())
    }
}

impl ToTsxFile for TsxDataMap {
    fn to_tsx_file(&self, tsxfile: &mut File) -> Result<(), Box<dyn Error>> {
        self.write_units_tsx_to_file(tsxfile)?;
        writeln!(
            tsxfile,
            "const {}_MAP: Map<string, DataPoint[]> = new Map<string, DataPoint[]>([",
            self.dataset_name
        )?;
        for (group, tsx_data) in &self.data {
            writeln!(tsxfile, "    [\"{}\", [", group)?;
            tsx_data.to_tsx_file(tsxfile)?;
            writeln!(tsxfile, "    ]]")?;
        }
        writeln!(tsxfile, "]);")?;

        if self.pdfdata {
            for (group, tsx_data) in &self.data {
                writeln!(
                    tsxfile,
                    "const PDF_DATA_MAP: Map<string, DataPoint[]> = new Map<string, DataPoint[]>([",
                )?;
                writeln!(tsxfile, "    [\"{}\", [", group)?;
                let pdf_data = tsx_data.to_pdf_data();
                pdf_data.to_tsx_file(tsxfile)?;
                writeln!(tsxfile, "    ]]")?;
            }
            writeln!(tsxfile, "]);")?;
        }
        Ok(())
    }
}

pub struct MeanTimeData {
    data: TsxDataMap,
}

impl MeanTimeData {
    pub fn new() -> MeanTimeData {
        MeanTimeData {
            data: TsxDataMap::new("MEAN_TIME_DATA", false, true),
        }
    }
}

impl ToTsxFile for MeanTimeData {
    fn to_tsx_file(&self, tsxfile_path: &mut File) -> Result<(), Box<dyn Error>> {
        self.data.to_tsx_file(tsxfile_path)
    }
}

impl TsxData for MeanTimeData {
    fn data(&self) -> &TsxDataMap {
        &self.data
    }

    fn data_mut(&mut self) -> &mut TsxDataMap {
        &mut self.data
    }
}

pub struct TotalTimeData {
    data: TsxDataMap,
}

impl TotalTimeData {
    pub fn new() -> TotalTimeData {
        TotalTimeData {
            data: TsxDataMap::new("TOTAL_TIME_DATA", true, false),
        }
    }
}

impl ToTsxFile for TotalTimeData {
    fn to_tsx_file(&self, tsxfile_path: &mut File) -> Result<(), Box<dyn Error>> {
        self.data.to_tsx_file(tsxfile_path)
    }
}

impl TsxData for TotalTimeData {
    fn data(&self) -> &TsxDataMap {
        &self.data
    }

    fn data_mut(&mut self) -> &mut TsxDataMap {
        &mut self.data
    }
}

struct PdfDataPoint {
    x_val: Measure,
    y_values: String,
}

impl PdfDataPoint {
    pub fn from_measurement(
        x_val: Measure,
        y_index: YIndex,
        iter_count: IterCount,
    ) -> PdfDataPoint {
        PdfDataPoint {
            x_val,
            y_values: format!("y{}:{}", y_index, iter_count),
        }
    }

    pub fn from_kde_data(x_val: KdeXVal, y_index: YIndex, density: Density) -> PdfDataPoint {
        PdfDataPoint {
            x_val,
            y_values: format!("d{}:{}", y_index, density),
        }
    }

    pub fn x_val(&self) -> Measure {
        self.x_val
    }

    pub fn y_values(&self) -> &str {
        self.y_values.as_str()
    }
}

pub struct PdfDataSet {
    data: Vec<PdfDataPoint>,
}

impl PdfDataSet {
    pub fn new() -> PdfDataSet {
        PdfDataSet {
            data: Vec::<PdfDataPoint>::new(),
        }
    }

    pub fn add_measurement(
        &mut self,
        measurement: Measure,
        y_index: YIndex,
        iter_count: IterCount,
    ) {
        self.data.push(PdfDataPoint::from_measurement(
            measurement,
            y_index,
            iter_count,
        ));
    }

    pub fn add_kde_data(&mut self, kde_data: &KdeDataSet, y_index: YIndex) {
        for point in kde_data.points() {
            self.data.push(PdfDataPoint::from_kde_data(
                *point.x_val(),
                y_index,
                *point.density(),
            ));
        }
    }

    pub fn sort(&mut self) {
        self.data
            .sort_by(|a, b| a.x_val.partial_cmp(&b.x_val).unwrap());
    }
}

impl ToTsxFile for PdfDataSet {
    fn to_tsx_file(&self, tsxfile: &mut File) -> Result<(), Box<dyn Error>> {
        let mut i = 0;
        for v in &self.data {
            writeln!(
                tsxfile,
                "        {{i:{},x:{},{}}},",
                i,
                v.x_val(),
                v.y_values()
            )?;
            i += 1;
        }
        Ok(())
    }
}
