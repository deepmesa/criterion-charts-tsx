use crate::cplot::CriterionPlots;
use crate::tsxdata::ToTsxFile;
use crate::InvalidPath;
use std::error::Error;
use std::fs::File;
use std::path::Path;

pub struct CriterionChartsTsx {
    cplots: CriterionPlots,
}

impl CriterionChartsTsx {
    pub fn new() -> CriterionChartsTsx {
        CriterionChartsTsx {
            cplots: CriterionPlots::new(),
        }
    }

    pub fn load(&mut self, filepath: &Path) -> Result<(), Box<dyn Error>> {
        self.cplots.load_raw_data(filepath)
    }

    pub fn generate_tsx(&self, dir_path: &Path) -> Result<(), Box<dyn Error>> {
        if !dir_path.is_dir() {
            return Err(InvalidPath::new(dir_path).into());
        }
        let plots = self.cplots.plots();

        for plot in plots {
            let filename = format!("ccharts-{}.tsx", plot.group());
            let mut filepath = dir_path.to_path_buf();
            filepath.extend(Path::new(&filename));
            println!("Generating Plot data file: {}", filepath.display());
            let mut tsxfile = File::create(filepath)?;
            plot.to_tsx_file(&mut tsxfile)?;
        }

        Ok(())
    }
}
