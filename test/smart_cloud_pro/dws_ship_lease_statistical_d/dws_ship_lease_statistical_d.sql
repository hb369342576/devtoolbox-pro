-- =============================================
-- 船舶租约统计表 DWS层数据加工
-- 表名: dws_ship_lease_statistical_d
-- 数据来源: dws_ship_lease_detail_d
-- 分组维度: ship_code, voyage_no
-- 更新频率: 每日
-- =============================================
-- 计算逻辑说明:
-- 好天气定速航速航行时间 = 总航程 / 好天气定速航速均值（好天气 且 status=sailing）
-- 修正后保证航速航行时间 = 总航程 / (保证航速 - 0.5)
-- 保证航速航行时间 = 总航程 / 保证航速
-- 时间损失 = 好天气定速航速航行时间 - 修正后保证航速航行时间
-- 时间节约 = 保证航速航行时间 - 好天气定速航速航行时间
-- =============================================

INSERT INTO dws_ship_lease_statistical_d (
    -- 基础信息
    ship_code,
    voyage_no,
    -- 航程统计
    total_distance,
    -- 速度统计
    avg_speed_good_weather_kn,
    
    cp_guaranteed_speed_kn,
    speed_deviation_kn,

    -- fo燃油消耗量统计
    cp_fo_guaranteed_mt_per_d,
    fo_cons_deviation_mt_per_d,

    -- go燃油消耗量统计
    cp_go_guaranteed_mt_per_d,
    go_cons_deviation_mt_per_d,

    -- 时间计算
    actual_sailing_time_hr,
    corrected_guaranteed_time_hr,
    guaranteed_time_hr,
    -- 时间差异
    est_time_delta_hr,
    time_status,
    -- 天数统计
    good_weather_days,
    voyage_days,
    good_weather_sailing_days,
    good_weather_ratio,

    -- 平均燃油消耗量 (17种)
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
    -- 时间戳
    create_time,
    update_time
)
WITH 
-- 总航程统计 (所有报告的distance累加)
total_distance_stats AS (
    SELECT 
        ship_code,
        voyage_no,
        SUM(distance) AS total_distance
    FROM dwd_ship_status_report_d
    WHERE status_code = 'sailing'
    GROUP BY ship_code, voyage_no
),

-- 好天气数据统计 (好天气 且 status=sailing)
good_weather_stats AS (
    SELECT 
        ship_code,
        voyage_no,
        -- 好天气定速航速均值 = 航线距离 / 航行时间 (好天气 + sailing状态)
        CASE 
            WHEN SUM(CASE WHEN is_good_weather = 1 THEN sailing_hours ELSE 0 END) > 0
            THEN SUM(CASE WHEN is_good_weather = 1 THEN total_distance ELSE 0 END) / SUM(CASE WHEN is_good_weather = 1 THEN sailing_hours ELSE 0 END)
            ELSE NULL
        END AS avg_speed_good_weather_kn,
        -- 好天气天数 = 好天气下累计报告时长 / 24 小时
        SUM(CASE WHEN is_good_weather = 1 THEN report_duration ELSE 0 END) / 24.0 AS good_weather_days,
        -- 好天气航行天数 = 好天气下累计航行时间 / 24 小时
        SUM(CASE WHEN is_good_weather = 1 THEN sailing_hours ELSE 0 END) / 24.0 AS good_weather_sailing_days,
        -- 航次总天数 = 累计报告时长 / 24 小时
        SUM(report_duration) / 24.0 AS voyage_days
    FROM dws_ship_lease_detail_d
    GROUP BY ship_code, voyage_no
)

