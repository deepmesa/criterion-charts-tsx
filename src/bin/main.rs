use criterion_charts_tsx::tsxgen::TsxGenerator;

fn main() {
    println!("Starting TsxGenerator...");
    let tsxgen = TsxGenerator::new("./template.tsx.tpl".to_string());
    match tsxgen.generate("outfile.tsx".to_string()) {
        Ok(()) => println!("Success!"),
        Err(e) => println!("Error: {}", e),
    }
}
