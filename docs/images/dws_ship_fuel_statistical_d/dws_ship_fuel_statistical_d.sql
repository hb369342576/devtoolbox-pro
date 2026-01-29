-- =============================================
-- 船舶油耗统计表 DWS层数据加工
-- 表名: dws_ship_fuel_statistical_d
-- 数据来源: dwd_ship_status_report_d
-- 分组维度: ship_code, voyage_no, status_code, report_date
-- 更新频率: 每日
-- =============================================

INSERT INTO dws_ship_fuel_statistical_d (
    -- 分组字段
    ship_code,
    -- 基础信息
    vessel_name_cn,
    vessel_name_us,
    vessel_type_cn,
    vessel_type_us,
    -- 状态信息
    status_code,
    status_cn,
    status_us,
    -- 装载状态
    loading_status_code,
    loading_status_cn,
    loading_status_us,
    -- 航次信息
    voyage_no,
    report_date,
    -- 航行数据
    distance,
    sailing_hours,
    average_sog,
    -- 港口信息
    start_port,
    end_port,
    voyage_distance,
    -- 时间信息
    etd_utc,
    eta_utc,
    -- 燃油消耗量 (17种+总计)
    total_cons,
    fo_cons,
    go_cons,
    hs_hfo_cons,
    ls_hfo_cons,
    uls_hfo_cons,
    hs_lfo_cons,
    ls_lfo_cons,
    uls_lfo_cons,
    mdo_mgo_cons,
    river_boat_fuel_oil_cons,
    lng_cons,
    lpg_propane_cons,
    lpg_butane_cons,
    methanol_cons,
    ethanol_cons,
    hydrogen_cons,
    ammonia_cons,
    electric_power_cons,
    other_cons,
    -- 剩余油量 (17种+总计)
    total_margin,
    fo_margin,
    go_margin,
    hs_hfo_margin,
    ls_hfo_margin,
    uls_hfo_margin,
    hs_lfo_margin,
    ls_lfo_margin,
    uls_lfo_margin,
    mdo_mgo_margin,
    river_boat_fuel_oil_margin,
    lng_margin,
    lpg_propane_margin,
    lpg_butane_margin,
    methanol_margin,
    ethanol_margin,
    hydrogen_margin,
    ammonia_margin,
    electric_power_margin,
    other_margin,
    -- 设备燃油消耗量 (18个)
    me_fuel_consumption_one,
    alternator_fuel_consumption_one,
    boiler_fuel_consumption_one,
    me_fuel_consumption_two,
    alternator_fuel_consumption_two,
    boiler_fuel_consumption_two,
    me_fuel_consumption_three,
    alternator_fuel_consumption_three,
    boiler_fuel_consumption_three,
    me_fuel_consumption_four,
    alternator_fuel_consumption_four,
    boiler_fuel_consumption_four,
    me_fuel_consumption_five,
    alternator_fuel_consumption_five,
    boiler_fuel_consumption_five,
    me_fuel_consumption_six,
    alternator_fuel_consumption_six,
    boiler_fuel_consumption_six,
    -- 时间戳
    create_time,
    update_time
)
WITH 
-- 1. 获取每个维度的最晚时间记录
latest_record AS (
    SELECT 
        ship_code,
        voyage_no,
        status_code,
        report_date,
        MAX(report_date_ts) AS max_ts
    FROM dwd_ship_status_report_d
    GROUP BY ship_code, voyage_no, status_code, report_date
),

