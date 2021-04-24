/*
   Generates a tsx file using a template.

   Copyright 2021 "Rahul Singh <rsingh@arrsingh.com>"

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

use handlebars::Handlebars;
use std::error;
use std::fs::File;

pub struct TsxGenerator {
    template_path: String,
}

impl TsxGenerator {
    pub fn new(template_path: String) -> TsxGenerator {
        TsxGenerator { template_path }
    }

    //TODO: Should return a Result
    pub fn generate(&self, output_path: String) -> Result<(), Box<dyn error::Error>> {
        let mut handlebars = Handlebars::new();
        handlebars.register_template_file("tsx", self.template_path.as_str())?;
        let data = json! {
            {
                "name":"test"
            }
        };

        let outfile = File::create(&output_path.as_str())?;
        handlebars.render_to_write("tsx", &data, outfile)?;
        Ok(())
    }
}
