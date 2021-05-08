use std::error::Error;
use std::fmt;
use std::fmt::Display;
use std::str::FromStr;

#[derive(Debug, Eq, PartialEq, Copy, Clone)]
pub enum TimeUnit {
    NS, //NanoSecond
    MS, //MilliSecond
}

#[derive(Debug, Clone)]
pub struct ParseTimeUnitError(String);

impl Error for ParseTimeUnitError {}

impl Display for TimeUnit {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TimeUnit::MS => write!(f, "ms"),
            TimeUnit::NS => write!(f, "ns"),
        }
    }
}

impl Display for ParseTimeUnitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "invalid measurement unit: {}", self.0)
    }
}

impl FromStr for TimeUnit {
    type Err = ParseTimeUnitError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_ascii_lowercase().as_str() {
            "ns" => Ok(Self::NS),
            "ms" => Ok(Self::MS),
            _ => Err(ParseTimeUnitError(s.to_string())),
        }
    }
}