-- 2. 获取最晚时间记录的数据（包含基础信息、剩余油量等）
margin_data AS (
    SELECT 
        d.ship_code,
        d.voyage_no,
        d.status_code,
        d.report_date,
        -- 基础信息
        d.vessel_name_cn,
        d.vessel_name_us,
        d.vessel_type_cn,
        d.vessel_type_us,
        -- 状态信息
        d.status_cn,
        d.status_us,
        -- 装载状态
        d.loading_status_code  as loading_status_code,
        d.loading_status_cn as loading_status_cn,
        d.loading_status_us as loading_status_us,
        -- 港口信息
        d.start_port,
        d.end_port,
        d.voyage_distance,
        -- 时间信息
        d.etd_utc,
        CASE 
            WHEN d.report_date > d.eta_utc THEN CAST(d.report_date AS DATETIME)
            ELSE d.eta_utc
        END AS eta_utc,
        -- 剩余油量
        d.hs_hfo_margin,
        d.ls_hfo_margin,
        d.uls_hfo_margin,
        d.hs_lfo_margin,
        d.ls_lfo_margin,
        d.uls_lfo_margin,
        d.mdo_mgo_margin,
        d.river_boat_fuel_oil_margin,
        d.lng_margin,
        d.lpg_propane_margin,
        d.lpg_butane_margin,
        d.methanol_margin,
        d.ethanol_margin,
        d.hydrogen_margin,
        d.ammonia_margin,
        d.electric_power_margin,
        d.other_margin,
        -- 聚合剩余量
        d.fo_margin,
        d.go_margin
    FROM dwd_ship_status_report_d d
    INNER JOIN latest_record lr 
        ON d.ship_code = lr.ship_code 
        AND d.voyage_no = lr.voyage_no 
        AND d.status_code = lr.status_code 
        AND d.report_date = lr.report_date
        AND d.report_date_ts = lr.max_ts
)

SELECT 
    -- 分组字段
    d.ship_code,
    
    -- 基础信息 (从最晚时间记录取)
    m.vessel_name_cn,
    m.vessel_name_us,
    m.vessel_type_cn,
    m.vessel_type_us,
    
    -- 状态信息
    d.status_code,
    m.status_cn,
    m.status_us,
    
    -- 装载状态 (从最晚时间记录取)
    m.loading_status_code,
    m.loading_status_cn,
    m.loading_status_us,
    
    -- 航次信息
    d.voyage_no,
    d.report_date,
    
    -- 航行数据 (距离/时间累加, 航速平均)
    SUM(d.distance) AS distance,
    SUM(d.sailing_hours) AS sailing_hours,
    AVG(d.average_sog) AS average_sog,
    
    -- 港口信息 (从最晚时间记录取)
    m.start_port,
    m.end_port,
    m.voyage_distance,
    
    -- 时间信息 (从最晚时间记录取)
    m.etd_utc,
    m.eta_utc,
    
    -- 总消耗量 = fo_cons + go_cons
    SUM(COALESCE(d.fo_consumption, 0) + COALESCE(d.go_consumption, 0)) AS total_cons,
    SUM(d.fo_consumption) AS fo_cons,
    SUM(d.go_consumption) AS go_cons,
    
    -- 燃油消耗量 (累加，全NULL时返回NULL)
    SUM(d.hs_hfo_cons) AS hs_hfo_cons,
    SUM(d.ls_hfo_cons) AS ls_hfo_cons,
    SUM(d.uls_hfo_cons) AS uls_hfo_cons,
    SUM(d.hs_lfo_cons) AS hs_lfo_cons,
    SUM(d.ls_lfo_cons) AS ls_lfo_cons,
    SUM(d.uls_lfo_cons) AS uls_lfo_cons,
    SUM(d.mdo_mgo_cons) AS mdo_mgo_cons,
    SUM(d.river_boat_fuel_oil_cons) AS river_boat_fuel_oil_cons,
    SUM(d.lng_cons) AS lng_cons,
    SUM(d.lpg_propane_cons) AS lpg_propane_cons,
    SUM(d.lpg_butane_cons) AS lpg_butane_cons,
    SUM(d.methanol_cons) AS methanol_cons,
    SUM(d.ethanol_cons) AS ethanol_cons,
    SUM(d.hydrogen_cons) AS hydrogen_cons,
    SUM(d.ammonia_cons) AS ammonia_cons,
    SUM(d.electric_power_cons) AS electric_power_cons,
    SUM(d.other_cons) AS other_cons,
    
    -- 总剩余量 (从最晚时间记录取)
    -- 总剩余量 = fo_margin + go_margin (从最晚时间记录取)
    COALESCE(m.fo_margin, 0) + COALESCE(m.go_margin, 0) AS total_margin,
    m.fo_margin,
    m.go_margin,
    
    -- 剩余油量 (从最晚时间记录取)
    m.hs_hfo_margin,
    m.ls_hfo_margin,
    m.uls_hfo_margin,
    m.hs_lfo_margin,
    m.ls_lfo_margin,
    m.uls_lfo_margin,
    m.mdo_mgo_margin,
    m.river_boat_fuel_oil_margin,
    m.lng_margin,
    m.lpg_propane_margin,
    m.lpg_butane_margin,
    m.methanol_margin,
    m.ethanol_margin,
    m.hydrogen_margin,
    m.ammonia_margin,
    m.electric_power_margin,
    m.other_margin,
    
    -- 设备燃油消耗量 (累加)
    SUM(d.me_fuel_consumption_one) AS me_fuel_consumption_one,
    SUM(d.alternator_fuel_consumption_one) AS alternator_fuel_consumption_one,
    SUM(d.boiler_fuel_consumption_one) AS boiler_fuel_consumption_one,
    SUM(d.me_fuel_consumption_two) AS me_fuel_consumption_two,
    SUM(d.alternator_fuel_consumption_two) AS alternator_fuel_consumption_two,
    SUM(d.boiler_fuel_consumption_two) AS boiler_fuel_consumption_two,
    SUM(d.me_fuel_consumption_three) AS me_fuel_consumption_three,
    SUM(d.alternator_fuel_consumption_three) AS alternator_fuel_consumption_three,
    SUM(d.boiler_fuel_consumption_three) AS boiler_fuel_consumption_three,
    SUM(d.me_fuel_consumption_four) AS me_fuel_consumption_four,
    SUM(d.alternator_fuel_consumption_four) AS alternator_fuel_consumption_four,
    SUM(d.boiler_fuel_consumption_four) AS boiler_fuel_consumption_four,
    SUM(d.me_fuel_consumption_five) AS me_fuel_consumption_five,
    SUM(d.alternator_fuel_consumption_five) AS alternator_fuel_consumption_five,
    SUM(d.boiler_fuel_consumption_five) AS boiler_fuel_consumption_five,
    SUM(d.me_fuel_consumption_six) AS me_fuel_consumption_six,
    SUM(d.alternator_fuel_consumption_six) AS alternator_fuel_consumption_six,
    SUM(d.boiler_fuel_consumption_six) AS boiler_fuel_consumption_six,
    
    -- 时间戳
    NOW() AS create_time,
    NOW() AS update_time
    
