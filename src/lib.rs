use std::error::Error;
use std::fmt;
use std::path::Path;
use std::path::PathBuf;

pub mod ccharts;
pub mod cplot;
pub mod infomap;
pub mod rawdata;
pub mod stats;
pub mod timeunit;
pub mod tsxcode;
pub mod tsxdata;

type GroupName = String;
type FnName = String;
type IterCount = u32;
type Measure = f64;
type YIndex = u16;
type Density = f64;
type KdeXVal = f64;

const SAMPLE_SIZE: usize = 100;

#[derive(Debug, Clone)]
struct InvalidPath {
    path: PathBuf,
}

impl InvalidPath {
    pub fn new(path: &Path) -> InvalidPath {
        InvalidPath {
            path: path.to_path_buf(),
        }
    }
}

impl Error for InvalidPath {}

impl fmt::Display for InvalidPath {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "invalid path:[{}]", self.path.display())
    }
}
