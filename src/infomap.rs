use std::collections::BTreeMap;

use crate::tsxdata::ToTsxFile;
use crate::FnName;
use crate::GroupName;
use crate::YIndex;

use std::error::Error;
use std::fmt;
use std::fmt::Display;
use std::fs::File;
use std::io::Write;

pub struct SeriesInfo {
    y_index: String,
    ty_index: String,
    dy_index: String,
}

pub struct StatsInfo {
    mean: f64,
    std_dev: f64,
}

pub struct InfoMap<T: ToTsxFile> {
    info_map: BTreeMap<GroupName, BTreeMap<FnName, T>>,
    map_name: String,
    info_name: String,
}

impl StatsInfo {
    pub fn new(mean: f64, std_dev: f64) -> StatsInfo {
        StatsInfo { mean, std_dev }
    }
}

impl SeriesInfo {
    pub fn new(y_index: YIndex) -> SeriesInfo {
        SeriesInfo {
            y_index: format!("y{}", y_index),
            ty_index: format!("tl{}", y_index),
            dy_index: format!("d{}", y_index),
        }
    }
}

impl Display for SeriesInfo {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{{ yIndex: \"{}\", tyIndex: \"{}\", dyIndex: \"{}\" }}",
            self.y_index, self.ty_index, self.dy_index
        )
    }
}

impl<T: ToTsxFile> InfoMap<T> {
    fn new(map_name: &str, info_name: &str) -> InfoMap<T> {
        InfoMap {
            info_map: BTreeMap::<GroupName, BTreeMap<FnName, T>>::new(),
            map_name: map_name.to_string(),
            info_name: info_name.to_string(),
        }
    }

    fn push(&mut self, group: &str, function: &str, val: T) {
        if let Some(fn_map) = self.info_map.get_mut(group) {
            fn_map.insert(function.to_ascii_lowercase(), val);
        } else {
            let mut fn_map = BTreeMap::<String, T>::new();
            fn_map.insert(function.to_ascii_lowercase(), val);
            self.info_map.insert(group.to_ascii_lowercase(), fn_map);
        }
    }
}

impl<T: ToTsxFile> ToTsxFile for InfoMap<T> {
    fn to_tsx_file(&self, tsxfile: &mut File) -> Result<(), Box<dyn Error>> {
        writeln!(
            tsxfile,
            "const {}: {}Map = new Map<string, Map<string, {}>>();",
            self.map_name, self.info_name, self.info_name
        )?;
        for (group, fn_map) in &self.info_map {
            writeln!(
                tsxfile,
                "{}.set(\"{}\", new Map<string, {}>([",
                self.map_name, group, self.info_name
            )?;
            for (fn_name, s_info) in fn_map {
                write!(tsxfile, "    [\"{}\",", fn_name)?;
                s_info.to_tsx_file(tsxfile)?;
                writeln!(tsxfile, "],")?;
            }
            writeln!(tsxfile, "]));")?;
        }
        Ok(())
    }
}

pub struct StatsInfoMap {
    smap: InfoMap<StatsInfo>,
}

pub struct SeriesInfoMap {
    imap: InfoMap<SeriesInfo>,
}

impl StatsInfoMap {
    pub fn new() -> StatsInfoMap {
        StatsInfoMap {
            smap: InfoMap::new("STATS_INFO_MAP", "StatsInfo"),
        }
    }

    pub fn push(&mut self, group: &str, function: &str, stats_info: StatsInfo) {
        self.smap.push(group, function, stats_info);
    }
}

impl SeriesInfoMap {
    pub fn new() -> SeriesInfoMap {
        SeriesInfoMap {
            imap: InfoMap::new("SERIES_INFO_MAP", "SeriesInfo"),
        }
    }

    pub fn push(&mut self, group: &str, function: &str, yindex: YIndex) {
        self.imap.push(group, function, SeriesInfo::new(yindex));
    }
}

impl ToTsxFile for SeriesInfoMap {
    fn to_tsx_file(&self, tsxfile: &mut File) -> Result<(), Box<dyn Error>> {
        self.imap.to_tsx_file(tsxfile)
    }
}

impl ToTsxFile for StatsInfoMap {
    fn to_tsx_file(&self, tsxfile: &mut File) -> Result<(), Box<dyn Error>> {
        self.smap.to_tsx_file(tsxfile)
    }
}

impl ToTsxFile for StatsInfo {
    fn to_tsx_file(&self, tsxfile: &mut File) -> Result<(), Box<dyn Error>> {
        write!(tsxfile, "{{mean:{},stdDev:{}}}", self.mean, self.std_dev)?;
        Ok(())
    }
}

impl ToTsxFile for SeriesInfo {
    fn to_tsx_file(&self, tsxfile: &mut File) -> Result<(), Box<dyn Error>> {
        write!(
            tsxfile,
            "{{yIndex:\"{}\",tyIndex:\"{}\",dyIndex:\"{}\"}}",
            self.y_index, self.ty_index, self.dy_index
        )?;
        Ok(())
    }
}
