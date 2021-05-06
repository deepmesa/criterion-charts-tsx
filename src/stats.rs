use crate::{infomap::StatsInfo, Density, KdeXVal, SAMPLE_SIZE};

pub struct UvAnalysis {
    fn_name: String,
    sample: Vec<f64>,
    sigma_x: f64,
    sigma_xsq: f64,
    n: u32,
    x_bar: f64,
    x_min: Option<f64>,
    x_max: Option<f64>,
}

impl UvAnalysis {
    pub fn new(fn_name: String) -> UvAnalysis {
        UvAnalysis {
            fn_name: fn_name,
            sample: Vec::<f64>::with_capacity(SAMPLE_SIZE),
            sigma_x: 0.0,
            sigma_xsq: 0.0,
            n: 0,
            x_bar: 0.0,
            x_min: None,
            x_max: None,
        }
    }

    pub fn add(&mut self, val: f64) {
        self.sample.push(val);
        self.sigma_x += val as f64;
        self.sigma_xsq += val.powi(2) as f64;
        self.n += 1;
        self.x_bar = self.sigma_x / self.n as f64;

        match self.x_min {
            None => self.x_min = Some(val),
            Some(xm) => {
                if val < xm {
                    self.x_min = Some(val);
                }
            }
        }

        match self.x_max {
            None => self.x_max = Some(val),
            Some(xm) => {
                if val > xm {
                    self.x_max = Some(val);
                }
            }
        }
    }

    pub fn fn_name(&self) -> &String {
        &self.fn_name
    }

    pub fn variance(&self) -> f64 {
        (self.sigma_xsq - (self.sigma_x.powi(2) / self.n as f64)) / (self.n - 1) as f64
    }

    pub fn std_dev(&self) -> f64 {
        self.variance().sqrt()
    }

    pub fn mean(&self) -> f64 {
        self.x_bar
    }

    fn kde_bw(&self) -> f64 {
        self.std_dev() * ((4.0 / (3.0 * self.n as f64)) as f64).powf((1.0 / 5.0) as f64)
    }

    pub fn stats_info(&self) -> StatsInfo {
        StatsInfo::new(self.x_bar, self.std_dev())
    }

    pub fn kdensity(&self, x_range: u16) -> KdeDataSet {
        let bandwidth = self.kde_bw();
        let kde = Kde::<GaussianKernel>::new(GaussianKernel, bandwidth, &self.sample);
        let xmin: f64 = self.x_min.unwrap();
        let xmax: f64 = self.x_max.unwrap();
        let start = xmin - 3.0 * bandwidth;
        let end = xmax + 3.0 * bandwidth;

        let bin_size: f64 = (end - start) / (x_range - 1) as f64;
        let mut kde_dataset = KdeDataSet::new();

        for i in 0..x_range {
            let x: f64 = start + (bin_size * i as f64);
            let di = kde.estimate(x);
            kde_dataset.push(x, di);
        }
        kde_dataset
    }
}

pub struct Kde<'a, K: Kernel> {
    kernel: K,
    bandwidth: f64,
    sample: &'a Vec<f64>,
    n: u32,
}

impl<'a, K: Kernel> Kde<'a, K> {
    pub fn new(kernel: K, bandwidth: f64, sample: &Vec<f64>) -> Kde<K> {
        Kde {
            kernel,
            bandwidth,
            sample,
            n: sample.len() as u32,
        }
    }

    fn kernel(&self, x: f64) -> f64 {
        let mut sum: f64 = 0.0;
        for xi in self.sample {
            sum += self.kernel.kernel((x - xi) as f64 / self.bandwidth);
        }

        return sum;
    }

    pub fn estimate(&self, x: f64) -> f64 {
        let sigma_kx = self.kernel(x);
        return sigma_kx / (self.n as f64 * self.bandwidth);
    }
}

pub struct GaussianKernel;

pub trait Kernel {
    fn kernel(&self, x: f64) -> f64;
}

