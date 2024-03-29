use criterion_charts_tsx::ccharts::CriterionChartsTsx;

use clap::{App, Arg};
use glob::glob;
use std::error::Error;
use std::fmt;
use std::path::Path;
use std::path::PathBuf;

#[derive(Debug, Clone)]
struct TsxGenError {
    msg: String,
}

impl TsxGenError {
    pub fn new(msg: String) -> TsxGenError {
        TsxGenError { msg }
    }
}

impl Error for TsxGenError {}

impl fmt::Display for TsxGenError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "Error: {}", self.msg)
    }
}

fn main() {
    let cmd_args = App::new("Criterion TSX Charts Generator")
        .version("0.1.0")
        .author("Rahul Singh <rsingh@arrsingh.com>")
        .about("Reads raw.csv files generated by Criterion and generates TSX code with components for displaying charts in React.")
        .arg(
            Arg::with_name("file")
                .short("f")
                .long("file")
                .takes_value(true)
                .help("Path to a single raw.csv file generated by Criteropn"),
        )
        .arg(
            Arg::with_name("dir")
                .short("d")
                .long("dir")
                .takes_value(true)
                .help("Path to a directory containing raw.csv files."),
        )
        .arg(
            Arg::with_name("output")
                .short("o")
                .long("output")
                .takes_value(true)
                .help("Path to a directory where tsx files should be created."),
        )
        .arg(
            Arg::with_name("glob")
                .short("g")
                .long("glob")
                .takes_value(true)
                .help("Glob that specifies the search if the 'dir' option is used."),
        )
        .get_matches();

    let raw_file = cmd_args.value_of("file");
    let dir_name = cmd_args.value_of("dir");

    let output_dir = cmd_args.value_of("output");
    let file_glob = cmd_args.value_of("glob");

    if raw_file.is_none() && dir_name.is_none() {
        println!("Error: Either the --file or the --dir options must be specified");
        return;
    }

    if output_dir.is_none() {
        println!("Error: Missing required option --output");
        return;
    }
    match generate_tsx(raw_file, dir_name, output_dir, file_glob) {
        Ok(()) => {}
        Err(e) => {
            println!("Error: {}", e);
            return;
        }
    }
}

fn generate_tsx(
    raw_file: Option<&str>,
    dir_name: Option<&str>,
    output_dir: Option<&str>,
    file_glob: Option<&str>,
) -> Result<(), Box<dyn Error>> {
    let mut ccharts_tsx = CriterionChartsTsx::new();

    match raw_file {
        None => {
            let filepaths = find_files(dir_name.unwrap(), file_glob)?;
            if filepaths.len() == 0 {
                println!("    Found 0 raw.csv files to load. Nothing to do");
                return Ok(());
            }
            println!("    Loading {} raw.csv files", filepaths.len());
            for filepath in &filepaths {
                println!("    Loading raw data from file: {}", filepath.display());
                ccharts_tsx.load(filepath)?;
            }
        }
        Some(filepath) => {
            if dir_name.is_some() {
                return Err(TsxGenError::new(
                    "Cannot specify the --file and --dir options together".to_string(),
                )
                .into());
            }
            println!("    Loading raw data from file: {}", filepath);
            ccharts_tsx.load(Path::new(filepath))?;
        }
    }

    ccharts_tsx.generate_tsx(Path::new(output_dir.unwrap()))
}

fn find_files(dir: &str, file_glob: Option<&str>) -> Result<Vec<PathBuf>, Box<dyn Error>> {
    let mut files = Vec::<PathBuf>::new();

    let dir_path = Path::new(dir);
    if !dir_path.is_dir() {
        return Err(
            TsxGenError::new(format!("Error: Dir {} is not valid", dir_path.display())).into(),
        );
    }

    let glob_path;
    match file_glob {
        None => {
            println!("    --glob option not specified. Defaulting to **/new/raw.csv");
            glob_path = format!("{}/**/new/raw.csv", dir_path.display());
        }
        Some(file_glob) => {
            glob_path = format!("{}/{}", dir_path.display(), file_glob);
        }
    }

    println!("    Searching for raw files matching glob {}", glob_path);

    for entry in glob(&glob_path)? {
        files.push(entry?.to_path_buf());
    }

    Ok(files)
}

// fn run() -> Result<(), Box<dyn Error>> {
//     println!("Starting Criterion Plotter...");
//     let mut ccharts_tsx = CriterionChartsTsx::new();

//     let dir =
//         Path::new("/Users/arrsingh/workspace/deepmesa-site/static/benchmarks/fastlinkedlist/");

//     //**/new/r
//     let result = ccharts_tsx.load_raw_data(dir, "**/new/raw.csv");
//     match result {
//         Ok(count) => println!("Successfully loaded {} raw data files", count),
//         Err(e) => println!("Error: {}", e),
//     }

//     ccharts_tsx.generate_tsx(Path::new("./target"))?;
//     Ok(())
// }
