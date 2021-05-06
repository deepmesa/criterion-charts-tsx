use crate::{
    infomap::SeriesInfoMap,
    rawdata::CriterionData,
    tsxcode,
    tsxdata::{MeanTimeData, ToTsxFile, TotalTimeData},
    GroupName, InvalidPath,
};

use std::{error::Error, fs::File, io::Write, path::Path};

type CPlotResult<T> = std::result::Result<T, Box<dyn Error>>;

pub struct CriterionPlots {
    cdata: CriterionData,
}

pub struct CriterionPlot {
    group: GroupName,
    mean_time_data: Option<MeanTimeData>,
    total_time_data: Option<TotalTimeData>,
    series_info_map: Option<SeriesInfoMap>,
}

impl CriterionPlot {
    pub fn new(group: &str) -> CriterionPlot {
        CriterionPlot {
            group: group.to_string(),
            series_info_map: None,
            mean_time_data: None,
            total_time_data: None,
        }
    }

    pub fn set_mt_data(&mut self, mt_data: Option<MeanTimeData>) {
        self.mean_time_data = mt_data;
    }

    pub fn set_tt_data(&mut self, tt_data: Option<TotalTimeData>) {
        self.total_time_data = tt_data;
    }

    pub fn set_si_map(&mut self, si_map: Option<SeriesInfoMap>) {
        self.series_info_map = si_map
    }

    pub fn group(&self) -> &GroupName {
        &self.group
    }
}

impl CriterionPlots {
    pub fn new() -> CriterionPlots {
        CriterionPlots {
            cdata: CriterionData::new(),
        }
    }

    pub fn from_raw_files(file_paths: &[&str]) -> CPlotResult<CriterionPlots> {
        let mut cdata = CriterionData::new();
        for filepath in file_paths {
            cdata.load(filepath)?;
        }

        Ok(CriterionPlots { cdata: cdata })
    }

    pub fn load_raw_data(&mut self, filepath: &Path) -> CPlotResult<()> {
        if let Some(filepath) = filepath.to_str() {
            self.cdata.load(filepath)?;
            return Ok(());
        }
        Err(InvalidPath::new(filepath).into())
    }

    pub fn plots(&self) -> Vec<CriterionPlot> {
        let groups = self.cdata.groups();
        let mut cplots = Vec::<CriterionPlot>::new();
        for group in &groups {
            let mut cplot = CriterionPlot::new(group);

            cplot.set_si_map(self.cdata.series_info_map(Some(group)));
            cplot.set_tt_data(self.cdata.total_time_data(Some(group)));
            cplot.set_mt_data(self.cdata.mean_time_data(Some(group)));

            cplots.push(cplot);
        }

        cplots
    }
}

impl ToTsxFile for CriterionPlot {
    fn to_tsx_file(&self, tsxfile: &mut File) -> Result<(), Box<dyn Error>> {
        writeln!(tsxfile, "{}", tsxcode::PLOT_COMPONENTS_TSX).unwrap();
        if let Some(si_map) = &self.series_info_map {
            si_map.to_tsx_file(tsxfile)?;
        }

        if let Some(mt_data) = &self.mean_time_data {
            mt_data.to_tsx_file(tsxfile)?;
        }

        if let Some(tt_data) = &self.total_time_data {
            tt_data.to_tsx_file(tsxfile)?;
        }

        Ok(())
    }
}

impl ToTsxFile for CriterionPlots {
    fn to_tsx_file(&self, tsxfile: &mut File) -> Result<(), Box<dyn Error>> {
        writeln!(tsxfile, "{}", tsxcode::PLOT_COMPONENTS_TSX).unwrap();

        if let Some(si_map) = self.cdata.series_info_map(None) {
            si_map.to_tsx_file(tsxfile)?;
        }

        let mean_time_data = self.cdata.mean_time_data(None);
        if let Some(mt_data) = mean_time_data {
            mt_data.to_tsx_file(tsxfile)?;
        }

        let total_time_data = self.cdata.total_time_data(None);
        if let Some(tt_data) = total_time_data {
            tt_data.to_tsx_file(tsxfile)?;
        }

        Ok(())
    }
}
