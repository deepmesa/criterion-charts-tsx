const SERIES_INFO_MAP: Map<string, Map<string, SeriesInfo>> = new Map<string, Map<string, SeriesInfo>>();
SERIES_INFO_MAP.set("push", new Map<string, SeriesInfo>([
    ["fll-noalloc-back", { yIndex: "y0", tyIndex: "tl0", time_unit: "ns" }],
    ["fll-noalloc-front", { yIndex: "y1", tyIndex: "tl1", time_unit: "ns" }]
]));
const MEAN_TIME_PER_ITER_DATA_MAP: Map<string, DataPoint[]> = new Map<string, DataPoint[]>([
    ["push", [
        {i:0, x:6.43, y1: 54.89},
        {i:1, x:6.44, y0: 55.89},
        {i:2, x:12.86, y1: 53.00},
        {i:3, x:12.89, y0: 54.03},
        {i:4, x:19.29, y1: 53.51},
        {i:5, x:19.33, y0: 54.42},
        {i:6, x:25.72, y1: 53.05},
        {i:7, x:25.77, y0: 54.32},
        {i:8, x:32.15, y1: 53.40},
        {i:9, x:32.22, y0: 54.09},
        {i:10, x:38.57, y1: 53.39},
        {i:11, x:38.66, y0: 54.41},
        {i:12, x:45.00, y1: 53.26},
        {i:13, x:45.10, y0: 54.51},
        {i:14, x:51.43, y1: 53.40},
        {i:15, x:51.54, y0: 54.60},
        {i:16, x:57.86, y1: 53.33},
        {i:17, x:57.99, y0: 54.09},
        {i:18, x:64.29, y1: 53.22},
        {i:19, x:64.43, y0: 54.40},
        {i:20, x:70.72, y1: 53.40},
        {i:21, x:70.87, y0: 54.22},
        {i:22, x:77.15, y1: 53.49},
        {i:23, x:77.32, y0: 54.20},
        {i:24, x:83.58, y1: 53.39},
        {i:25, x:83.76, y0: 54.18},
        {i:26, x:90.01, y1: 53.42},
        {i:27, x:90.20, y0: 54.14},
        {i:28, x:96.44, y1: 53.07},
        {i:29, x:96.64, y0: 54.45},
        {i:30, x:102.86, y1: 53.40},
        {i:31, x:103.09, y0: 54.29},
        {i:32, x:109.29, y1: 53.30},
        {i:33, x:109.53, y0: 54.25},
        {i:34, x:115.72, y1: 53.52},
        {i:35, x:115.97, y0: 54.26},
        {i:36, x:122.15, y1: 53.59},
        {i:37, x:122.42, y0: 54.50},
        {i:38, x:128.58, y1: 53.55},
        {i:39, x:128.86, y0: 54.56},
        {i:40, x:135.01, y1: 53.34},
        {i:41, x:135.30, y0: 54.39},
        {i:42, x:141.44, y1: 53.20},
        {i:43, x:141.75, y0: 54.32},
        {i:44, x:147.87, y1: 53.36},
        {i:45, x:148.19, y0: 54.44},
        {i:46, x:154.30, y1: 53.36},
        {i:47, x:154.63, y0: 54.32},
        {i:48, x:160.72, y1: 53.29},
        {i:49, x:161.07, y0: 54.51},
        {i:50, x:167.15, y1: 53.33},
        {i:51, x:167.52, y0: 54.34},
        {i:52, x:173.58, y1: 53.45},
        {i:53, x:173.96, y0: 54.25},
        {i:54, x:180.01, y1: 53.28},
        {i:55, x:180.40, y0: 54.56},
        {i:56, x:186.44, y1: 53.74},
        {i:57, x:186.85, y0: 54.15},
        {i:58, x:192.87, y1: 53.49},
        {i:59, x:193.29, y0: 54.47},
        {i:60, x:199.30, y1: 53.32},
        {i:61, x:199.73, y0: 54.24},
        {i:62, x:205.73, y1: 53.41},
        {i:63, x:206.18, y0: 54.36},
        {i:64, x:212.16, y1: 53.42},
        {i:65, x:212.62, y0: 54.33},
        {i:66, x:218.59, y1: 53.50},
        {i:67, x:219.06, y0: 54.27},
        {i:68, x:225.01, y1: 53.32},
        {i:69, x:225.50, y0: 54.39},
        {i:70, x:231.44, y1: 53.45},
        {i:71, x:231.95, y0: 54.34},
        {i:72, x:237.87, y1: 53.48},
        {i:73, x:238.39, y0: 54.34},
        {i:74, x:244.30, y1: 53.44},
        {i:75, x:244.83, y0: 54.44},
        {i:76, x:250.73, y1: 53.39},
        {i:77, x:251.28, y0: 54.27},
        {i:78, x:257.16, y1: 53.33},
        {i:79, x:257.72, y0: 54.34},
        {i:80, x:263.59, y1: 53.40},
        {i:81, x:264.16, y0: 54.25},
        {i:82, x:270.02, y1: 53.28},
        {i:83, x:270.61, y0: 54.31},
        {i:84, x:276.45, y1: 53.33},
        {i:85, x:277.05, y0: 54.30},
        {i:86, x:282.88, y1: 53.33},
        {i:87, x:283.49, y0: 54.23},
        {i:88, x:289.31, y1: 53.30},
        {i:89, x:289.94, y0: 54.26},
        {i:90, x:295.73, y1: 53.44},
        {i:91, x:296.38, y0: 54.36},
        {i:92, x:302.16, y1: 53.35},
        {i:93, x:302.82, y0: 54.31},
        {i:94, x:308.59, y1: 53.42},
        {i:95, x:309.26, y0: 54.22},
        {i:96, x:315.02, y1: 53.43},
        {i:97, x:315.71, y0: 54.35},
        {i:98, x:321.45, y1: 53.37},
        {i:99, x:322.15, y0: 54.21},
        {i:100, x:327.88, y1: 53.34},
        {i:101, x:328.59, y0: 54.29},
        {i:102, x:334.31, y1: 53.36},
        {i:103, x:335.04, y0: 54.22},
        {i:104, x:340.74, y1: 53.28},
        {i:105, x:341.48, y0: 54.32},
        {i:106, x:347.17, y1: 53.40},
        {i:107, x:347.92, y0: 54.25},
        {i:108, x:353.60, y1: 53.30},
        {i:109, x:354.37, y0: 54.26},
        {i:110, x:360.02, y1: 53.30},
        {i:111, x:360.81, y0: 54.21},
        {i:112, x:366.45, y1: 53.16},
        {i:113, x:367.25, y0: 54.04},
        {i:114, x:372.88, y1: 53.43},
        {i:115, x:373.69, y0: 54.11},
        {i:116, x:379.31, y1: 53.39},
        {i:117, x:380.14, y0: 54.05},
        {i:118, x:385.74, y1: 53.38},
        {i:119, x:386.58, y0: 54.02},
        {i:120, x:392.17, y1: 53.15},
        {i:121, x:393.02, y0: 54.29},
        {i:122, x:398.60, y1: 53.31},
        {i:123, x:399.47, y0: 54.11},
        {i:124, x:405.03, y1: 53.25},
        {i:125, x:405.91, y0: 54.22},
        {i:126, x:411.46, y1: 53.15},
        {i:127, x:412.35, y0: 54.25},
        {i:128, x:417.88, y1: 53.23},
        {i:129, x:418.80, y0: 54.20},
        {i:130, x:424.31, y1: 53.30},
        {i:131, x:425.24, y0: 54.18},
        {i:132, x:430.74, y1: 53.24},
        {i:133, x:431.68, y0: 54.23},
        {i:134, x:437.17, y1: 53.46},
        {i:135, x:438.12, y0: 54.26},
        {i:136, x:443.60, y1: 53.27},
        {i:137, x:444.57, y0: 54.21},
        {i:138, x:450.03, y1: 53.16},
        {i:139, x:451.01, y0: 54.16},
        {i:140, x:456.46, y1: 53.37},
        {i:141, x:457.45, y0: 54.15},
        {i:142, x:462.89, y1: 53.31},
        {i:143, x:463.90, y0: 54.22},
        {i:144, x:469.32, y1: 53.18},
        {i:145, x:470.34, y0: 54.30},
        {i:146, x:475.75, y1: 53.16},
        {i:147, x:476.78, y0: 54.11},
        {i:148, x:482.18, y1: 53.25},
        {i:149, x:483.23, y0: 54.04},
        {i:150, x:488.60, y1: 53.31},
        {i:151, x:489.67, y0: 54.38},
        {i:152, x:495.03, y1: 53.23},
        {i:153, x:496.11, y0: 54.20},
        {i:154, x:501.46, y1: 53.24},
        {i:155, x:502.55, y0: 54.15},
        {i:156, x:507.89, y1: 53.14},
        {i:157, x:509.00, y0: 54.19},
        {i:158, x:514.32, y1: 53.18},
        {i:159, x:515.44, y0: 54.15},
        {i:160, x:520.75, y1: 53.23},
        {i:161, x:521.88, y0: 54.09},
        {i:162, x:527.18, y1: 53.13},
        {i:163, x:528.33, y0: 54.19},
        {i:164, x:533.61, y1: 53.17},
        {i:165, x:534.77, y0: 54.29},
        {i:166, x:540.04, y1: 53.16},
        {i:167, x:541.21, y0: 54.10},
        {i:168, x:546.47, y1: 53.22},
        {i:169, x:547.65, y0: 54.15},
        {i:170, x:552.89, y1: 53.16},
        {i:171, x:554.10, y0: 54.09},
        {i:172, x:559.32, y1: 53.41},
        {i:173, x:560.54, y0: 54.17},
        {i:174, x:565.75, y1: 53.27},
        {i:175, x:566.98, y0: 54.16},
        {i:176, x:572.18, y1: 53.18},
        {i:177, x:573.43, y0: 54.07},
        {i:178, x:578.61, y1: 53.15},
        {i:179, x:579.87, y0: 54.25},
        {i:180, x:585.04, y1: 53.24},
        {i:181, x:586.31, y0: 54.17},
        {i:182, x:591.47, y1: 53.12},
        {i:183, x:592.76, y0: 54.10},
        {i:184, x:597.90, y1: 53.13},
        {i:185, x:599.20, y0: 54.16},
        {i:186, x:604.33, y1: 53.14},
        {i:187, x:605.64, y0: 54.13},
        {i:188, x:610.75, y1: 53.10},
        {i:189, x:612.09, y0: 54.16},
        {i:190, x:617.18, y1: 53.14},
        {i:191, x:618.53, y0: 54.16},
        {i:192, x:623.61, y1: 53.22},
        {i:193, x:624.97, y0: 54.06},
        {i:194, x:630.04, y1: 53.12},
        {i:195, x:631.41, y0: 54.14},
        {i:196, x:636.47, y1: 53.25},
        {i:197, x:637.86, y0: 54.17},
        {i:198, x:642.90, y1: 53.14},
        {i:199, x:644.30, y0: 54.18}
    ]]
]);