SELECT 
    -- 基础信息
    d.ship_code,
    d.voyage_no,
    
    -- 总航程
    tds.total_distance,
    
    -- 速度统计
    gws.avg_speed_good_weather_kn,
    MAX(d.cp_guaranteed_speed_kn) AS cp_guaranteed_speed_kn,
    
    -- 速度偏差 = 实际平均航速 - 保证航速
    (gws.avg_speed_good_weather_kn - COALESCE(MAX(d.cp_guaranteed_speed_kn), 0)) AS speed_deviation_kn,

    -- fo燃油消耗量统计
    MAX(d.cp_fo_guaranteed_mt_per_d) AS cp_fo_guaranteed_mt_per_d,
    -- 燃油消耗量偏差 = 好天气fo消耗累计值 / 好天气天数 - 保证fo油耗
    CASE 
        WHEN gws.good_weather_sailing_days > 0 
        THEN (SUM(CASE WHEN d.is_good_weather = 1 THEN d.fo_cons ELSE 0 END) / gws.good_weather_sailing_days) - COALESCE(MAX(d.cp_fo_guaranteed_mt_per_d), 0)
        ELSE NULL 
    END AS fo_cons_deviation_mt_per_d,

    -- go燃油消耗量统计
    MAX(d.cp_go_guaranteed_mt_per_d) AS cp_go_guaranteed_mt_per_d,
    -- 燃油消耗量偏差 = 好天气go消耗累计值 / 好天气天数 - 保证go油耗
    CASE 
        WHEN gws.good_weather_sailing_days > 0 
        THEN (SUM(CASE WHEN d.is_good_weather = 1 THEN d.go_cons ELSE 0 END) / gws.good_weather_sailing_days) - COALESCE(MAX(d.cp_go_guaranteed_mt_per_d), 0)
        ELSE NULL 
    END AS go_cons_deviation_mt_per_d,
    
    -- 好天气定速航速航行时间 = 总航程 / 好天气定速航速均值
    CASE 
        WHEN gws.avg_speed_good_weather_kn > 0 
        THEN tds.total_distance / gws.avg_speed_good_weather_kn
        ELSE NULL 
    END AS actual_sailing_time_hr,
    
    -- 修正后保证航速航行时间 = 总航程 / (保证航速 - 0.5)
    CASE 
        WHEN (MAX(d.cp_guaranteed_speed_kn) - 0.5) > 0 
        THEN tds.total_distance / (MAX(d.cp_guaranteed_speed_kn) - 0.5)
        ELSE NULL 
    END AS corrected_guaranteed_time_hr,
    
    -- 保证航速航行时间 = 总航程 / 保证航速
    CASE 
        WHEN MAX(d.cp_guaranteed_speed_kn) > 0 
        THEN tds.total_distance / MAX(d.cp_guaranteed_speed_kn)
        ELSE NULL 
    END AS guaranteed_time_hr,
    
    -- 时间损失/节约计算
    -- 时间损失 = 好天气定速航速航行时间 - 修正后保证航速航行时间 (>0时为损失)
    -- 时间节约 = 保证航速航行时间 - 好天气定速航速航行时间 (>0时为节约)
    CASE 
        WHEN gws.avg_speed_good_weather_kn > 0 AND MAX(d.cp_guaranteed_speed_kn) > 0.5 THEN
            -- 时间损失 = 实际航行时间 - 修正后保证航行时间
            CASE 
                WHEN (tds.total_distance / gws.avg_speed_good_weather_kn) - (tds.total_distance / (MAX(d.cp_guaranteed_speed_kn) - 0.5)) > 0
                THEN (tds.total_distance / gws.avg_speed_good_weather_kn) - (tds.total_distance / (MAX(d.cp_guaranteed_speed_kn) - 0.5))
                -- 时间节约 = 保证航行时间 - 实际航行时间
                WHEN (tds.total_distance / MAX(d.cp_guaranteed_speed_kn)) - (tds.total_distance / gws.avg_speed_good_weather_kn) > 0
                THEN (tds.total_distance / MAX(d.cp_guaranteed_speed_kn)) - (tds.total_distance / gws.avg_speed_good_weather_kn)
                ELSE null
            END
        ELSE null 
    END AS est_time_delta_hr,
    
    -- 时间状态标签
    CASE 
        WHEN gws.avg_speed_good_weather_kn > 0 AND MAX(d.cp_guaranteed_speed_kn) > 0.5 THEN
            CASE
                -- 时间损失 > 0
                WHEN (tds.total_distance / gws.avg_speed_good_weather_kn) - (tds.total_distance / (MAX(d.cp_guaranteed_speed_kn) - 0.5)) > 0
                THEN '损失'
                -- 时间节约 > 0
                WHEN (tds.total_distance / MAX(d.cp_guaranteed_speed_kn)) - (tds.total_distance / gws.avg_speed_good_weather_kn) > 0
                THEN '节余'
                ELSE null
            END
        ELSE null
    END AS time_status,
    
    -- 天数统计
    gws.good_weather_days,
    gws.voyage_days,
    gws.good_weather_sailing_days,
    
    -- 良好天气比例
    CASE 
        WHEN gws.voyage_days > 0 
        THEN gws.good_weather_days * 100.0/ gws.voyage_days 
        ELSE null 
    END AS good_weather_ratio,
    
    -- 平均燃油消耗量 (好天气累计值 / 好天气航行天数)
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.fo_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS fo_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.go_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS go_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.hs_hfo_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS hs_hfo_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.ls_hfo_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS ls_hfo_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.uls_hfo_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS uls_hfo_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.hs_lfo_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS hs_lfo_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.ls_lfo_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS ls_lfo_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.uls_lfo_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS uls_lfo_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.mdo_mgo_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS mdo_mgo_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.river_boat_fuel_oil_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS river_boat_fuel_oil_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.lng_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS lng_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.lpg_propane_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS lpg_propane_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.lpg_butane_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS lpg_butane_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.methanol_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS methanol_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.ethanol_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS ethanol_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.hydrogen_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS hydrogen_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.ammonia_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS ammonia_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.electric_power_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS electric_power_cons,
    CASE WHEN gws.good_weather_sailing_days > 0 THEN SUM(CASE WHEN d.is_good_weather = 1 THEN d.other_cons ELSE 0 END) / gws.good_weather_sailing_days ELSE NULL END AS other_cons,
    
    -- 时间戳
    NOW() AS create_time,
    NOW() AS update_time
    
FROM dws_ship_lease_detail_d d
LEFT JOIN good_weather_stats gws ON d.ship_code = gws.ship_code AND d.voyage_no = gws.voyage_no
LEFT JOIN total_distance_stats tds ON d.ship_code = tds.ship_code AND d.voyage_no = tds.voyage_no
GROUP BY 
    d.ship_code,
    d.voyage_no,
    tds.total_distance,
    gws.avg_speed_good_weather_kn,
    gws.good_weather_days,
    gws.good_weather_sailing_days,
    gws.voyage_days;
