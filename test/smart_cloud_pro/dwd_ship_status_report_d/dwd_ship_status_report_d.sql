-- =============================================
-- 船舶状态报告表 DWD层数据加工
-- 表名: dwd_ship_status_report_d
-- 数据来源: cii_ship_status_report (已通过审核的报告)
-- 更新频率: 每日
-- =============================================

INSERT INTO dwd_ship_status_report_d (
    id,
    -- 基础信息
    ship_code,
    vessel_name_cn,
    vessel_name_us,
    vessel_type_cn,
    vessel_type_us,
    -- 状态信息
    status_code,
    status_cn,
    status_us,
    -- 装载状态 (来自状态报告)
    loading_status_code,
    loading_status_cn,
    loading_status_us,
    -- 航线装载状态 (来自航次信息)
    voyage_loading_status_code,
    voyage_loading_status_cn,
    voyage_loading_status_us,
    -- 航次信息
    voyage_no,
    report_date,
    report_date_ts,
    report_duration,
    -- 船位信息
    latitude,
    longitude,
    -- 港口和时间
    start_port,
    end_port,
    etd_utc,
    eta_utc,
    -- 航行数据
    distance,
    sailing_hours,
    average_sog,
    voyage_distance,
    cp_speed_kn,
    -- 保证消耗量
    cp_fo_consumption,
    cp_go_consumption,
    -- 天气阈值
    cp_wind_level,
    cp_wave_level,
    -- 气象数据
    wave_scale,
    current_velocity,
    wind_speed,
    swell_wave_direction,
    swell_wave_height,
    wind_direction,
    wave_direction,
    current_direction,
    sig_wave,
    -- 报告状态
    report_status,
    -- 燃油消耗量 (17种)
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
    -- 聚合消耗量
    fo_consumption,
    go_consumption,
    -- 剩余油量 (17种)
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
    -- 聚合剩余量
    fo_margin,
    go_margin,
    -- 舱室信息
    slip_rate,
    current_me_load,
    status_report_id,
    avg_report_time_slip,
    avg_report_time_load,
    avg_report_time_power,
    avg_report_time_speed,
    -- 主机转速
    me_speed_one,
    me_speed_two,
    me_speed_three,
    me_speed_four,
    me_speed_five,
    me_speed_six,
    -- 设备燃油消耗量
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
-- 1. 基础报告数据 (仅取已通过审核的数据)
base_report AS (
    SELECT 
        id,
        ship_code,
        voyage_no,
        status,
       /* report_date: 直接转换为 UTC+0 时间判断日期归属
               - report_date 是 UTC+0 时间戳(秒)
               - 使用 CONVERT_TZ 从服务器时区转回 UTC+0，抵消数据库 session 时区影响
               - 12:00 UTC 之后的报告归属于下一天
            */
            CASE 
                WHEN DATE_FORMAT(CONVERT_TZ(
                    FROM_UNIXTIME(report_date), 
                    @@session.time_zone, 
                    '+00:00'
                ), '%H:%i:%s') > '12:00:00' 
                THEN DATE_FORMAT(
                    DATE_ADD(
                        CONVERT_TZ(
                            FROM_UNIXTIME(report_date), 
                            @@session.time_zone, 
                            '+00:00'
                        ), 
                        INTERVAL 1 DAY
                    ), 
                    '%Y-%m-%d'
                )
                ELSE DATE_FORMAT(
                    CONVERT_TZ(
                        FROM_UNIXTIME(report_date), 
                        @@session.time_zone, 
                        '+00:00'
                    ), 
                    '%Y-%m-%d'
                )
            END AS report_date,
        report_date AS report_date_ts,  -- 秒级时间戳转换为DATETIME
        report_duration,  -- 报告时长
        latitude,
        longitude,
        distance,
        sailing_hours,
        average_sog,
        loading_status,  -- 装载状态code
        -- 气象数据
        wave_scale,
        current_velocity,
        wind_speed,
        swell_wave_direction,
        swell_wave_height,
        wind_direction,
        wave_direction,
        current_direction,
        sig_wave,
        report_status,
        -- 燃油消耗量 (直接取)
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
        other_cons
    FROM ods_cii_ship_status_report_d
    WHERE report_status = 3  -- 已通过审核
),

-- 2. 船舶主数据
ship_info AS (
    SELECT 
        s.ship_code,
        s.name_zh AS vessel_name_cn,
        s.name_en AS vessel_name_us,
        st.name_cn AS vessel_type_cn,
        st.name_en AS vessel_type_us
    FROM ods_t_mdm_ship_d s
    LEFT JOIN ods_t_mdm_ship_type_d st ON s.ship_type = st.id
),

-- 3. 航次基础信息 (包含装载状态)
-- mount_status 可能是中文或英文，需要智能匹配字典表
-- 取每个船舶的最新航次记录
voyage_info_raw AS (
    SELECT 
        vb.ship_code,
        vb.voyage_number,
        vb.voyage_from AS start_port,
        vb.voyage_to AS end_port,
        vb.distance AS voyage_distance,
        vb.estimated_time_on_arrv AS eta_utc,
        ve.speed_requirement AS cp_speed_kn,
        ve.daily_fuel_consumption_requirement AS cp_fo_consumption,
        null AS cp_go_consumption,
        ve.mount_status AS mount_status_raw,
        -- 天气阈值
        COALESCE(ve.wind_level, 4) AS cp_wind_level,  -- 默认蒲福风级4级
        COALESCE(ve.wave_level, 3) AS cp_wave_level,  -- 默认道格拉斯海况3级
        -- 智能匹配字典：优先匹配中文(name_zh)，其次匹配英文(name_en)
        COALESCE(dict_zh.code, dict_en.code) AS loading_status_code,
        COALESCE(dict_zh.name_zh, dict_en.name_zh) AS loading_status_cn,
        COALESCE(dict_zh.name_en, dict_en.name_en) AS loading_status_us,
        ROW_NUMBER() OVER (PARTITION BY vb.ship_code, vb.voyage_number ORDER BY vb.id DESC) AS rn
    FROM ods_t_voyage_base_info_d vb
    LEFT JOIN ods_t_voyage_ex_info_d ve ON vb.id = ve.voyage_id
    -- 尝试用中文匹配
    LEFT JOIN ods_cii_ship_dictionary_d dict_zh ON ve.mount_status = dict_zh.name_zh
    -- 尝试用英文匹配
    LEFT JOIN ods_cii_ship_dictionary_d dict_en ON ve.mount_status = dict_en.name_en
),

voyage_info AS (
    SELECT 
        ship_code,
        voyage_number,
        start_port,
        end_port,
        voyage_distance,
        eta_utc,
        cp_speed_kn,
        cp_fo_consumption,
        cp_go_consumption,
        mount_status_raw,
        cp_wind_level,
        cp_wave_level,
        loading_status_code,
        loading_status_cn,
        loading_status_us
    FROM voyage_info_raw
    WHERE rn = 1
),

-- 4. 计算ETD (每个航次最早的report_date_ts,转换为UTC 0时区的datetime格式)
voyage_etd AS (
    SELECT 
        ship_code,
        voyage_no,
        DATE_FORMAT(
            CONVERT_TZ(
                FROM_UNIXTIME(MIN(report_date_ts)), 
                @@session.time_zone, 
                '+00:00'
            ), 
            '%Y-%m-%d %H:%i:%s'
        ) AS etd_utc
    FROM base_report
    GROUP BY ship_code, voyage_no
),

-- 5. 剩余油量 (按船、航次、日期分组，取当天最后一条记录)
-- 关联关系: base_report.id -> cii_ship_status_report_fuel_information.status_report_id
--          cii_ship_status_report_fuel_information.id -> cii_ship_fuel_statistics_information.status_report_fuel_id
--          直接使用 cii_ship_fuel_statistics_information.fuel_type 和 departure_fuel_amount
fuel_margin AS (
    SELECT 
        br.ship_code,
        br.voyage_no,
        br.report_date,
        MAX(CASE WHEN fsi.fuel_type = 'hs_hfo' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS hs_hfo_margin,
        MAX(CASE WHEN fsi.fuel_type = 'ls_hfo' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS ls_hfo_margin,
        MAX(CASE WHEN fsi.fuel_type = 'uls_hfo' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS uls_hfo_margin,
        MAX(CASE WHEN fsi.fuel_type = 'hs_lfo' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS hs_lfo_margin,
        MAX(CASE WHEN fsi.fuel_type = 'ls_lfo' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS ls_lfo_margin,
        MAX(CASE WHEN fsi.fuel_type = 'uls_lfo' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS uls_lfo_margin,
        MAX(CASE WHEN fsi.fuel_type = 'mdo_mgo' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS mdo_mgo_margin,
        MAX(CASE WHEN fsi.fuel_type = 'river_boat_fuel_oil' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS river_boat_fuel_oil_margin,
        MAX(CASE WHEN fsi.fuel_type = 'lng' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS lng_margin,
        MAX(CASE WHEN fsi.fuel_type = 'lpg_propane' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS lpg_propane_margin,
        MAX(CASE WHEN fsi.fuel_type = 'lpg_butane' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS lpg_butane_margin,
        MAX(CASE WHEN fsi.fuel_type = 'methanol' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS methanol_margin,
        MAX(CASE WHEN fsi.fuel_type = 'ethanol' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS ethanol_margin,
        MAX(CASE WHEN fsi.fuel_type = 'hydrogen' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS hydrogen_margin,
        MAX(CASE WHEN fsi.fuel_type = 'ammonia' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS ammonia_margin,
        MAX(CASE WHEN fsi.fuel_type = 'electric_power' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS electric_power_margin,
        MAX(CASE WHEN fsi.fuel_type = 'other' AND br.report_date_ts = max_ts.max_ts THEN fsi.departure_fuel_amount ELSE NULL END) AS other_margin
    FROM base_report br
    -- 关联燃油报告信息表
    LEFT JOIN ods_cii_ship_status_report_fuel_information_d srfi ON br.id = srfi.status_report_id
    -- 关联燃油统计信息表，直接使用其 fuel_type 和 departure_fuel_amount 字段
    LEFT JOIN ods_cii_ship_fuel_statistics_information_d fsi ON srfi.id = fsi.status_report_fuel_id
    -- 子查询获取每天最大的report_date_ts
    INNER JOIN (
        SELECT ship_code, voyage_no, report_date, MAX(report_date_ts) AS max_ts
        FROM base_report
        GROUP BY ship_code, voyage_no, report_date
    ) max_ts ON br.ship_code = max_ts.ship_code 
        AND br.voyage_no = max_ts.voyage_no 
        AND br.report_date = max_ts.report_date
    GROUP BY br.ship_code, br.voyage_no, br.report_date
)

-- 主查询: 组装所有字段
SELECT 
    br.id,
    -- 基础信息
    br.ship_code,
    si.vessel_name_cn,
    si.vessel_name_us,
    si.vessel_type_cn,
    si.vessel_type_us,
    
    -- 状态信息
    br.status AS status_code,
    sd_status.name_zh AS status_cn,
    sd_status.name_en AS status_us,
    
    -- 装载状态 (来自base_report.loading_status，存放的是字典表的code)
    sd_loading.code AS loading_status_code,
    sd_loading.name_zh AS loading_status_cn,
    sd_loading.name_en AS loading_status_us,
    
    -- 航线装载状态 (来自航次信息，已在voyage_info中完成字典关联)
    vi.loading_status_code AS voyage_loading_status_code,
    vi.loading_status_cn AS voyage_loading_status_cn,
    vi.loading_status_us AS voyage_loading_status_us,
    
    -- 航次信息
    br.voyage_no,
    
    br.report_date,
    br.report_date_ts,
    br.report_duration,
    
    -- 船位信息
    br.latitude,
    br.longitude,
    
    -- 港口和时间
    vi.start_port,
    vi.end_port,
    ve.etd_utc,
    vi.eta_utc,
    
    -- 航行数据
    br.distance,
    br.sailing_hours,
    br.average_sog,
    vi.voyage_distance,
    vi.cp_speed_kn,
    vi.cp_fo_consumption,
    vi.cp_go_consumption,
    -- 天气阈值
    vi.cp_wind_level,
    vi.cp_wave_level,
    
    -- 气象数据
    br.wave_scale,
    br.current_velocity,
    br.wind_speed,
    br.swell_wave_direction,
    br.swell_wave_height,
    br.wind_direction,
    br.wave_direction,
    br.current_direction,
    br.sig_wave,
    
    -- 报告状态
    br.report_status,
    
    -- 燃油消耗量 (直接从br取)
    br.hs_hfo_cons AS hs_hfo_cons,
    br.ls_hfo_cons AS ls_hfo_cons,
    br.uls_hfo_cons AS uls_hfo_cons,
    br.hs_lfo_cons AS hs_lfo_cons,
    br.ls_lfo_cons AS ls_lfo_cons,
    br.uls_lfo_cons AS uls_lfo_cons,
    br.mdo_mgo_cons AS mdo_mgo_cons,
    br.river_boat_fuel_oil_cons AS river_boat_fuel_oil_cons,
    br.lng_cons AS lng_cons,
    br.lpg_propane_cons AS lpg_propane_cons,
    br.lpg_butane_cons AS lpg_butane_cons,
    br.methanol_cons AS methanol_cons,
    br.ethanol_cons AS ethanol_cons,
    br.hydrogen_cons AS hydrogen_cons,
    br.ammonia_cons AS ammonia_cons,
    br.electric_power_cons AS electric_power_cons,
    br.other_cons AS other_cons,
    
    -- 聚合消耗量
    (COALESCE(br.hs_hfo_cons, 0) + COALESCE(br.ls_hfo_cons, 0) + COALESCE(br.uls_hfo_cons, 0) + 
     COALESCE(br.hs_lfo_cons, 0) + COALESCE(br.ls_lfo_cons, 0) + COALESCE(br.uls_lfo_cons, 0)) AS fo_consumption,
    br.mdo_mgo_cons AS go_consumption,
    
    -- 剩余油量
    fm.hs_hfo_margin AS hs_hfo_margin,
    fm.ls_hfo_margin AS ls_hfo_margin,
    fm.uls_hfo_margin AS uls_hfo_margin,
    fm.hs_lfo_margin AS hs_lfo_margin,
    fm.ls_lfo_margin AS ls_lfo_margin,
    fm.uls_lfo_margin AS uls_lfo_margin,
    fm.mdo_mgo_margin AS mdo_mgo_margin,
    fm.river_boat_fuel_oil_margin AS river_boat_fuel_oil_margin,
    fm.lng_margin AS lng_margin,
    fm.lpg_propane_margin AS lpg_propane_margin,
    fm.lpg_butane_margin AS lpg_butane_margin,
    fm.methanol_margin AS methanol_margin,
    fm.ethanol_margin AS ethanol_margin,
    fm.hydrogen_margin AS hydrogen_margin,
    fm.ammonia_margin AS ammonia_margin,
    fm.electric_power_margin AS electric_power_margin,
    fm.other_margin AS other_margin,
    
    -- 聚合剩余量
    (COALESCE(fm.hs_hfo_margin, 0) + COALESCE(fm.ls_hfo_margin, 0) + COALESCE(fm.uls_hfo_margin, 0) + 
     COALESCE(fm.hs_lfo_margin, 0) + COALESCE(fm.ls_lfo_margin, 0) + COALESCE(fm.uls_lfo_margin, 0)) AS fo_margin,
    fm.mdo_mgo_margin AS go_margin,
    
    -- 舱室信息
    ci.slip_rate,
    ci.current_me_load,
    br.id AS status_report_id,
    ci.avg_report_time_slip,
    ci.avg_report_time_load,
    ci.avg_report_time_power,
    ci.avg_report_time_speed,
    ci.me_speed_one,
    ci.me_speed_two,
    ci.me_speed_three,
    ci.me_speed_four,
    ci.me_speed_five,
    ci.me_speed_six,
    ci.me_fuel_consumption_one,
    ci.alternator_fuel_consumption_one,
    ci.boiler_fuel_consumption_one,
    ci.me_fuel_consumption_two,
    ci.alternator_fuel_consumption_two,
    ci.boiler_fuel_consumption_two,
    ci.me_fuel_consumption_three,
    ci.alternator_fuel_consumption_three,
    ci.boiler_fuel_consumption_three,
    ci.me_fuel_consumption_four,
    ci.alternator_fuel_consumption_four,
    ci.boiler_fuel_consumption_four,
    ci.me_fuel_consumption_five,
    ci.alternator_fuel_consumption_five,
    ci.boiler_fuel_consumption_five,
    ci.me_fuel_consumption_six,
    ci.alternator_fuel_consumption_six,
    ci.boiler_fuel_consumption_six,
    
    -- 时间戳
    NOW() AS create_time,
    NOW() AS update_time
    
FROM base_report br
LEFT JOIN ship_info si ON br.ship_code = si.ship_code
LEFT JOIN voyage_info vi ON br.ship_code = vi.ship_code AND br.voyage_no = vi.voyage_number
LEFT JOIN voyage_etd ve ON br.ship_code = ve.ship_code AND br.voyage_no = ve.voyage_no
LEFT JOIN ods_cii_ship_dictionary_d sd_status ON br.status = sd_status.code
-- 装载状态字典关联: 通过 base_report.loading_status (code) 关联字典表
LEFT JOIN ods_cii_ship_dictionary_d sd_loading ON br.loading_status = sd_loading.code
LEFT JOIN ods_cii_ship_cabin_information_d ci ON br.id = ci.status_report_id
LEFT JOIN fuel_margin fm ON br.ship_code = fm.ship_code 
    AND br.voyage_no = fm.voyage_no 
    AND br.report_date = fm.report_date;