FROM dwd_ship_status_report_d d
LEFT JOIN margin_data m 
    ON d.ship_code = m.ship_code 
    AND d.voyage_no = m.voyage_no 
    AND d.status_code = m.status_code 
    AND d.report_date = m.report_date
GROUP BY 
    d.ship_code,
    d.voyage_no,
    d.status_code,
    d.report_date,
    -- 基础信息
    m.vessel_name_cn,
    m.vessel_name_us,
    m.vessel_type_cn,
    m.vessel_type_us,
    -- 状态信息
    m.status_cn,
    m.status_us,
    -- 装载状态
    m.loading_status_code,
    m.loading_status_cn,
    m.loading_status_us,
    -- 港口信息
    m.start_port,
    m.end_port,
    m.voyage_distance,
    -- 时间信息
    m.etd_utc,
    m.eta_utc,
    -- 剩余油量
    m.hs_hfo_margin,
    m.ls_hfo_margin,
    m.uls_hfo_margin,
    m.hs_lfo_margin,
    m.ls_lfo_margin,
    m.uls_lfo_margin,
    m.mdo_mgo_margin,
    m.river_boat_fuel_oil_margin,
    m.lng_margin,
    m.lpg_propane_margin,
    m.lpg_butane_margin,
    m.methanol_margin,
    m.ethanol_margin,
    m.hydrogen_margin,
    m.ammonia_margin,
    m.electric_power_margin,
    m.other_margin,
    m.fo_margin,
    m.go_margin;
