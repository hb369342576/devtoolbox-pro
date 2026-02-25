-- =============================================
-- 船舶租约详情表 DWS层数据加工
-- 表名: dws_ship_lease_detail_d
-- 数据来源: dwd_ship_status_report_d (仅status='sailing')
-- 分组维度: ship_code, voyage_no, report_date
-- 更新频率: 每日
-- =============================================
INSERT INTO dws_ship_lease_detail_d (
        -- 基础信息
        ship_code,
        voyage_no,
        report_date,
        -- 速度
        average_sog,
        cp_guaranteed_speed_kn,
        cp_fo_guaranteed_mt_per_d,
        cp_go_guaranteed_mt_per_d,
        -- 航行统计
        sailing_hours,
        total_distance,
        report_duration,
        -- 气象数据
        wind_speed,
        wind_speed_real,
        sig_wave,
        sig_wave_real,
        avg_rpm,
        is_good_weather,
        -- 燃油消耗量 (17种)
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
    ) WITH voyage_config_raw AS (
        SELECT vb.ship_code,
            vb.voyage_number,
            ve.speed_requirement AS cp_guaranteed_speed_kn,
            ve.daily_fuel_consumption_requirement AS cp_fo_guaranteed_mt_per_d,
            null AS cp_go_guaranteed_mt_per_d,
            COALESCE(ve.wind_level, 4) AS wind_level,
            COALESCE(ve.wave_level, 3) AS wave_level,
            ROW_NUMBER() OVER (
                PARTITION BY vb.ship_code,
                vb.voyage_number
                ORDER BY vb.id DESC
            ) as rn
        FROM ods_t_voyage_ex_info_d ve
            INNER JOIN ods_t_voyage_base_info_d vb ON ve.voyage_id = vb.id
    ),
    voyage_config AS (
        SELECT *
        FROM voyage_config_raw
        WHERE rn = 1
    )
SELECT -- 基础信息
    d.ship_code,
    d.voyage_no,
    d.report_date,
    -- 平均航速 (累计距离 / 累计时长)
    CASE
        WHEN SUM(d.sailing_hours) > 0 THEN SUM(d.distance) / SUM(d.sailing_hours)
        ELSE 0
    END AS average_sog,
    -- 保证航速 (从配置表取)
    vc.cp_guaranteed_speed_kn,
    vc.cp_fo_guaranteed_mt_per_d,
    vc.cp_go_guaranteed_mt_per_d,
    -- 航行统计 (累加)
    SUM(d.sailing_hours) AS sailing_hours,
    SUM(d.distance) AS total_distance,
    SUM(d.report_duration) AS report_duration,  -- 当天累计报告时长
    -- 气象数据 - 填报值 (最小值,最大值，如果只有一个值则直接显示)
    CASE 
        WHEN COUNT(d.wind_speed) = 0 THEN NULL
        WHEN COUNT(d.wind_speed) = 1 OR MIN(d.wind_speed) = MAX(d.wind_speed) THEN CAST(MIN(d.wind_speed) AS STRING)
        ELSE CONCAT(CAST(MIN(d.wind_speed) AS STRING), ',', CAST(MAX(d.wind_speed) AS STRING))
    END AS wind_speed,
    -- 气象数据 - 查询值 (平均值)
    AVG(
        weatherstr(d.report_date_ts, d.longitude,d.latitude, 'was')*1.944
    ) AS wind_speed_real,
    -- 浪高数据 - 填报值 (最小值,最大值，如果只有一个值则直接显示)
    CASE 
        WHEN COUNT(d.sig_wave) = 0 THEN NULL
        WHEN COUNT(d.sig_wave) = 1 OR MIN(d.sig_wave) = MAX(d.sig_wave) THEN CAST(MIN(d.sig_wave) AS STRING)
        ELSE CONCAT(CAST(MIN(d.sig_wave) AS STRING), ',', CAST(MAX(d.sig_wave) AS STRING))
    END AS sig_wave,
    AVG(
        weatherstr(d.report_date_ts,  d.longitude,d.latitude, 'sigwh')
    ) AS sig_wave_real,
    -- 平均转速
    AVG(d.avg_report_time_speed) AS avg_rpm,
    -- 好天气判断（使用配置表阈值）
    CASE
        WHEN MIN(
            CASE
                WHEN d.wind_speed <= (vc.wind_level * 4) -- 简化: 风级*4≈风速(kn)
                AND d.sig_wave <= (vc.wave_level * 0.42) -- 简化: 海况*0.42≈浪高(m)
                THEN 1
                ELSE 0
            END
        ) = 0 THEN 0 -- 当天有一条坏天气即为坏天气
        ELSE 1
    END AS is_good_weather,
    -- 燃油消耗量 (累加)
    SUM(d.fo_consumption) AS fo_cons,
    --到mysql 时 写入hs_hfo_cons
    SUM(d.go_consumption) AS go_cons,
    --到mysql 时 写入mdo_mgo_cons
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
    -- 时间戳
    NOW() AS create_time,
    NOW() AS update_time
FROM dwd_ship_status_report_d d
    LEFT JOIN voyage_config vc ON d.ship_code = vc.ship_code
    AND d.voyage_no = vc.voyage_number
WHERE d.status_code = 'sailing' -- 仅取航行状态
GROUP BY d.ship_code,
    d.voyage_no,
    d.report_date,
    vc.cp_guaranteed_speed_kn,
    vc.cp_fo_guaranteed_mt_per_d,
    vc.cp_go_guaranteed_mt_per_d,
    vc.wind_level,
    vc.wave_level;