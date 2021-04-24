use std::collections::BTreeMap;

use crate::timeunit::TimeUnit;
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
    time_unit: TimeUnit,
}

pub struct InfoMap {
    info_map: BTreeMap<GroupName, BTreeMap<FnName, SeriesInfo>>,
}

impl SeriesInfo {
    pub fn new(y_index: YIndex, time_unit: TimeUnit) -> SeriesInfo {
        SeriesInfo {
            y_index: format!("y{}", y_index),
            ty_index: format!("tl{}", y_index),
            time_unit: time_unit,
        }
    }
}

impl Display for SeriesInfo {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{{ yIndex: \"{}\", tyIndex: \"{}\", time_unit: \"{}\" }}",
            self.y_index, self.ty_index, self.time_unit
        )
    }
}

impl InfoMap {
    fn new() -> InfoMap {
        InfoMap {
            info_map: BTreeMap::<GroupName, BTreeMap<FnName, SeriesInfo>>::new(),
        }
    }

    fn push(&mut self, group: &str, function: &str, y_index: YIndex, time_unit: TimeUnit) {
        let s_info = SeriesInfo::new(y_index, time_unit);
        if let Some(fn_map) = self.info_map.get_mut(group) {
            fn_map.insert(function.to_ascii_lowercase(), s_info);
        } else {
            let mut fn_map = BTreeMap::<String, SeriesInfo>::new();
            fn_map.insert(function.to_ascii_lowercase(), s_info);
            self.info_map.insert(group.to_ascii_lowercase(), fn_map);
        }
    }

    fn write_tsx_to_file(
        &self,
        outfile: &mut File,
        map_name: &'static str,
    ) -> Result<(), Box<dyn Error>> {
        writeln!(
            outfile,
            "const {}: Map<string, Map<string, SeriesInfo>> = new Map<string, Map<string, SeriesInfo>>();",
            map_name
        )?;
        for (group, fn_map) in &self.info_map {
            writeln!(
                outfile,
                "{}.set(\"{}\", new Map<string, SeriesInfo>([",
                map_name, group
            )?;
            let mut fn_count = 0;
            for (fn_name, s_info) in fn_map {
                write!(outfile, "    [\"{}\", {}]", fn_name, s_info)?;
                if fn_map.len() > fn_count + 1 {
                    writeln!(outfile, ",")?;
                } else {
                    writeln!(outfile, "")?;
                }
                fn_count += 1;
            }
            writeln!(outfile, "]));")?;
        }
        Ok(())
    }
}

pub struct SeriesInfoMap {
    imap: InfoMap,
}

impl SeriesInfoMap {
    pub fn new() -> SeriesInfoMap {
        SeriesInfoMap {
            imap: InfoMap::new(),
        }
    }

    pub fn push(&mut self, group: &str, function: &str, yindex: YIndex, time_unit: TimeUnit) {
        self.imap.push(group, function, yindex, time_unit);
    }

    pub fn write_tsx_to_file(&self, outfile: &mut File) -> Result<(), Box<dyn Error>> {
        self.imap.write_tsx_to_file(outfile, "SERIES_INFO_MAP")
    }
}