//https://en.wikipedia.org/wiki/Kernel_(statistics)#Kernel_functions_in_common_use
impl Kernel for GaussianKernel {
    fn kernel(&self, x: f64) -> f64 {
        let exp_sqrt = (x.powi(2)).exp().sqrt();
        let two_pi_sqrt = (2 as f64 * std::f32::consts::PI as f64).sqrt();
        (exp_sqrt * two_pi_sqrt).recip()
    }
}

pub struct BvAnalysis {
    sigma_x: f64,
    sigma_y: f64,
    n: u32,
    x_bar: f64,
    y_bar: f64,
    sn: f64, // Numerator of the slope: Sigma (x-x_bar)*(y-y_bar)
    sd: f64, // Denominator of the slope: Sigma (x-x_bar)^2
    x_min: Option<f64>,
    x_max: Option<f64>,
    y_min: f64,
    y_max: f64,
}

impl BvAnalysis {
    pub fn new() -> BvAnalysis {
        BvAnalysis {
            sigma_x: 0.0,
            sigma_y: 0.0,
            n: 0,
            x_bar: 0.0,
            y_bar: 0.0,
            sn: 0.0, // Numerator of the slope: Sigma (x-x_bar)*(y-y_bar)
            sd: 0.0, // Denominator of the slope: Sigma (x-x_bar)^2
            x_min: None,
            x_max: None,
            y_min: 0.0,
            y_max: 0.0,
        }
    }

    pub fn add(&mut self, x: f64, y: f64) {
        match self.x_min {
            None => self.x_min = Some(x),
            Some(xm) => {
                if x < xm {
                    self.x_min = Some(x);
                }
            }
        }

        match self.x_max {
            None => self.x_max = Some(x),
            Some(xm) => {
                if x > xm {
                    self.x_max = Some(x);
                }
            }
        }
        self.sigma_x += x;
        self.sigma_y += y;
        self.n += 1;

        self.x_bar = self.sigma_x / self.n as f64;
        self.y_bar = self.sigma_y / self.n as f64;
        self.sn += (x - self.x_bar) * (y - self.y_bar);
        self.sd += (x - self.x_bar).powi(2);
        let slope = self.sn / self.sd;
        let y_int = self.y_bar - (slope * self.x_bar);

        self.y_min = (slope * self.x_min.unwrap()) + y_int;
        self.y_max = (slope * self.x_max.unwrap()) + y_int;
    }

    pub fn trendline(&self) -> TrendLine {
        TrendLine::new(
            self.x_min.unwrap(),
            self.y_min,
            self.x_max.unwrap(),
            self.y_max,
        )
    }
}

pub struct TrendLine {
    x_start: f64,
    y_start: f64,
    x_end: f64,
    y_end: f64,
}

impl TrendLine {
    pub fn new(x_start: f64, y_start: f64, x_end: f64, y_end: f64) -> TrendLine {
        TrendLine {
            x_start,
            y_start,
            x_end,
            y_end,
        }
    }

    pub fn x_start(&self) -> f64 {
        self.x_start
    }

    pub fn y_start(&self) -> f64 {
        self.y_start
    }

    pub fn x_end(&self) -> f64 {
        self.x_end
    }

    pub fn y_end(&self) -> f64 {
        self.y_end
    }
}

pub struct KdeDataPoint {
    x_val: KdeXVal,
    density: Density,
}

impl KdeDataPoint {
    pub fn new(x_val: KdeXVal, density: Density) -> KdeDataPoint {
        KdeDataPoint { x_val, density }
    }

    pub fn x_val(&self) -> &KdeXVal {
        &self.x_val
    }

    pub fn density(&self) -> &Density {
        &self.density
    }
}

pub struct KdeDataSet {
    points: Vec<KdeDataPoint>,
}

impl KdeDataSet {
    pub fn new() -> KdeDataSet {
        KdeDataSet {
            points: Vec::<KdeDataPoint>::new(),
        }
    }

    pub fn push(&mut self, x_val: KdeXVal, density: Density) {
        self.points.push(KdeDataPoint::new(x_val, density));
    }

    pub fn points(&self) -> &Vec<KdeDataPoint> {
        &self.points
    }
}
