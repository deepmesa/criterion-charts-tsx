#[macro_use]
extern crate serde_json;

pub mod infomap;
pub mod lrdata;
pub mod mtpi;
pub mod rawdata;
pub mod timeunit;
pub mod tsxgen;

type GroupName = String;
type FnName = String;
type IterCount = u32;
type Measure = f64;
type YIndex = u16;

const SAMPLE_SIZE: usize = 100;
